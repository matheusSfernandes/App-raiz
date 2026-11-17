// Regras de hábitos: dias programados, sequência (dias ou semanas) e recorde
import { dateToKey, todayKey } from './helpers';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function isFlexible(h) { return !!h.weekly_target; }
export function isNumeric(h) { return h.target != null && Number(h.target) > 0; }

// Semana começando no domingo, como o calendário do app
export function weekStartKey(dateOrKey) {
  const d = typeof dateOrKey === 'string' ? new Date(dateOrKey + 'T12:00:00') : new Date(dateOrKey);
  d.setDate(d.getDate() - d.getDay());
  return dateToKey(d);
}

export function createdKey(h) {
  return h.created_at ? dateToKey(new Date(h.created_at)) : '0000-00-00';
}

function dayStreakEndingAt(h, ok, endKey, stopAtFirstMiss = true) {
  const days = h.days_of_week || ALL_DAYS;
  const created = createdKey(h);
  const cursor = new Date(endKey + 'T12:00:00');
  let streak = 0, first = true;
  for (let i = 0; i < 2000; i++) {
    const key = dateToKey(cursor);
    if (key < created) break;
    if (days.includes(cursor.getDay())) {
      if (ok.has(key)) streak++;
      else if (!(first && key === todayKey())) { if (stopAtFirstMiss) break; }
      first = false;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function weekCounts(ok) {
  const counts = {};
  ok.forEach(k => { const w = weekStartKey(k); counts[w] = (counts[w] || 0) + 1; });
  return counts;
}

function weekStreakEndingAt(h, ok, endKey) {
  const counts = weekCounts(ok);
  const createdWeek = weekStartKey(createdKey(h) === '0000-00-00' ? '2000-01-02' : createdKey(h));
  const cursor = new Date(weekStartKey(endKey) + 'T12:00:00');
  const currentWeek = weekStartKey(todayKey());
  let streak = 0;
  for (let i = 0; i < 300; i++) {
    const w = dateToKey(cursor);
    if (w < createdWeek) break;
    if ((counts[w] || 0) >= h.weekly_target) streak++;
    else if (w !== currentWeek) break;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Sequência atual: dias seguidos (hábito de dias fixos) ou semanas seguidas (flexível)
export function currentStreak(h, ok) {
  return isFlexible(h) ? weekStreakEndingAt(h, ok, todayKey()) : dayStreakEndingAt(h, ok, todayKey());
}

// Maior sequência de toda a história
export function bestStreak(h, ok) {
  if (!ok.size) return 0;
  if (isFlexible(h)) {
    const counts = weekCounts(ok);
    const weeks = Object.keys(counts).sort();
    let best = 0, run = 0, prev = null;
    weeks.forEach(w => {
      const hit = counts[w] >= h.weekly_target;
      const consecutive = prev && dateToKey(new Date(new Date(prev + 'T12:00:00').getTime() + 7 * 86400000)) === w;
      run = hit ? (consecutive && run ? run + 1 : 1) : 0;
      best = Math.max(best, run);
      prev = hit ? w : null;
    });
    return best;
  }
  const days = h.days_of_week || ALL_DAYS;
  const start = [...ok].sort()[0];
  const cursor = new Date(start + 'T12:00:00');
  const end = todayKey();
  let best = 0, run = 0;
  for (let i = 0; i < 4000; i++) {
    const key = dateToKey(cursor);
    if (key > end) break;
    if (days.includes(cursor.getDay())) {
      if (ok.has(key)) { run++; best = Math.max(best, run); }
      else if (key !== end) run = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

// Hábito conta como "programado" num dia: flexível só quando foi feito nele
export function countsOnDay(h, date, doneThatDay) {
  if (h.created_at && new Date(h.created_at) > date) return false;
  if (isFlexible(h)) return doneThatDay;
  return (h.days_of_week || ALL_DAYS).includes(date.getDay());
}

export function formatAmount(v, unit) {
  const n = Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit ? `${n} ${unit}` : n;
}
