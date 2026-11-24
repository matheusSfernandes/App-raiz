// Limites e validação dos formulários (Etapa 7, testes de 24/11/2026: A2 e A3)

export const LIMITS = {
  money: 1000000,      // R$ por movimentação ou conta fixa
  habitTarget: 100000, // meta de hábito por quantidade
  reps: 1000,          // repetições por série
  sets: 100,           // séries planejadas por exercício
  weight: 1000,        // carga em kg
};

// Lê número digitado com vírgula ou ponto; devolve NaN se vazio
export function toNum(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

const fmt = n => n.toLocaleString('pt-BR');

export function moneyProblem(v) {
  const n = toNum(v);
  if (isNaN(n) || n <= 0) return 'Informe um valor maior que zero.';
  if (n > LIMITS.money) return `O valor máximo é R$ ${fmt(LIMITS.money)}.`;
  return '';
}

// "HH:MM" para minutos
export function timeToMin(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function maxMsg(label, max, unit = '') {
  return `${label}: no máximo ${fmt(max)}${unit}.`;
}
