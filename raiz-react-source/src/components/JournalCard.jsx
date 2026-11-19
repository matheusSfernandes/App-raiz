import { useEffect, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { MOODS, loadJournal, saveJournal } from '../lib/journal';
import MoodFace from './ui/MoodFace';
import { todayKey, formatKeyBR } from '../lib/helpers';

// Humor + uma linha do dia. Usado no Início (hoje) e no Histórico (dia escolhido).
export default function JournalCard({ dateKey = todayKey(), title, onSaved }) {
  const { user, showToast } = useAppData();
  const [entry, setEntry] = useState(null);
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    loadJournal(user.id, dateKey, dateKey).then(rows => {
      if (cancelled) return;
      setEntry(rows[0] || null);
      setNote(rows[0]?.note || '');
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, dateKey]);

  async function save(fields) {
    setSaving(true);
    try {
      const row = await saveJournal(user.id, dateKey, { mood: entry?.mood ?? null, note: note.trim() || null, ...fields });
      setEntry(row);
      onSaved?.(row);
    } catch {
      showToast('Não consegui salvar o diário. Tente de novo.');
    }
    setSaving(false);
  }

  const noteChanged = (note.trim() || null) !== (entry?.note || null);
  const isToday = dateKey === todayKey();

  return (
    <div className="journal-card">
      <div className="journal-head">
        <span>{title || (isToday ? 'Como foi seu dia?' : `Diário de ${formatKeyBR(dateKey)}`)}</span>
        {entry?.mood && <span className="journal-saved">salvo</span>}
      </div>
      <div className="mood-row" role="radiogroup" aria-label="Humor do dia">
        {MOODS.map(m => (
          <button key={m.v} role="radio" aria-checked={entry?.mood === m.v} disabled={!loaded || saving}
            className={`mood-btn ${entry?.mood === m.v ? 'on' : ''}`}
            onClick={() => save({ mood: entry?.mood === m.v ? null : m.v })}>
            <MoodFace mood={m.v} /><span className="mood-label">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="journal-note">
        <input type="text" maxLength={200} placeholder="Uma linha sobre o dia (opcional)" value={note}
          disabled={!loaded} onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && noteChanged) save({}); }} />
        {noteChanged && <button className="btn" disabled={saving} onClick={() => save({})}>Salvar</button>}
      </div>
    </div>
  );
}
