// Raiz offline: camada entre o app e o Supabase (REST).
// - Com internet: as leituras passam direto e ficam guardadas no aparelho (IndexedDB).
// - Sem internet: leituras vêm da cópia guardada; gravações entram numa fila e
//   são aplicadas por cima da cópia, para a tela já mostrar a mudança.
// - Quando a internet volta: a fila é enviada na ordem em que foi feita.

const DB_NAME = 'raiz-offline';
const STORE = 'kv';
const REST = '/rest/v1/';
const listeners = new Set();
let queueCache = null;
let flushing = null;
let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let getToken = async () => null;
let apiKey = '';

// ---------- IndexedDB mínimo ----------
let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const r = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(r?.result);
    tx.onerror = () => reject(tx.error);
  });
}
const kvGet = k => idb('readonly', s => s.get(k)).catch(() => undefined);
const kvSet = (k, v) => idb('readwrite', s => s.put(v, k)).catch(() => {});
async function kvKeys() { return (await idb('readonly', s => s.getAllKeys()).catch(() => [])) || []; }

// ---------- estado e avisos para a tela ----------
async function getQueue() {
  if (!queueCache) queueCache = (await kvGet('queue')) || [];
  return queueCache;
}
async function saveQueue(q) { queueCache = q; await kvSet('queue', q); emit(); }
function emit() {
  const st = { online, pending: queueCache ? queueCache.length : 0, syncing: !!flushing };
  listeners.forEach(fn => fn(st));
}
export function onOfflineState(fn) {
  listeners.add(fn);
  getQueue().then(emit);
  return () => listeners.delete(fn);
}
export const isOnline = () => online;
function setOnline(v) { if (online !== v) { online = v; emit(); } }

// ---------- filtros do PostgREST aplicados localmente ----------
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
function parseFilters(params) {
  const out = [];
  for (const [k, v] of params) {
    if (RESERVED.has(k)) continue;
    const i = v.indexOf('.');
    if (i < 0) continue;
    let op = v.slice(0, i), val = v.slice(i + 1), not = false;
    if (op === 'not') { not = true; const j = val.indexOf('.'); op = val.slice(0, j); val = val.slice(j + 1); }
    out.push({ col: k, op, val, not });
  }
  return out;
}
function str(x) { return x === null || x === undefined ? null : String(x); }
function test(row, f) {
  const a = str(row[f.col]);
  let r;
  switch (f.op) {
    case 'eq': r = a === f.val; break;
    case 'neq': r = a !== f.val; break;
    case 'gt': r = a !== null && a > f.val; break;
    case 'gte': r = a !== null && a >= f.val; break;
    case 'lt': r = a !== null && a < f.val; break;
    case 'lte': r = a !== null && a <= f.val; break;
    case 'is': r = f.val === 'null' ? a === null : a === f.val; break;
    case 'in': r = f.val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(a); break;
    default: r = true; // filtro desconhecido: não descarta a linha
  }
  return f.not ? !r : r;
}
const matches = (row, filters) => filters.every(f => test(row, f));
function sortRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(',').map(p => { const [col, dir] = p.split('.'); return { col, desc: dir === 'desc' }; });
  return [...rows].sort((x, y) => {
    for (const k of keys) {
      const a = x[k.col], b = y[k.col];
      if (a === b) continue;
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      const c = a < b ? -1 : 1;
      return k.desc ? -c : c;
    }
    return 0;
  });
}
const tableOf = url => decodeURIComponent(new URL(url).pathname.split(REST)[1] || '').split('/')[0];

// Aplica as gravações da fila sobre uma leitura guardada
function overlay(url, rows, queue) {
  const u = new URL(url);
  const table = tableOf(url);
  const filters = parseFilters(u.searchParams);
  let list = rows.map(r => ({ ...r }));
  for (const op of queue) {
    if (op.table !== table) continue;
    const opFilters = parseFilters(new URL(op.url).searchParams);
    if (op.method === 'DELETE') list = list.filter(r => !matches(r, opFilters));
    else if (op.method === 'PATCH') list = list.map(r => (matches(r, opFilters) ? { ...r, ...op.body } : r));
    else if (op.method === 'POST') {
      const conflict = new URL(op.url).searchParams.get('on_conflict');
      const items = Array.isArray(op.body) ? op.body : [op.body];
      for (const item of items) {
        const keys = conflict ? conflict.split(',') : ['id'];
        const idx = list.findIndex(r => keys.every(k => str(r[k]) === str(item[k])));
        if (idx >= 0) list[idx] = { ...list[idx], ...item };
        else if (matches(item, filters)) list.push(item);
      }
    }
  }
  return sortRows(list, u.searchParams.get('order'));
}

function json(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
const wantsObject = h => (h.get('Accept') || '').includes('vnd.pgrst.object');
const cacheKey = (url, headers) => 'get:' + (wantsObject(headers) ? 'obj:' : 'arr:') + url;

async function answerFromCache(url, headers) {
  const queue = await getQueue();
  const obj = wantsObject(headers);
  let cached = await kvGet(cacheKey(url, headers));
  if (cached === undefined) {
    // sem cópia exata: tenta a mesma consulta no outro formato
    cached = await kvGet('get:' + (obj ? 'arr:' : 'obj:') + url);
    if (cached !== undefined && !obj && !Array.isArray(cached)) cached = cached ? [cached] : [];
  }
  let rows = cached === undefined ? [] : Array.isArray(cached) ? cached : cached ? [cached] : [];
  rows = overlay(url, rows, queue);
  if (obj) return rows.length ? json(rows[0]) : json(null, 406);
  return json(rows);
}

async function enqueue(method, url, headers, bodyText) {
  let body = null;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = null; }
  const now = new Date().toISOString();
  if (method === 'POST' && body) {
    const fill = r => ({ id: crypto.randomUUID(), created_at: now, ...r });
    body = Array.isArray(body) ? body.map(fill) : fill(body);
  }
  const queue = await getQueue();
  await saveQueue([...queue, { method, url, table: tableOf(url), body, prefer: headers.get('Prefer') || '', at: now }]);
  const prefer = headers.get('Prefer') || '';
  if (!prefer.includes('return=representation')) return new Response(null, { status: 201 });
  const rows = method === 'POST' ? (Array.isArray(body) ? body : [body]) : [];
  return wantsObject(headers) ? json(rows[0] || null) : json(rows, 201);
}

// ---------- envio da fila ----------
export function flushQueue(realFetch = fetch) {
  if (flushing) return flushing;
  flushing = (async () => {
    emit();
    let queue = await getQueue();
    while (queue.length) {
      const op = queue[0];
      const token = await getToken();
      const headers = { apikey: apiKey, 'Content-Type': 'application/json', Authorization: `Bearer ${token || apiKey}` };
      if (op.prefer) headers.Prefer = op.prefer.replace('return=representation', 'return=minimal');
      let res;
      try {
        res = await realFetch(op.url, { method: op.method, headers, body: op.body ? JSON.stringify(op.body) : undefined });
      } catch {
        setOnline(false);
        break; // continua sem internet: tenta de novo depois
      }
      setOnline(true);
      if (res.status === 401) break; // sessão expirada: espera o login renovar
      // 2xx: enviado; 409: já existia (repetição); outros 4xx: descartado para não travar a fila
      if (!(res.ok || res.status === 409 || (res.status >= 400 && res.status < 500))) break;
      queue = queue.slice(1);
      await saveQueue(queue);
    }
    const done = !queue.length;
    flushing = null;
    emit();
    if (done) window.dispatchEvent(new Event('raiz-synced'));
  })();
  return flushing;
}

// ---------- fetch usado pelo cliente do Supabase ----------
export function createOfflineFetch({ token, key }) {
  getToken = token;
  apiKey = key;
  const realFetch = (...a) => fetch(...a);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { setOnline(true); flushQueue(realFetch); });
    window.addEventListener('offline', () => setOnline(false));
    getQueue().then(q => { if (q.length && navigator.onLine) flushQueue(realFetch); });
  }

  return async function offlineFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (!url.includes(REST)) return realFetch(input, init); // login, funções etc.
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));

    if (method === 'GET' || method === 'HEAD') {
      const queue = await getQueue();
      try {
        const res = await realFetch(input, init);
        setOnline(true);
        if (res.ok && method === 'GET') {
          const data = await res.clone().json().catch(() => undefined);
          if (data !== undefined) kvSet(cacheKey(url, headers), data);
          // ainda há gravações a enviar: mostra a resposta já com elas aplicadas
          if (queue.length && data !== undefined) {
            const rows = overlay(url, Array.isArray(data) ? data : data ? [data] : [], queue);
            if (wantsObject(headers)) return rows.length ? json(rows[0]) : json(null, 406);
            return json(rows);
          }
        }
        return res;
      } catch {
        setOnline(false);
        return answerFromCache(url, headers);
      }
    }

    // gravação: com fila pendente, entra no fim dela para manter a ordem
    const bodyText = typeof init.body === 'string' ? init.body : null;
    if ((await getQueue()).length) {
      const r = await enqueue(method, url, headers, bodyText);
      if (online) flushQueue(realFetch);
      return r;
    }
    try {
      const res = await realFetch(input, init);
      setOnline(true);
      return res;
    } catch {
      setOnline(false);
      return enqueue(method, url, headers, bodyText);
    }
  };
}

// Ao sair da conta, apaga a cópia local (dados de outra pessoa não ficam no aparelho)
export async function clearOfflineData() {
  const keys = await kvKeys();
  await idb('readwrite', s => keys.forEach(k => s.delete(k))).catch(() => {});
  queueCache = [];
  emit();
}
