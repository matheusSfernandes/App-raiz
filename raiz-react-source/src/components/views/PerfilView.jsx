import { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey } from '../../lib/helpers';
import { computeAchievements } from '../../lib/achievements';
import { sb } from '../../lib/supabaseClient';

function emptyDraft(profile) {
  return {
    name: profile.name || '',
    goal: profile.goal || '',
    quote: profile.quote || '',
    goalLabel: profile.goal_label || '',
    goalDate: profile.goal_date || '',
    budgetLimit: profile.budget_limit || '',
  };
}

export default function PerfilView({ onNavigate }) {
  const { profile, habits, transactions, user, saveProfile } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(emptyDraft(profile));
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem('raiz_notif_enabled') === '1');
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('raiz_sound_enabled') !== '0');
  const [levelInfo, setLevelInfo] = useState(null);

  useEffect(() => {
    if (!isEditing) setDraft(emptyDraft(profile));
  }, [profile, isEditing]);

  useEffect(() => {
    (async () => {
      const [{ count: completedTasksEver }, { count: totalHabitLogs }] = await Promise.all([
        sb.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('done', true),
        sb.from('habit_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      const distinctCategories = new Set(habits.map(h => h.category || 'Geral')).size;
      const freezeLog = profile.freeze_log || [];
      const accountAgeDays = user.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : 0;
      const stats = {
        habitsCount: habits.length,
        completedTasksEver: completedTasksEver || 0,
        totalHabitLogs: totalHabitLogs || 0,
        totalTransactions: transactions.length,
        maxStreak: habits.reduce((m, h) => Math.max(m, h.streak), 0),
        hasGoal: !!(profile.goal_label && profile.goal_date),
        freezesUsedTotal: freezeLog.length,
        distinctCategories,
        accountAgeDays,
      };
      setLevelInfo(computeAchievements(stats));
    })();
  }, [habits, transactions, profile, user]);

  function startEditing() {
    setDraft(emptyDraft(profile));
    setIsEditing(true);
  }
  function cancelEditing() {
    setDraft(emptyDraft(profile));
    setIsEditing(false);
  }
  async function handleSave() {
    await saveProfile({
      name: draft.name,
      goal: draft.goal,
      quote: draft.quote,
      goal_label: draft.goalLabel,
      goal_date: draft.goalDate || null,
      budget_limit: draft.budgetLimit ? parseFloat(draft.budgetLimit) : null,
    });
    setIsEditing(false);
  }
  function setField(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  async function toggleNotif() {
    if (notifEnabled) {
      localStorage.setItem('raiz_notif_enabled', '0');
      setNotifEnabled(false);
      return;
    }
    if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('Permissão de notificação negada.'); return; }
    localStorage.setItem('raiz_notif_enabled', '1');
    setNotifEnabled(true);
  }

  function toggleSound() {
    const next = !soundEnabled;
    localStorage.setItem('raiz_sound_enabled', next ? '1' : '0');
    setSoundEnabled(next);
  }

  const freezeLog = profile.freeze_log || [];
  const monthKey = todayKey().slice(0, 7);
  const usedThisMonth = freezeLog.filter(d => d.slice(0, 7) === monthKey).length;

  function displayDate(d) {
    if (!d) return 'Não definida';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  return (
    <div className="view active">
      <div className="section-title">
        Meu perfil
        {!isEditing && <button className="edit-btn" onClick={startEditing}>✎ Editar</button>}
      </div>

      {!isEditing ? (
        <>
          <div className="profile-field"><label>Nome</label><div className="profile-value">{profile.name || 'Não definido'}</div></div>
          <div className="profile-field"><label>Objetivo principal</label><div className="profile-value">{profile.goal || 'Não definido'}</div></div>
          <div className="profile-field"><label>Frase favorita</label><div className="profile-value">{profile.quote || 'Não definida'}</div></div>

          <div className="section-title">Meta em destaque</div>
          <div className="profile-field"><label>Nome da meta</label><div className="profile-value">{profile.goal_label || 'Não definida'}</div></div>
          <div className="profile-field"><label>Data</label><div className="profile-value">{displayDate(profile.goal_date)}</div></div>

          <div className="section-title">Orçamento mensal</div>
          <div className="profile-field"><label>Limite de gastos</label><div className="profile-value">{profile.budget_limit ? `R$ ${Number(profile.budget_limit).toFixed(2)}` : 'Não definido'}</div></div>
        </>
      ) : (
        <>
          <div className="profile-field"><label>Nome</label><input type="text" value={draft.name} onChange={e => setField('name', e.target.value)} /></div>
          <div className="profile-field"><label>Objetivo principal</label><input type="text" value={draft.goal} onChange={e => setField('goal', e.target.value)} placeholder="Ex: Saúde, Estudos, Finanças" /></div>
          <div className="profile-field"><label>Frase favorita</label><input type="text" value={draft.quote} onChange={e => setField('quote', e.target.value)} placeholder="Sua motivação" /></div>

          <div className="section-title">Meta em destaque</div>
          <div className="profile-field"><label>Nome da meta</label><input type="text" value={draft.goalLabel} onChange={e => setField('goalLabel', e.target.value)} placeholder="Ex: Entrega do TCC" /></div>
          <div className="profile-field"><label>Data</label><input type="date" value={draft.goalDate} onChange={e => setField('goalDate', e.target.value)} /></div>

          <div className="section-title">Orçamento mensal</div>
          <div className="profile-field"><label>Limite de gastos (R$)</label><input type="number" value={draft.budgetLimit} onChange={e => setField('budgetLimit', e.target.value)} placeholder="Ex: 1500" /></div>

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={handleSave}>Salvar</button>
            <button className="btn ghost" onClick={cancelEditing}>Cancelar</button>
          </div>
        </>
      )}

      <div className="section-title">Lembretes</div>
      <button className="add-toggle" onClick={toggleNotif}>{notifEnabled ? '🔕 Desativar lembretes' : '🔔 Ativar lembretes de hábito'}</button>
      <div className="notif-hint">Funciona enquanto o app está aberto no navegador (mesmo em outra aba).</div>

      <div className="section-title">Som</div>
      <button className="add-toggle" onClick={toggleSound}>{soundEnabled ? '🔊 Desativar som ao completar' : '🔇 Ativar som ao completar'}</button>

      <div className="section-title">Nível</div>
      {levelInfo && (
        <div className="level-card">
          <div className="level-top">
            <div className="level-icon">{levelInfo.level.icon}</div>
            <div>
              <div className="level-name">{levelInfo.level.name}</div>
              <div className="level-pts">{levelInfo.totalPoints} pontos</div>
            </div>
          </div>
          <div className="level-bar-track"><div className="level-bar-fill" style={{ width: `${levelInfo.barPct}%` }} /></div>
          <div className="level-next">
            {levelInfo.nextLevel ? `${levelInfo.nextLevel.min - levelInfo.totalPoints} pts para ${levelInfo.nextLevel.icon} ${levelInfo.nextLevel.name}` : 'Nível máximo alcançado! 🎉'}
          </div>
        </div>
      )}
      <div className="notif-hint" style={{ marginTop: 8 }}>🧊 {Math.max(0, 2 - usedThisMonth)}/2 congelamentos de sequência disponíveis este mês</div>

      <button className="add-toggle" style={{ marginTop: 16 }} onClick={() => onNavigate('conquistas')}>
        🏆 Ver todas as conquistas {levelInfo ? `${levelInfo.unlockedCount}/30` : ''} →
      </button>
    </div>
  );
}
