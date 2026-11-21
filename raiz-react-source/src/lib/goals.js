// Metas com etapas: tabelas goals e goal_steps
import { sb } from './supabaseClient';
import { todayKey } from './helpers';

export async function loadGoals(userId) {
  const [{ data: goals }, { data: steps }] = await Promise.all([
    sb.from('goals').select('*').eq('user_id', userId).order('created_at'),
    sb.from('goal_steps').select('*').eq('user_id', userId).order('sort').order('created_at'),
  ]);
  return (goals || []).map(g => ({ ...g, steps: (steps || []).filter(s => s.goal_id === g.id) }));
}

export function goalProgress(g) {
  const total = g.steps.length;
  const done = g.steps.filter(s => s.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : (g.done_at ? 100 : 0) };
}

// "faltam 12 dias", "vence hoje", "atrasada há 3 dias"
export function deadlineLabel(g) {
  if (!g.target_date) return null;
  const t = new Date(g.target_date + 'T12:00:00');
  const today = new Date(todayKey() + 'T12:00:00');
  const days = Math.round((t - today) / 86400000);
  if (days === 0) return { text: 'vence hoje', late: false };
  if (days < 0) return { text: `atrasada há ${-days} ${days === -1 ? 'dia' : 'dias'}`, late: true };
  return { text: `faltam ${days} ${days === 1 ? 'dia' : 'dias'}`, late: false };
}
