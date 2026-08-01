import { useState, useEffect, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { todayKey } from '../../lib/helpers';
import { playSuccessSound } from '../../lib/effects';

const DURATIONS = { work: 25 * 60, break: 5 * 60 };

function sessionKey() { return 'raiz_focus_sessions_' + todayKey(); }
function getSessions() { return parseInt(localStorage.getItem(sessionKey()) || '0', 10); }

export default function FocoView() {
  const { showToast } = useAppData();
  const [mode, setMode] = useState('work');
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(getSessions());
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function switchMode(newMode) {
    setMode(newMode);
    setRemaining(DURATIONS[newMode]);
    setRunning(false);
    clearInterval(intervalRef.current);
  }

  function handleComplete(finishedMode) {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (finishedMode === 'work') {
      const n = getSessions() + 1;
      localStorage.setItem(sessionKey(), String(n));
      setSessions(n);
    }
    playSuccessSound();
    showToast(finishedMode === 'work' ? '🎯 Foco concluído! Hora da pausa.' : '☕ Pausa concluída! Hora de focar.');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Raiz 🌱', { body: finishedMode === 'work' ? 'Sessão de foco concluída!' : 'Pausa concluída!', icon: 'icon.svg' });
    }
    const nextMode = finishedMode === 'work' ? 'break' : 'work';
    setMode(nextMode);
    setRemaining(DURATIONS[nextMode]);
  }

  function toggleTimer() {
    if (running) {
      setRunning(false);
      clearInterval(intervalRef.current);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            handleComplete(mode);
            return DURATIONS[mode === 'work' ? 'break' : 'work'];
          }
          return r - 1;
        });
      }, 1000);
    }
  }

  function resetTimer() {
    setRunning(false);
    clearInterval(intervalRef.current);
    setRemaining(DURATIONS[mode]);
  }

  const total = DURATIONS[mode];
  const pct = 1 - remaining / total;
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const size = 220, cx = size / 2, cy = size / 2, r = 92, w = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = mode === 'work' ? '#FF3D81' : '#2FE6E6';

  return (
    <div className="view active">
      <div className="section-title">Modo Foco</div>
      <div className="focus-mode-toggle">
        <button className={`focus-mode-btn ${mode === 'work' ? 'active' : ''}`} onClick={() => switchMode('work')}>🎯 Foco (25min)</button>
        <button className={`focus-mode-btn ${mode === 'break' ? 'active' : ''}`} onClick={() => switchMode('break')}>☕ Pausa (5min)</button>
      </div>
      <div className="focus-timer-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={w} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={w}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          <text x={cx} y={cy + 14} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="42" fill="#FFFFFF">{mins}:{secs}</text>
        </svg>
      </div>
      <div className="focus-controls">
        <button className="btn ghost" onClick={resetTimer}>↺ Reiniciar</button>
        <button className="btn" onClick={toggleTimer}>{running ? '⏸ Pausar' : '▶ Começar'}</button>
      </div>
      <div className="focus-session-count">{sessions} sessão{sessions === 1 ? '' : 'ões'} de foco hoje</div>
    </div>
  );
}
