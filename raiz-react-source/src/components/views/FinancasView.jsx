import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey, formatKeyBR } from '../../lib/helpers';
import { TrashIcon } from '../ui/Icons';

const brl = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function BudgetCard() {
  const { profile, transactions } = useAppData();
  const limit = profile.budget_limit;
  if (!limit) return null;
  const monthKey = todayKey().slice(0, 7);
  const spent = transactions
    .filter(t => t.type === 'out' && t.date_key.slice(0, 7) === monthKey)
    .reduce((s, t) => s + Number(t.amount), 0);
  const pct = Math.min(100, Math.round((spent / limit) * 100));
  let barColor = 'var(--accent)', statusMsg = '';
  if (pct >= 100) { barColor = 'var(--danger)'; statusMsg = 'Você passou do orçamento do mês.'; }
  else if (pct >= 80) { barColor = 'var(--warn)'; statusMsg = 'Perto do limite mensal.'; }
  return (
    <div className="budget-card">
      <div className="budget-top">
        <div className="budget-label">Orçamento do mês</div>
        <div className="budget-values">{brl(spent)} <span>/ {brl(limit)}</span></div>
      </div>
      <div className="budget-bar-track"><div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
      {statusMsg && <div className="budget-alert">{statusMsg}</div>}
    </div>
  );
}

function TxForm({ onCancel }) {
  const { addTx } = useAppData();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('in');

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt)) return;
    await addTx({ description: desc.trim(), amount: amt, type });
    onCancel();
  }

  return (
    <div className="add-form open">
      <input type="text" placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="two">
        <input type="number" placeholder="Valor (R$)" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="in">Entrada</option>
          <option value="out">Saída</option>
        </select>
      </div>
      <div className="btn-row">
        <button className="btn" onClick={handleSave}>Salvar</button>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export default function FinancasView() {
  const { transactions, deleteTx } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const balance = transactions.reduce((s, t) => s + (t.type === 'in' ? Number(t.amount) : -Number(t.amount)), 0);

  return (
    <div className="view active">
      <div className="balance-hero"><div className="l">Saldo atual</div><div className={`v ${balance < 0 ? 'neg' : ''}`}>{brl(balance)}</div></div>
      <BudgetCard />
      {!formOpen && <button className="add-toggle" style={{ marginTop: 16 }} onClick={() => setFormOpen(true)}>+ Novo registro</button>}
      {formOpen && <TxForm onCancel={() => setFormOpen(false)} />}

      <div className="section-title">Movimentações</div>
      {transactions.length === 0 ? (
        <div className="empty">Nenhuma movimentação registrada ainda.</div>
      ) : (
        <div className="tx-list">{transactions.map(t => (
          <div className="tx-row" key={t.id}>
            <div>
              <div className="tx-desc">{t.description}</div>
              <div className="tx-date">{formatKeyBR(t.date_key)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`tx-amt ${t.type}`}>{t.type === 'in' ? '+' : '−'} {brl(t.amount)}</div>
              <button className="del-btn" aria-label="Apagar" onClick={() => { if (confirm('Apagar essa movimentação financeira?')) deleteTx(t.id); }}><TrashIcon /></button>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
