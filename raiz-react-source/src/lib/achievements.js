export const TIER_COLORS = {
  bronze: { color: '#C87F4A', dark: '#8B5A2B', glow: 'rgba(200,127,74,0.55)', label: 'Bronze' },
  prata: { color: '#D3DAE3', dark: '#8B95A3', glow: 'rgba(211,218,227,0.5)', label: 'Prata' },
  ouro: { color: '#FFD65C', dark: '#C99A1E', glow: 'rgba(255,214,92,0.55)', label: 'Ouro' },
  diamante: { color: '#6FE8E8', dark: '#2FA9C4', glow: 'rgba(111,232,232,0.55)', label: 'Diamante' },
  lendario: { color: '#FF3D81', dark: '#9B2C63', glow: 'rgba(255,61,129,0.6)', label: 'Lendário' },
};

export const ACHIEVEMENTS = [
  { id: 'first_habit', icon: '🌱', title: 'Primeiro Passo', desc: 'Crie seu primeiro hábito', tier: 'bronze', pts: 10, target: 1, current: s => Math.min(s.habitsCount, 1) },
  { id: 'first_task', icon: '✅', title: 'Primeira Vitória', desc: 'Conclua sua primeira tarefa', tier: 'bronze', pts: 10, target: 1, current: s => Math.min(s.completedTasksEver, 1) },
  { id: 'first_tx', icon: '💵', title: 'Primeiro Registro', desc: 'Registre 1 transação', tier: 'bronze', pts: 10, target: 1, current: s => Math.min(s.totalTransactions, 1) },
  { id: 'streak3', icon: '🔥', title: 'Primeiros Passos', desc: '3 dias seguidos num hábito', tier: 'bronze', pts: 10, target: 3, current: s => Math.min(s.maxStreak, 3) },
  { id: 'logs10', icon: '📝', title: 'Consciência', desc: 'Registre 10 conclusões de hábito', tier: 'bronze', pts: 10, target: 10, current: s => Math.min(s.totalHabitLogs, 10) },
  { id: 'has_goal', icon: '🎯', title: 'Visão de Futuro', desc: 'Defina uma meta em destaque', tier: 'bronze', pts: 10, target: 1, current: s => (s.hasGoal ? 1 : 0) },
  { id: 'freeze1', icon: '🧊', title: 'Resiliente', desc: 'Use 1 congelamento de sequência', tier: 'bronze', pts: 10, target: 1, current: s => Math.min(s.freezesUsedTotal, 1) },
  { id: 'cats3', icon: '🎨', title: 'Multitarefa', desc: 'Use 3 categorias diferentes', tier: 'bronze', pts: 10, target: 3, current: s => Math.min(s.distinctCategories, 3) },
  { id: 'streak7', icon: '🔥', title: 'Uma Semana de Foco', desc: '7 dias seguidos num hábito', tier: 'prata', pts: 25, target: 7, current: s => Math.min(s.maxStreak, 7) },
  { id: 'habits5', icon: '📋', title: 'Rotineiro', desc: 'Tenha 5 hábitos ativos', tier: 'prata', pts: 25, target: 5, current: s => Math.min(s.habitsCount, 5) },
  { id: 'tasks20', icon: '⚡', title: 'Produtivo', desc: 'Conclua 20 tarefas', tier: 'prata', pts: 25, target: 20, current: s => Math.min(s.completedTasksEver, 20) },
  { id: 'tx10', icon: '💰', title: 'Organizador', desc: 'Registre 10 transações', tier: 'prata', pts: 25, target: 10, current: s => Math.min(s.totalTransactions, 10) },
  { id: 'age30', icon: '📅', title: 'Um Mês de Jornada', desc: 'Use o app por 30 dias', tier: 'prata', pts: 25, target: 30, current: s => Math.min(s.accountAgeDays, 30) },
  { id: 'cats8', icon: '🌈', title: 'Vida Equilibrada', desc: 'Use todas as 8 categorias', tier: 'prata', pts: 25, target: 8, current: s => Math.min(s.distinctCategories, 8) },
  { id: 'streak30', icon: '💪', title: 'Constância', desc: '30 dias seguidos num hábito', tier: 'ouro', pts: 50, target: 30, current: s => Math.min(s.maxStreak, 30) },
  { id: 'habits10', icon: '🗂️', title: 'Organizador de Rotina', desc: 'Tenha 10 hábitos ativos', tier: 'ouro', pts: 50, target: 10, current: s => Math.min(s.habitsCount, 10) },
  { id: 'logs100', icon: '📆', title: 'Mês Completo', desc: '100 conclusões de hábitos', tier: 'ouro', pts: 50, target: 100, current: s => Math.min(s.totalHabitLogs, 100) },
  { id: 'tasks100', icon: '🏆', title: 'Cem Tarefas', desc: 'Conclua 100 tarefas', tier: 'ouro', pts: 50, target: 100, current: s => Math.min(s.completedTasksEver, 100) },
  { id: 'tx50', icon: '📊', title: 'Controle Financeiro', desc: 'Registre 50 transações', tier: 'ouro', pts: 50, target: 50, current: s => Math.min(s.totalTransactions, 50) },
  { id: 'streak100', icon: '💎', title: 'Centurião', desc: '100 dias seguidos num hábito', tier: 'diamante', pts: 100, target: 100, current: s => Math.min(s.maxStreak, 100) },
  { id: 'logs500', icon: '🏃', title: 'Maratonista', desc: '500 conclusões de hábitos', tier: 'diamante', pts: 100, target: 500, current: s => Math.min(s.totalHabitLogs, 500) },
  { id: 'tasks300', icon: '🚀', title: 'Imparável', desc: 'Conclua 300 tarefas', tier: 'diamante', pts: 100, target: 300, current: s => Math.min(s.completedTasksEver, 300) },
  { id: 'tx200', icon: '🏦', title: 'Contador Nato', desc: 'Registre 200 transações', tier: 'diamante', pts: 100, target: 200, current: s => Math.min(s.totalTransactions, 200) },
  { id: 'habits15', icon: '🧠', title: 'Multitarefa Avançada', desc: 'Tenha 15 hábitos ativos', tier: 'diamante', pts: 100, target: 15, current: s => Math.min(s.habitsCount, 15) },
  { id: 'age180', icon: '🌗', title: 'Seis Meses de Evolução', desc: 'Use o app por 180 dias', tier: 'diamante', pts: 100, target: 180, current: s => Math.min(s.accountAgeDays, 180) },
  { id: 'streak365', icon: '👑', title: 'Lenda Viva', desc: '365 dias seguidos num hábito', tier: 'lendario', pts: 200, target: 365, current: s => Math.min(s.maxStreak, 365) },
  { id: 'logs1000', icon: '🌟', title: 'Lendário do Hábito', desc: '1000 conclusões de hábitos', tier: 'lendario', pts: 200, target: 1000, current: s => Math.min(s.totalHabitLogs, 1000) },
  { id: 'tasks500', icon: '🏅', title: 'Mestre da Produtividade', desc: 'Conclua 500 tarefas', tier: 'lendario', pts: 200, target: 500, current: s => Math.min(s.completedTasksEver, 500) },
  { id: 'tx500', icon: '💎', title: 'Magnata', desc: 'Registre 500 transações', tier: 'lendario', pts: 200, target: 500, current: s => Math.min(s.totalTransactions, 500) },
  { id: 'age365', icon: '🌳', title: 'Um Ano de Raiz', desc: 'Use o app por 365 dias', tier: 'lendario', pts: 200, target: 365, current: s => Math.min(s.accountAgeDays, 365) },
];

export const LEVELS = [
  { name: 'Iniciante', icon: '🌱', min: 0 },
  { name: 'Aprendiz', icon: '🌿', min: 100 },
  { name: 'Dedicado', icon: '🌳', min: 250 },
  { name: 'Consistente', icon: '🔥', min: 500 },
  { name: 'Avançado', icon: '⭐', min: 900 },
  { name: 'Mestre', icon: '👑', min: 1500 },
  { name: 'Lendário', icon: '💎', min: 2080 },
];

export function computeAchievements(stats) {
  let totalPoints = 0;
  let unlockedCount = 0;
  const cards = ACHIEVEMENTS.map(a => {
    const current = a.current(stats);
    const unlocked = current >= a.target;
    if (unlocked) { totalPoints += a.pts; unlockedCount++; }
    return { ...a, current, unlocked };
  });
  let level = LEVELS[0];
  let nextLevel = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].min) level = LEVELS[i];
    if (totalPoints < LEVELS[i].min) { nextLevel = LEVELS[i]; break; }
  }
  const barPct = nextLevel ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100 : 100;
  return { cards, totalPoints, unlockedCount, level, nextLevel, barPct };
}
