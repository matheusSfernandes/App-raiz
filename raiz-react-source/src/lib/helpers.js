export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const CATEGORIES = ['Geral', 'Trabalho', 'Saúde', 'Estudos', 'Finanças', 'Alimentação', 'Pessoal', 'Lazer'];
export const AREA_COLORS = {
  Geral: '#B4A9D6', Trabalho: '#2FE6E6', Saúde: '#58D68D', Estudos: '#FFB627',
  Finanças: '#FF3D81', Alimentação: '#FF7A45', Pessoal: '#9B7EF5', Lazer: '#FFD65C',
};
export const PRIORITY_DOT = { alta: '🔴', media: '🟡', baixa: '🟢', none: '' };

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function dateToKey(d) {
  return d.toISOString().slice(0, 10);
}
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
export function escapeHtml(str) {
  return String(str ?? '');
}

export function todayHabits(habits) {
  const dow = new Date().getDay();
  return habits.filter(h => (h.days_of_week || [0, 1, 2, 3, 4, 5, 6]).includes(dow));
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
