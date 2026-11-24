import { useState, useMemo, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey, formatKeyBR } from '../../lib/helpers';
import {
  brl, brlShort, moneyFit, catsFor, catOf, NO_CAT, currentMonth, shiftMonth, monthLabel, monthShort,
  monthTotals, spendingByCategory, billsForMonth,
} from '../../lib/finance';
import { TrashIcon, PencilIcon } from '../ui/Icons';
import { LIMITS, toNum, moneyProblem } from '../../lib/validate';

// Valor que se ajusta ao espaço (M3)
function Money({ v, className = '', compactFrom, noCents }) {
  const m = moneyFit(v, { compactFrom, noCents });
  return <div className={`${className} ${m.cls}`} title={m.full}>{m.text}</div>;
}

// ---------- Formulários ----------

function TxForm({ tx, defaultDate, onCancel }) {
  const { addTx, updateTx } = useAppData();
  const [desc, setDesc] = useState(tx?.description || '');
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [type, setType] = useState(tx?.type || 'out');
  const [category, setCategory] = useState(tx?.category || '');
  const [date, setDate] = useState(tx?.date_key || defaultDate || todayKey());

  const [saving, setSaving] = useState(false);
  const lock = useRef(false); // trava imediata: cliques no mesmo instante não passam
  const [tried, setTried] = useState(false);
  const amt = toNum(amount);
  const over = amt > LIMITS.money ? moneyProblem(amount) : '';
  const missing = !desc.trim() ? 'Escreva uma descrição, ex: Mercado.' : moneyProblem(amount);
  const hint = over || (tried ? missing : '');

  async function handleSave() {
    if (lock.current) return;
    if (over || missing) { setTried(true); return; }
    lock.current = true;
    setSaving(true);
    const fields = { description: desc.trim(), amount: Math.round(amt * 100) / 100, type, category: category || null, date_key: date || todayKey() };
    try {
      if (tx) await updateTx(tx.id, fields); else await addTx(fields);
    } finally { lock.current = false; setSaving(false); }
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="two">
        <input type="number" inputMode="decimal" placeholder="Valor (R$)" step="0.01" min="0" max={LIMITS.money} value={amount} onChange={e => setAmount(e.target.value)} />
        <select value={type} onChange={e => { setType(e.target.value); setCategory(''); }}>
          <option value="out">Saída</option>
          <option value="in">Entrada</option>
        </select>
      </div>
      <div className="two">
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Categoria">
          <option value="">Categoria…</option>
          {catsFor(type).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Data" />
      </div>
      {hint && <div className="form-hint" role="alert">{hint}</div>}
      <div className="btn-row">
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : tx ? 'Salvar alterações' : 'Salvar'}</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function BillForm({ bill, onCancel }) {
  const { saveFixedBill } = useAppData();
  const [desc, setDesc] = useState(bill?.description || '');
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '');
  const [type, setType] = useState(bill?.type || 'out');
  const [category, setCategory] = useState(bill?.category || '');
  const [day, setDay] = useState(bill ? String(bill.day_of_month) : '');

  const [saving, setSaving] = useState(false);
  const lock = useRef(false); // trava imediata: cliques no mesmo instante não passam
  const [tried, setTried] = useState(false);
  const amt = toNum(amount);
  const d = parseInt(day, 10);
  const over = amt > LIMITS.money ? moneyProblem(amount) : '';
  const missing = !desc.trim() ? 'Dê um nome à conta, ex: Aluguel.'
    : moneyProblem(amount) || (!(d >= 1 && d <= 31) ? 'Informe o dia do mês, de 1 a 31.' : '');
  const hint = over || (tried ? missing : '');

  async function handleSave() {
    if (lock.current) return;
    if (over || missing) { setTried(true); return; }
    lock.current = true;
    setSaving(true);
    try {
      await saveFixedBill(bill?.id, { description: desc.trim(), amount: Math.round(amt * 100) / 100, type, category: category || null, day_of_month: d });
    } finally { lock.current = false; setSaving(false); }
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Nome (ex: Aluguel, Internet, Salário)" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="two">
        <input type="number" inputMode="decimal" placeholder="Valor (R$)" step="0.01" min="0" max={LIMITS.money} value={amount} onChange={e => setAmount(e.target.value)} />
        <input type="number" inputMode="numeric" placeholder="Dia do mês" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} />
      </div>
      <div className="two">
        <select value={type} onChange={e => { setType(e.target.value); setCategory(''); }}>
          <option value="out">Conta a pagar</option>
          <option value="in">Receita fixa</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Categoria">
          <option value="">Categoria…</option>
          {catsFor(type).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {hint && <div className="form-hint" role="alert">{hint}</div>}
      <div className="btn-row">
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : bill ? 'Salvar alterações' : 'Salvar conta'}</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ---------- Resumo ----------

function MonthStats({ month }) {
  const { transactions } = useAppData();
  const cur = monthTotals(transactions, month);
  const prev = monthTotals(transactions, shiftMonth(month, -1));
  let delta = null;
  if (prev.out > 0) {
    const pct = Math.round(((cur.out - prev.out) / prev.out) * 100);
    delta = { pct, up: pct > 0 };
  }
  return (
    <div className="fin-stats">
      <div className="fin-stat"><div className="l">Entradas</div><Money v={cur.inc} className="v in" compactFrom={1e5} /></div>
      <div className="fin-stat">
        <div className="l">Saídas</div><Money v={cur.out} className="v" compactFrom={1e5} />
        {delta && <div className={`fin-delta ${delta.up ? 'up' : 'down'}`}>{delta.pct > 0 ? '+' : ''}{delta.pct}% vs {monthShort(shiftMonth(month, -1))}</div>}
      </div>
      <div className="fin-stat"><div className="l">Saldo do mês</div><Money v={cur.net} className={`v ${cur.net < 0 ? 'neg' : ''}`} compactFrom={1e5} /></div>
    </div>
  );
}

function BudgetCard({ month }) {
  const { profile, transactions } = useAppData();
  const limit = Number(profile.budget_limit);
  if (!limit) return null;
  const spent = monthTotals(transactions, month).out;
  const pct = Math.min(100, Math.round((spent / limit) * 100));
  let barColor = 'var(--accent)', statusMsg = '';
  if (pct >= 100) { barColor = 'var(--danger)'; statusMsg = 'Passou do orçamento do mês.'; }
  else if (pct >= 80) { barColor = 'var(--warn)'; statusMsg = 'Perto do limite mensal.'; }
  return (
    <div className="budget-card">
      <div className="budget-top">
        <div className="budget-label">Orçamento do mês · {pct}%</div>
        <div className="budget-values">{brl(spent)} <span>/ {brl(limit)}</span></div>
      </div>
      <div className="budget-bar-track"><div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
      {statusMsg && <div className="budget-alert">{statusMsg}</div>}
    </div>
  );
}

function CategoryChart({ month, onPick }) {
  const { transactions } = useAppData();
  const rows = spendingByCategory(transactions, month);
  if (!rows.length) return <div className="empty">Nenhum gasto neste mês.</div>;
  const max = rows[0].value;
  return (
    <div className="fin-card">
      {rows.map(r => (
        <button key={r.name} className="cat-row" onClick={() => onPick(r.name)} title={`${r.name}: ${brl(r.value)} (${Math.round(r.pct * 100)}% dos gastos). Toque para ver as movimentações.`}>
          <div className="cat-top">
            <span className={`cat-name ${r.name === NO_CAT ? 'muted' : ''}`}>{r.name}</span>
            <span className="cat-val">{brl(r.value)} <span>{Math.round(r.pct * 100)}%</span></span>
          </div>
          <div className="cat-track"><div className="cat-fill" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></div>
        </button>
      ))}
    </div>
  );
}

// Saldo de cada um dos últimos 6 meses (até o mês escolhido): barra acima da linha = sobrou, abaixo = faltou
function MonthsChart({ month, onPick }) {
  const { transactions } = useAppData();
  const [hover, setHover] = useState(null);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const data = months.map(m => ({ m, ...monthTotals(transactions, m) }));
  const posMax = Math.max(0, ...data.map(d => d.net));
  const negMax = Math.max(0, ...data.map(d => -d.net));
  const total = posMax + negMax || 1;
  const PLOT = 120; // px
  const posH = (PLOT * posMax) / total, negH = PLOT - posH;
  const shown = data.find(d => d.m === (hover || month));

  return (
    <div className="fin-card">
      <div className="mchart-info">
        <strong>{monthLabel(shown.m)}</strong>
        <span>Entradas {brl(shown.inc)} · Saídas {brl(shown.out)} · Saldo <b className={shown.net < 0 ? 'neg' : ''}>{brl(shown.net)}</b></span>
      </div>
      <div className="mchart" role="img" aria-label="Saldo dos últimos 6 meses" onMouseLeave={() => setHover(null)}>
        {data.map(d => {
          const sel = d.m === month;
          const h = d.net >= 0 ? (posMax ? (d.net / posMax) * posH : 0) : (negMax ? (-d.net / negMax) * negH : 0);
          const bar = h > 0 && <div className={`mchart-bar ${d.net < 0 ? 'neg' : ''} ${sel ? 'sel' : ''}`} style={{ height: Math.max(2, h) }}>
            {sel && <span className={`mchart-val ${d.net < 0 ? 'below' : ''}`}>{brlShort(d.net)}</span>}
          </div>;
          return (
            <button key={d.m} className="mchart-col" onMouseEnter={() => setHover(d.m)} onFocus={() => setHover(d.m)} onClick={() => onPick(d.m)} aria-label={`${monthLabel(d.m)}: saldo ${brl(d.net)}`}>
              <div className="mchart-pos" style={{ height: posH }}>{d.net >= 0 && bar}</div>
              <div className="mchart-neg" style={{ height: negH }}>{d.net < 0 && bar}</div>
              <div className={`mchart-lbl ${sel ? 'sel' : ''}`}>{monthShort(d.m)}</div>
            </button>
          );
        })}
      </div>
      <details className="mchart-table">
        <summary>Ver em tabela</summary>
        <div className="table-scroll"><table>
          <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
          <tbody>{[...data].reverse().map(d => (
            <tr key={d.m}><td>{monthShort(d.m)}/{d.m.slice(2, 4)}</td><td>{brl(d.inc)}</td><td>{brl(d.out)}</td><td className={d.net < 0 ? 'neg' : ''}>{brl(d.net)}</td></tr>
          ))}</tbody>
        </table></div>
      </details>
    </div>
  );
}

// ---------- Contas fixas ----------

const STATUS_LABEL = { paid: 'Paga', late: 'Atrasada', pending: 'Pendente' };

function BillRow({ bill, month, onEdit }) {
  const { payFixedBill, deleteTx, deleteFixedBill } = useAppData();
  const [busy, setBusy] = useState(false);
  const isIn = bill.type === 'in';
  const label = bill.status === 'paid' ? (isIn ? 'Recebida' : 'Paga') : isIn ? 'A receber' : STATUS_LABEL[bill.status];
  const statusCls = isIn && bill.status === 'late' ? 'pending' : bill.status;

  async function toggle() {
    setBusy(true);
    if (bill.paidTx) await deleteTx(bill.paidTx.id);
    else await payFixedBill(bill, month === currentMonth() ? todayKey() : bill.due);
    setBusy(false);
  }

  return (
    <div className={`bill-row ${bill.status}`}>
      <button className={`check ${bill.status === 'paid' ? 'checked' : ''}`} disabled={busy} onClick={toggle} aria-label={bill.status === 'paid' ? 'Desmarcar' : (isIn ? 'Marcar como recebida' : 'Marcar como paga')}>
        {bill.status === 'paid' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}
      </button>
      <div className="bill-main">
        <div className="tx-desc">{bill.description}</div>
        <div className="tx-date">Dia {bill.day_of_month}{bill.category ? ` · ${bill.category}` : ''} · <span className={`bill-status ${statusCls}`}>{label}</span></div>
      </div>
      <div className={`tx-amt ${bill.type}`}>{isIn ? '+' : '−'} {brl(bill.amount)}</div>
      {onEdit && <>
        <button className="del-btn" aria-label="Editar" onClick={() => onEdit(bill)}><PencilIcon /></button>
        <button className="del-btn" aria-label="Apagar" onClick={() => { if (confirm(`Apagar a conta fixa "${bill.description}"? As movimentações já registradas continuam.`)) deleteFixedBill(bill.id); }}><TrashIcon /></button>
      </>}
    </div>
  );
}

function BillsSummary({ month, onOpen }) {
  const { fixedBills, transactions } = useAppData();
  const list = billsForMonth(fixedBills, transactions, month).filter(b => b.type === 'out');
  if (!list.length) return null;
  const paid = list.filter(b => b.status === 'paid').length;
  const open = list.filter(b => b.status !== 'paid');
  const due = open.reduce((s, b) => s + Number(b.amount), 0);
  return (
    <>
      <div className="section-title">Contas do mês <button className="link-btn" onClick={onOpen}>Ver todas</button></div>
      <div className="fin-card">
        <div className="bills-head">{paid} de {list.length} pagas{due > 0 && <> · <strong>{brl(due)}</strong> em aberto</>}</div>
        {open.slice(0, 4).map(b => <BillRow key={b.id} bill={b} month={month} />)}
        {!open.length && <div className="bills-done">Tudo pago neste mês.</div>}
      </div>
    </>
  );
}

function BillsTab({ month }) {
  const { fixedBills, transactions } = useAppData();
  const [editing, setEditing] = useState(null); // null | 'new' | bill
  const list = billsForMonth(fixedBills, transactions, month);
  const outs = list.filter(b => b.type === 'out'), ins = list.filter(b => b.type === 'in');
  const totalOut = outs.reduce((s, b) => s + Number(b.amount), 0);
  const totalIn = ins.reduce((s, b) => s + Number(b.amount), 0);
  const future = fixedBills.filter(b => b.active && b.start_month > month);

  return (
    <>
      <p className="fin-hint">Cadastre o que se repete todo mês. Ao marcar como paga, a conta vira uma movimentação do mês.</p>
      {editing ? <BillForm bill={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} />
        : <button className="add-toggle" onClick={() => setEditing('new')}>+ Nova conta fixa</button>}
      {list.length === 0 && !editing && <div className="empty" style={{ marginTop: 12 }}>Nenhuma conta fixa para este mês.</div>}
      {outs.length > 0 && <>
        <div className="section-title">A pagar <span className="section-sub">{brl(totalOut)}/mês</span></div>
        <div className="fin-card">{outs.map(b => <BillRow key={b.id} bill={b} month={month} onEdit={setEditing} />)}</div>
      </>}
      {ins.length > 0 && <>
        <div className="section-title">A receber <span className="section-sub">{brl(totalIn)}/mês</span></div>
        <div className="fin-card">{ins.map(b => <BillRow key={b.id} bill={b} month={month} onEdit={setEditing} />)}</div>
      </>}
      {future.length > 0 && <p className="fin-hint" style={{ marginTop: 10 }}>{future.length} conta(s) começam em meses seguintes.</p>}
    </>
  );
}

// ---------- Movimentações ----------

function TxList({ month, catFilter, setCatFilter }) {
  const { transactions, deleteTx } = useAppData();
  const [editing, setEditing] = useState(null);
  const list = transactions.filter(t => t.date_key.slice(0, 7) === month && (!catFilter || catOf(t) === catFilter));
  return (
    <>
      {catFilter && (
        <div className="filter-pill">Categoria: <strong>{catFilter}</strong><button onClick={() => setCatFilter(null)} aria-label="Limpar filtro">×</button></div>
      )}
      {list.length === 0 ? (
        <div className="empty">Nenhuma movimentação {catFilter ? 'nessa categoria' : 'neste mês'}.</div>
      ) : (
        <div className="tx-list">{list.map(t => editing === t.id ? (
          <div key={t.id} style={{ padding: '10px 0' }}><TxForm tx={t} onCancel={() => setEditing(null)} /></div>
        ) : (
          <div className="tx-row" key={t.id}>
            <div style={{ minWidth: 0 }}>
              <div className="tx-desc">{t.description}</div>
              <div className="tx-date">{formatKeyBR(t.date_key)} · <span className={t.category ? '' : 'muted'}>{catOf(t)}</span>{t.fixed_id ? ' · conta fixa' : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className={`tx-amt ${t.type}`}>{t.type === 'in' ? '+' : '−'} {brl(t.amount)}</div>
              <button className="del-btn" aria-label="Editar" onClick={() => setEditing(t.id)}><PencilIcon /></button>
              <button className="del-btn" aria-label="Apagar" onClick={() => { if (confirm('Apagar essa movimentação financeira?')) deleteTx(t.id); }}><TrashIcon /></button>
            </div>
          </div>
        ))}</div>
      )}
    </>
  );
}

// ---------- Tela ----------

export default function FinancasView() {
  const { transactions } = useAppData();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState('resumo');
  const [formOpen, setFormOpen] = useState(false);
  const [catFilter, setCatFilter] = useState(null);
  const balance = useMemo(() => transactions.reduce((s, t) => s + (t.type === 'in' ? Number(t.amount) : -Number(t.amount)), 0), [transactions]);
  const isCurrent = month === currentMonth();
  const defaultDate = isCurrent ? todayKey() : `${month}-01`;

  function goMonth(m) { setMonth(m); setCatFilter(null); }

  return (
    <div className="view active">
      <div className="balance-hero"><div className="l">Saldo atual</div><Money v={balance} className={`v ${balance < 0 ? 'neg' : ''}`} /></div>

      <div className="day-nav" style={{ marginTop: 16 }}>
        <button className="cal-arrow" onClick={() => goMonth(shiftMonth(month, -1))} aria-label="Mês anterior">‹</button>
        <div className="day-nav-label">{monthLabel(month)}{!isCurrent && <button className="day-nav-today" onClick={() => goMonth(currentMonth())}>Mês atual</button>}</div>
        <button className="cal-arrow" onClick={() => goMonth(shiftMonth(month, 1))} aria-label="Próximo mês">›</button>
      </div>

      <div className="segmented">
        <button className={`seg-btn ${tab === 'resumo' ? 'active' : ''}`} onClick={() => setTab('resumo')}>Resumo</button>
        <button className={`seg-btn ${tab === 'movs' ? 'active' : ''}`} onClick={() => setTab('movs')}>Movimentações</button>
        <button className={`seg-btn ${tab === 'fixas' ? 'active' : ''}`} onClick={() => setTab('fixas')}>Contas fixas</button>
      </div>

      {tab !== 'fixas' && (formOpen
        ? <TxForm key={month} defaultDate={defaultDate} onCancel={() => setFormOpen(false)} />
        : <button className="add-toggle" onClick={() => setFormOpen(true)}>+ Novo registro</button>)}

      {tab === 'resumo' && <>
        <MonthStats month={month} />
        <BudgetCard month={month} />
        <BillsSummary month={month} onOpen={() => setTab('fixas')} />
        <div className="section-title">Gastos por categoria</div>
        <CategoryChart month={month} onPick={c => { setCatFilter(c); setTab('movs'); }} />
        <div className="section-title">Últimos 6 meses</div>
        <MonthsChart month={month} onPick={goMonth} />
      </>}
      {tab === 'movs' && <><div style={{ height: 12 }} /><TxList month={month} catFilter={catFilter} setCatFilter={setCatFilter} /></>}
      {tab === 'fixas' && <BillsTab month={month} />}
    </div>
  );
}
