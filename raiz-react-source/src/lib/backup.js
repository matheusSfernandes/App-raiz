// Gera uma planilha .xlsx com todos os dados da conta (uma aba por tabela)
import { sb } from './supabaseClient';
import { todayKey } from './helpers';

const TABLES = [
  ['Perfil', 'profiles', 'id'],
  ['Hábitos', 'habits', 'user_id'],
  ['Registro de hábitos', 'habit_logs', 'user_id'],
  ['Progresso de hábitos', 'habit_progress', 'user_id'],
  ['Tarefas recorrentes', 'recurring_tasks', 'user_id'],
  ['Tarefas', 'tasks', 'user_id'],
  ['Subtarefas', 'subtasks', 'user_id'],
  ['Finanças', 'transactions', 'user_id'],
  ['Modelos de treino', 'workout_plans', 'user_id'],
  ['Exercícios dos modelos', 'workout_plan_exercises', 'user_id'],
  ['Treinos feitos', 'workout_sessions', 'user_id'],
  ['Séries', 'workout_sets', 'user_id'],
];

async function fetchAll(table, column, userId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').eq(column, userId).range(from, from + 999);
    if (error) return null;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function flatten(row) {
  const out = {};
  Object.entries(row).forEach(([k, v]) => {
    out[k] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
  });
  return out;
}

export async function downloadBackup(userId) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  let total = 0;
  for (const [sheet, table, column] of TABLES) {
    const rows = await fetchAll(table, column, userId);
    if (rows === null) continue;
    total += rows.length;
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows.map(flatten)) : XLSX.utils.aoa_to_sheet([['(sem dados)']]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  }
  XLSX.writeFile(wb, `raiz-backup-${todayKey()}.xlsx`);
  return total;
}
