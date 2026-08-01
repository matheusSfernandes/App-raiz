import { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { computeAchievements, TIER_COLORS, ACHIEVEMENTS } from '../../lib/achievements';
import { sb } from '../../lib/supabaseClient';

export default function ConquistasView() {
  const { habits, transactions, profile, user } = useAppData();
  const [info, setInfo] = useState(null);

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
      setInfo(computeAchievements(stats));
    })();
  }, [habits, transactions, profile, user]);

  return (
    <div className="view active">
      <div className="section-title">Conquistas <span className="count">{info ? `${info.unlockedCount}/${ACHIEVEMENTS.length}` : '0/30'}</span></div>
      {info && (
        <div className="level-card" style={{ marginBottom: 20 }}>
          <div className="level-top">
            <div className="level-icon">{info.level.icon}</div>
            <div>
              <div className="level-name">{info.level.name}</div>
              <div className="level-pts">{info.totalPoints} pontos</div>
            </div>
          </div>
          <div className="level-bar-track"><div className="level-bar-fill" style={{ width: `${info.barPct}%` }} /></div>
          <div className="level-next">
            {info.nextLevel ? `${info.nextLevel.min - info.totalPoints} pts para ${info.nextLevel.icon} ${info.nextLevel.name}` : 'Nível máximo alcançado! 🎉'}
          </div>
        </div>
      )}
      <div className="achievements-grid">
        {info && info.cards.map(a => {
          const tc = TIER_COLORS[a.tier];
          return (
            <div className={`ach-card ${a.unlocked ? 'unlocked' : ''}`} key={a.id}>
              <div className={`trophy ${a.unlocked ? 'unlocked' : 'locked'}`} style={{ '--tier-color': tc.color, '--tier-dark': tc.dark, '--tier-glow': tc.glow }}>
                <span className="trophy-icon">{a.icon}</span>
                {!a.unlocked && <span className="lock-badge">🔒</span>}
              </div>
              <div className="tier-tag" style={{ color: tc.color }}>{tc.label}</div>
              <div className="ach-title">{a.title}</div>
              <div className="ach-desc">{a.desc}</div>
              {a.unlocked ? (
                <div className="ach-pts">+{a.pts} pts</div>
              ) : (
                <>
                  <div className="ach-bar-track"><div className="ach-bar-fill" style={{ width: `${(a.current / a.target) * 100}%`, background: tc.color }} /></div>
                  <div className="ach-pts">{a.current}/{a.target}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
