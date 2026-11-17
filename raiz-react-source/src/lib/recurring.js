// Tarefas recorrentes: regras guardadas em recurring_tasks e "materializadas"
// como tarefas normais no dia em que forem abertas (hoje ou datas futuras).
import { sb } from './supabaseClient';
import { DAY_LETTERS, todayKey } from './helpers';

const DAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function recurrenceMatches(r, dateKey) {
  if (!r.active || dateKey < r.start_date) return false;
  if ((r.skip_dates || []).includes(dateKey)) return false;
  const d = new Date(dateKey + 'T12:00:00');
  if (r.rule === 'daily') return true;
  if (r.rule === 'weekly') return (r.days_of_week || []).includes(d.getDay());
  if (r.rule === 'monthly') {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return d.getDate() === Math.min(r.day_of_month, lastDay);
  }
  return false;
}

export function describeRecurrence(r) {
  if (!r) return '';
  if (r.rule === 'daily') return 'Todo dia';
  if (r.rule === 'weekly') {
    const days = [...(r.days_of_week || [])].sort((a, b) => a - b);
    if (days.length === 7) return 'Todo dia';
    if (days.join() === '1,2,3,4,5') return 'Dias úteis';
    return 'Toda ' + days.map(d => DAY_SHORT[d]).join(', ');
  }
  if (r.rule === 'monthly') return `Todo dia ${r.day_of_month}`;
  return '';
}

export { DAY_LETTERS };

export async function loadRecurring(userId) {
  const { data, error } = await sb.from('recurring_tasks').select('*').eq('user_id', userId).order('created_at');
  if (error) return [];
  return data || [];
}

// Cria, para a data, as tarefas das regras que caem nela e ainda não existem
export async function materializeRecurring(userId, dateKey, rules) {
  if (dateKey < todayKey()) return;
  const list = rules || await loadRecurring(userId);
  const due = list.filter(r => recurrenceMatches(r, dateKey));
  if (!due.length) return;
  const { data: existing } = await sb.from('tasks').select('recurring_id')
    .eq('user_id', userId).eq('date_key', dateKey).in('recurring_id', due.map(r => r.id));
  const have = new Set((existing || []).map(t => t.recurring_id));
  const rows = due.filter(r => !have.has(r.id)).map(r => ({
    user_id: userId, recurring_id: r.id, date_key: dateKey, done: false,
    title: r.title, notes: r.notes, category: r.category || 'Geral', priority: r.priority || 'none',
    start_time: r.start_time || '', end_time: r.end_time || '', flagged: false,
  }));
  for (const row of rows) {
    // uma por vez: se outra aba já criou, o índice único recusa e seguimos
    await sb.from('tasks').insert(row);
  }
}
