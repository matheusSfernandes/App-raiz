import { useEffect, useState } from 'react';
import { onOfflineState } from '../lib/offline';

// Faixa discreta: só aparece sem internet ou enquanto há alterações a enviar
export default function OfflineBar() {
  const [st, setSt] = useState({ online: true, pending: 0, syncing: false });
  useEffect(() => onOfflineState(setSt), []);
  if (st.online && !st.pending) return null;
  const n = st.pending;
  const items = `${n} ${n === 1 ? 'alteração' : 'alterações'}`;
  const text = !st.online
    ? (n ? `Sem internet · ${items} guardadas no aparelho` : 'Sem internet · mostrando os últimos dados salvos')
    : `Enviando ${items}...`;
  return <div className={`offline-bar ${st.online ? 'syncing' : ''}`} role="status">{text}</div>;
}
