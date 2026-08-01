import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey } from '../../lib/helpers';

function BudgetCard() {
  const { profile, transactions } = useAppData();
  const limit = profile.budget_limit;
  if (!limit) return null;
  const monthKey = todayKey().slice(0, 7);
  const spent = transactions
    .filter(t => t.type === 'out' && t.date_key.slice(0, 7) === monthKey)
    .reduce((s, t) => s + Number(t.amount), 0);
  const pct = Math.min(100, Math.round((spent / limit) * 100));
  let barColor = 'var(--moss)', statusMsg = '';
  if (pct >= 100) { barColor = 'var(--danger)'; statusMsg = '⚠️ Você estourou o orçamento do mês!'; }
  else if (pct >= 80) { barColor = 'var(--amber)'; statusMsg = '⚠️ Perto do limite mensal.'; }
  return (
    <div className="budget-card">
      <div className="budget-top">
        <div className="budget-label">Orçamento do mês</div>
        <div className="budget-values">R${spent.toFixed(0)} <span>/ R${Number(limit).toFixed(0)}</span></div>
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
      <div className="balance-hero"><div className="l">Saldo atual</div><div className="v">R$ {balance.toFixed(2)}</div></div>
      <BudgetCard />
      {!formOpen && <button className="add-toggle" style={{ marginTop: 16 }} onClick={() => setFormOpen(true)}>+ Novo registro</button>}
      {formOpen && <TxForm onCancel={() => setFormOpen(false)} />}

      <div className="section-title">Movimentações</div>
      {transactions.length === 0 ? (
        <div className="empty">Nenhuma movimentação registrada ainda.</div>
      ) : (
        transactions.map(t => (
          <div className="tx-row" key={t.id}>
            <div>
              <div className="tx-desc">{t.description}</div>
              <div className="tx-date">{new Date(t.date_key).toLocaleDateString('pt-BR')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`tx-amt ${t.type}`}>{t.type === 'in' ? '+' : '-'} R${Number(t.amount).toFixed(2)}</div>
              <button className="del-btn" onClick={() => { if (confirm('Apagar essa movimentação financeira?')) deleteTx(t.id); }}>×</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
