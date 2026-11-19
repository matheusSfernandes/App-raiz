// Diário rápido: uma linha e um humor de 1 a 5 por dia
import { sb } from './supabaseClient';

export const MOODS = [
  { v: 1, label: 'Péssimo' },
  { v: 2, label: 'Ruim' },
  { v: 3, label: 'Ok' },
  { v: 4, label: 'Bom' },
  { v: 5, label: 'Ótimo' },
];
export const moodOf = v => MOODS.find(m => m.v === Number(v)) || null;

export async function loadJournal(userId, fromKey, toKey) {
  const { data } = await sb.from('journal_entries').select('*').eq('user_id', userId)
    .gte('date_key', fromKey).lte('date_key', toKey).order('date_key', { ascending: false });
  return data || [];
}

export async function saveJournal(userId, dateKey, fields) {
  const { data, error } = await sb.from('journal_entries')
    .upsert({ user_id: userId, date_key: dateKey, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date_key' })
    .select().maybeSingle();
  if (error) throw error;
  return data;
}
