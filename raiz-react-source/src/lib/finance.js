// Finanças: categorias, meses e cálculos de resumo
import { dateToKey, todayKey } from './helpers';

export const EXPENSE_CATS = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Contas e serviços', 'Outros'];
export const INCOME_CATS = ['Salário', 'Vendas e extras', 'Investimentos', 'Outros'];
export const NO_CAT = 'Sem categoria';

export const catsFor = type => (type === 'in' ? INCOME_CATS : EXPENSE_CATS);
export const catOf = t => t.category || NO_CAT;

export const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Valor em reais que não quebra o layout (testes 24/11, M3): sinal colado, fonte menor se longo,
// e forma curta (ex: R$ 2 mi) a partir de compactFrom. `full` vai no title para ver o valor inteiro.
export function moneyFit(v, { compactFrom = Infinity, noCents = false } = {}) {
  const n = Number(v || 0);
  const opts = { style: 'currency', currency: 'BRL' };
  if (noCents) opts.maximumFractionDigits = 0;
  const sign = t => t.replace(/^-\s?/, '\u2212');
  const full = sign(n.toLocaleString('pt-BR', opts));
  const text = Math.abs(n) >= compactFrom
    ? sign(n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }))
    : full;
  const cls = text.length > 18 ? 'money xlong' : text.length > 13 ? 'money long' : 'money';
  return { text, full, cls };
}

export const brlShort = v => {
  const n = Math.abs(Number(v || 0));
  const s = n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return (v < 0 ? '−' : '') + s;
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const currentMonth = () => todayKey().slice(0, 7);
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} de ${y}`;
}
export const monthShort = month => MONTHS_SHORT[Number(month.slice(5, 7)) - 1];

// Data de vencimento da conta fixa no mês (dia 31 vira o último dia de meses curtos)
export function dueDateKey(bill, month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return dateToKey(new Date(y, m - 1, Math.min(bill.day_of_month, last)));
}

export const billAppliesTo = (bill, month) => bill.active && month >= bill.start_month;

export function monthTotals(transactions, month) {
  let inc = 0, out = 0;
  transactions.forEach(t => {
    if (t.date_key.slice(0, 7) !== month) return;
    if (t.type === 'in') inc += Number(t.amount); else out += Number(t.amount);
  });
  return { inc, out, net: inc - out };
}

// Gastos do mês por categoria, do maior para o menor
export function spendingByCategory(transactions, month) {
  const map = {};
  transactions.forEach(t => {
    if (t.type !== 'out' || t.date_key.slice(0, 7) !== month) return;
    const c = catOf(t);
    map[c] = (map[c] || 0) + Number(t.amount);
  });
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .map(([name, value]) => ({ name, value, pct: total ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

// Situação das contas fixas no mês: paga (tem movimentação ligada), atrasada ou pendente
export function billsForMonth(bills, transactions, month) {
  const today = todayKey();
  return bills
    .filter(b => billAppliesTo(b, month))
    .map(b => {
      const paidTx = transactions.find(t => t.fixed_id === b.id && t.date_key.slice(0, 7) === month) || null;
      const due = dueDateKey(b, month);
      const status = paidTx ? 'paid' : due < today ? 'late' : 'pending';
      return { ...b, due, paidTx, status };
    })
    .sort((a, b) => a.due.localeCompare(b.due));
}
