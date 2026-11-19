// Raiz: envia os lembretes push (hábitos com horário, tarefas com hora de início e
// revisão da semana aos domingos, 19h). Chamado a cada minuto pelo pg_cron do banco.
// Segredos ficam no Vault: o segredo do agendamento e as chaves VAPID (geradas aqui
// na primeira execução). Só a chave pública vai para a tabela app_config.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const WINDOW_MIN = 10; // tolera atrasos do agendamento

async function secret(name: string): Promise<string | null> {
  const { data } = await sb.rpc("raiz_get_secret", { p_name: name });
  return (data as string) || null;
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;
async function loadAppServer() {
  let raw = await secret("raiz_vapid_keys");
  if (!raw) {
    const keys = await webpush.generateVapidKeys({ extractable: true });
    raw = JSON.stringify(await webpush.exportVapidKeys(keys));
    await sb.rpc("raiz_set_secret", { p_name: "raiz_vapid_keys", p_value: raw });
  }
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(raw), { extractable: false });
  const pub = await webpush.exportApplicationServerKey(vapidKeys);
  await sb.from("app_config").upsert({ key: "vapid_public", value: pub, updated_at: new Date().toISOString() });
  return await webpush.ApplicationServer.new({ contactInformation: "https://app-raiz.pages.dev", vapidKeys });
}
const appServer = () => (appServerPromise ??= loadAppServer());

// Data e hora locais no fuso da pessoa
function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { dateKey, dow, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
const toMin = (hhmm?: string | null) => {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const inWindow = (nowMin: number, t: number | null) => t !== null && nowMin - t >= 0 && nowMin - t <= WINDOW_MIN;
function shiftKey(key: string, days: number) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Msg = { ref: string; title: string; body: string; url: string };

async function messagesFor(userId: string, tz: string): Promise<Msg[]> {
  const now = localNow(tz);
  const today = now.dateKey;
  const { data: prof } = await sb.from("profiles").select("notify_habits,notify_tasks,notify_review").eq("id", userId).maybeSingle();
  const out: Msg[] = [];

  if (prof?.notify_habits !== false) {
    const { data: habits } = await sb.from("habits").select("id,name,time,days_of_week,weekly_target,last_done").eq("user_id", userId).not("time", "is", null);
    const due = (habits || []).filter((h) => h.last_done !== today && inWindow(now.minutes, toMin(h.time)));
    if (due.length) {
      const weekStart = shiftKey(today, -now.dow);
      const { data: logs } = await sb.from("habit_logs").select("habit_id").eq("user_id", userId).gte("date_key", weekStart).lte("date_key", today);
      const count: Record<string, number> = {};
      (logs || []).forEach((l) => (count[l.habit_id] = (count[l.habit_id] || 0) + 1));
      due.forEach((h) => {
        const scheduled = h.weekly_target ? (count[h.id] || 0) < h.weekly_target : (h.days_of_week || [0, 1, 2, 3, 4, 5, 6]).includes(now.dow);
        if (scheduled) out.push({ ref: `h:${h.id}:${today}`, title: "Hora do hábito", body: h.name, url: "/?view=habitos" });
      });
    }
  }

  if (prof?.notify_tasks !== false) {
    const { data: tasks } = await sb.from("tasks").select("id,title,start_time").eq("user_id", userId).eq("date_key", today).eq("done", false);
    (tasks || []).filter((t) => inWindow(now.minutes, toMin(t.start_time))).forEach((t) => {
      out.push({ ref: `t:${t.id}:${today}`, title: `Tarefa às ${t.start_time}`, body: t.title, url: "/?view=rotina" });
    });
  }

  // Domingo 19h: revisão da semana que terminou (domingo a sábado)
  if (prof?.notify_review !== false && now.dow === 0 && inWindow(now.minutes, 19 * 60)) {
    const from = shiftKey(today, -7), to = shiftKey(today, -1);
    const { data: wt } = await sb.from("tasks").select("done").eq("user_id", userId).gte("date_key", from).lte("date_key", to);
    const done = (wt || []).filter((t) => t.done).length, left = (wt || []).length - done;
    const body = (wt || []).length
      ? `${done} tarefa${done === 1 ? "" : "s"} feita${done === 1 ? "" : "s"}${left ? `, ${left} ficaram para trás` : ""}. Veja como foi sua semana.`
      : "Veja como foi sua semana e planeje a próxima.";
    out.push({ ref: `r:${from}`, title: "Revisão da semana", body, url: "/?view=historico&tab=revisao" });
  }
  return out;
}

Deno.serve(async (req) => {
  const expected = await secret("raiz_cron_secret");
  if (!expected || req.headers.get("x-cron-secret") !== expected) return new Response("forbidden", { status: 403 });

  const server = await appServer();
  const { data: subs } = await sb.from("push_subscriptions").select("*");
  const byUser = new Map<string, typeof subs>();
  (subs || []).forEach((s) => byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]));

  let sent = 0;
  for (const [userId, list] of byUser) {
    const msgs = await messagesFor(userId, list![0].tz || "America/Sao_Paulo");
    for (const m of msgs) {
      // reserva o envio: se já existe no registro, outro disparo já mandou
      const { error } = await sb.from("push_log").insert({ user_id: userId, ref_key: m.ref });
      if (error) continue;
      for (const s of list!) {
        try {
          await server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
            .pushTextMessage(JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.ref }), {});
          sent++;
        } catch (e) {
          if (e instanceof webpush.PushMessageError && (e.isGone() || e.response.status === 404)) {
            await sb.from("push_subscriptions").delete().eq("id", s.id);
          } else console.error("push falhou", String(e));
        }
      }
    }
  }

  // limpeza diária do registro de envios
  if (new Date().getUTCMinutes() === 7 && new Date().getUTCHours() === 7) {
    await sb.from("push_log").delete().lt("created_at", new Date(Date.now() - 30 * 864e5).toISOString());
  }
  return new Response(JSON.stringify({ users: byUser.size, sent }), { headers: { "Content-Type": "application/json" } });
});
