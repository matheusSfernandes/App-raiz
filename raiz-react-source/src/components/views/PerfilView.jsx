import { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey } from '../../lib/helpers';
import { computeAchievements } from '../../lib/achievements';
import { sb } from '../../lib/supabaseClient';
import { getTheme, setTheme } from '../../lib/theme';
import { downloadBackup } from '../../lib/backup';
import { pushSupport, currentSubscription, enablePush, disablePush } from '../../lib/push';

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
  const { profile, habits, transactions, user, saveProfile, showToast } = useAppData();
  const [backingUp, setBackingUp] = useState(false);
  async function handleBackup() {
    if (backingUp) return;
    setBackingUp(true);
    try {
      const n = await downloadBackup(user.id);
      showToast(`Backup baixado: ${n} registros.`);
    } catch {
      showToast('Não deu para gerar o backup. Tente de novo.');
    }
    setBackingUp(false);
  }
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(emptyDraft(profile));
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const support = pushSupport();
  useEffect(() => { currentSubscription().then(s => setPushOn(!!s)).catch(() => {}); }, []);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('raiz_sound_enabled') !== '0');
  const [levelInfo, setLevelInfo] = useState(null);
  const [theme, setThemeState] = useState(getTheme());
  function chooseTheme(t) { setTheme(t); setThemeState(t); }

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

  async function togglePush() {
    if (pushBusy) return;
    if (support === 'ios-install') { showToast('No iPhone: Compartilhar > Adicionar à Tela de Início, abra o Raiz por lá e ative.'); return; }
    if (support !== 'ok') { showToast('Este navegador não recebe notificações.'); return; }
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); showToast('Lembretes desligados neste aparelho.'); }
      else { await enablePush(user.id); setPushOn(true); showToast('Lembretes ligados neste aparelho.'); }
    } catch (e) {
      showToast(e.message || 'Não deu para ligar os lembretes.');
    }
    setPushBusy(false);
  }
  function toggleKind(field) {
    saveProfile({ [field]: profile[field] === false });
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
        {!isEditing && <button className="edit-btn" onClick={startEditing}>Editar</button>}
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

      <div className="section-title">Aparência</div>
      <div className="segmented">
        <button className={`seg-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => chooseTheme('light')}>Claro</button>
        <button className={`seg-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => chooseTheme('dark')}>Escuro</button>
        <button className={`seg-btn ${theme === 'auto' ? 'active' : ''}`} onClick={() => chooseTheme('auto')}>Automático</button>
      </div>
      <div className="notif-hint">Automático segue o tema do seu celular ou computador.</div>

      <div className="section-title">Preferências</div>
      <button className="setting-row" onClick={togglePush} disabled={pushBusy}>
        <div><div className="setting-text">Lembretes no celular</div><div className="setting-sub">{
          support === 'ios-install' ? 'No iPhone, instale o app na Tela de Início para ativar'
          : support !== 'ok' ? 'Este navegador não recebe notificações'
          : 'Chegam mesmo com o app fechado (ative em cada aparelho)'}</div></div>
        <span className={`switch ${pushOn ? 'on' : ''}`} />
      </button>
      {pushOn && <div className="setting-group">
        {[['notify_habits', 'Hábitos', 'No horário definido em cada hábito'],
          ['notify_tasks', 'Tarefas', 'Na hora de início da tarefa'],
          ['notify_review', 'Revisão da semana', 'Domingo às 19h']].map(([field, label, sub]) => (
          <button key={field} className="setting-row sub" onClick={() => toggleKind(field)}>
            <div><div className="setting-text">{label}</div><div className="setting-sub">{sub}</div></div>
            <span className={`switch ${profile[field] !== false ? 'on' : ''}`} />
          </button>
        ))}
      </div>}
      <button className="setting-row" onClick={toggleSound}>
        <div><div className="setting-text">Som ao concluir</div><div className="setting-sub">Um toque curto ao marcar algo como feito</div></div>
        <span className={`switch ${soundEnabled ? 'on' : ''}`} />
      </button>

      <div className="section-title">Seus dados</div>
      <button className="setting-row link-row" onClick={handleBackup} disabled={backingUp}>
        <div><div className="setting-text">{backingUp ? 'Gerando backup…' : 'Baixar backup'}</div><div className="setting-sub">Planilha com hábitos, tarefas, finanças e treinos</div></div>
        <span className="chev">↓</span>
      </button>

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
            {levelInfo.nextLevel ? `${levelInfo.nextLevel.min - levelInfo.totalPoints} pts para ${levelInfo.nextLevel.icon} ${levelInfo.nextLevel.name}` : 'Nível máximo alcançado'}
          </div>
        </div>
      )}
      <div className="notif-hint" style={{ marginTop: 8 }}>{Math.max(0, 2 - usedThisMonth)} de 2 congelamentos de sequência disponíveis este mês</div>

      <button className="setting-row link-row" style={{ marginTop: 12 }} onClick={() => onNavigate('conquistas')}>
        <div><div className="setting-text">Conquistas</div><div className="setting-sub">{levelInfo ? `${levelInfo.unlockedCount} de 30 desbloqueadas` : 'Ver todas'}</div></div>
        <span className="chev">›</span>
      </button>
    </div>
  );
}
