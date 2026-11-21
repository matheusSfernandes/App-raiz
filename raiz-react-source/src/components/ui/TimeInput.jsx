// Escolha de horário com duas listas (hora e minuto) no lugar do relógio do navegador.
// Motivo: em alguns Android o relógio nativo abre cortado e o botão "Definir" fica fora da tela.
// Valor: 'HH:MM' ou '' (sem horário).
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const STEP_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export default function TimeInput({ value, onChange, label = 'Horário', emptyLabel = 'Sem horário' }) {
  const [h, m] = value && /^\d{1,2}:\d{2}/.test(value) ? value.split(':') : ['', ''];
  const hh = h ? h.padStart(2, '0') : '';
  const mm = m ? m.slice(0, 2) : '';
  // mantém minutos fora do passo de 5 que já estavam salvos (ex: 09:37)
  const minutes = mm && !STEP_MINUTES.includes(mm) ? [...STEP_MINUTES, mm].sort() : STEP_MINUTES;

  function setHour(v) {
    if (!v) { onChange(''); return; }
    onChange(`${v}:${mm || '00'}`);
  }
  function setMinute(v) {
    onChange(`${hh || '08'}:${v}`);
  }

  return (
    <div className="time-input" role="group" aria-label={label}>
      <select value={hh} onChange={e => setHour(e.target.value)} aria-label={`${label}: hora`}>
        <option value="">{emptyLabel}</option>
        {HOURS.map(x => <option key={x} value={x}>{x} h</option>)}
      </select>
      <span className="time-sep">:</span>
      <select value={mm} onChange={e => setMinute(e.target.value)} aria-label={`${label}: minuto`} disabled={!hh}>
        {!hh && <option value="">--</option>}
        {minutes.map(x => <option key={x} value={x}>{x} min</option>)}
      </select>
    </div>
  );
}
