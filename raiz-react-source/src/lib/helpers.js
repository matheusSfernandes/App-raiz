export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const CATEGORIES = ['Geral', 'Trabalho', 'Saúde', 'Estudos', 'Finanças', 'Alimentação', 'Pessoal', 'Lazer'];
export const AREA_COLORS = {
  Geral: '#8E918A', Trabalho: '#4F7CAC', Saúde: '#4E9A6E', Estudos: '#C08A2E',
  Finanças: '#3F8F8A', Alimentação: '#C46A45', Pessoal: '#8467B0', Lazer: '#B5656F',
};
export const PRIORITY_DOT = { alta: '🔴', media: '🟡', baixa: '🟢', none: '' };

// Datas no horário local (antes usava UTC, o que virava o dia depois das 21h no Brasil)
export function dateToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey() {
  return dateToKey(new Date());
}
export function formatKeyBR(key) {
  if (!key) return '';
  return new Date(key + 'T12:00:00').toLocaleDateString('pt-BR');
}
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
export function escapeHtml(str) {
  return String(str ?? '');
}

// Hábitos que valem para hoje. Flexível (X vezes por semana): aparece enquanto a meta
// da semana não foi batida, ou se já foi feito hoje.
export function todayHabits(habits) {
  const dow = new Date().getDay();
  const today = todayKey();
  return habits.filter(h => {
    if (h.weekly_target) return h.last_done === today || (h.week_count || 0) < h.weekly_target;
    return (h.days_of_week || [0, 1, 2, 3, 4, 5, 6]).includes(dow);
  });
}

export function previousScheduledDate(habit, fromDate) {
  const days = habit.days_of_week || [0, 1, 2, 3, 4, 5, 6];
  const d = new Date(fromDate);
  for (let i = 0; i < 21; i++) {
    d.setDate(d.getDate() - 1);
    if (habit.created_at && d < new Date(habit.created_at)) return null;
    if (days.includes(d.getDay())) return dateToKey(d);
  }
  return null;
}

export function categorizeTask(t, nowHHMM) {
  if (t.done) return 'done';
  if (!t.start_time) return 'upcoming';
  const end = t.end_time || t.start_time;
  if (nowHHMM >= t.start_time && nowHHMM <= end) return 'inprogress';
  if (nowHHMM > end) return 'overdue';
  return 'upcoming';
}
