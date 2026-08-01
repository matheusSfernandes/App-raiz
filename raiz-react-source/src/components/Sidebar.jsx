import { useEffect, useRef } from 'react';
import { sb } from '../lib/supabaseClient';
import { NAV_ITEMS, NavIcon } from './ui/Icons';

export default function Sidebar({ open, onClose, view, onNavigate }) {
  const scrollLockY = useRef(0);

  useEffect(() => {
    if (open) {
      scrollLockY.current = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add('drawer-locked');
      document.body.style.top = `-${scrollLockY.current}px`;
    } else {
      document.body.classList.remove('drawer-locked');
      document.body.style.top = '';
      window.scrollTo(0, scrollLockY.current);
    }
  }, [open]);

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <div className={`sidebar ${open ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-logo">Raiz 🌱</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            className={`tab ${view === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
          >
            <NavIcon item={item} />
            <span>{item.label}</span>
          </button>
        ))}
        <button className="logout-btn" onClick={() => sb.auth.signOut()}>Sair</button>
      </div>
    </>
  );
}
