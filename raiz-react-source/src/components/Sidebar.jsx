import { useEffect, useRef, useState } from 'react';
import { sb } from '../lib/supabaseClient';
import { NAV_ITEMS, NavIcon, LogoMark, PanelIcon } from './ui/Icons';

// No computador (900 px ou mais) o menu fica fixo ao lado do conteúdo e pode ser recolhido
// para só os ícones, como no Claude. A escolha fica guardada neste aparelho.
const COLLAPSE_KEY = 'raiz-menu-recolhido';
function readCollapsed() { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } }

export default function Sidebar({ open, onClose, view, onNavigate }) {
  const scrollLockY = useRef(0);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  function toggleCollapsed() {
    setCollapsed(c => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* sem armazenamento */ } return !c; });
  }

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
      <nav className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} id="sidebar" aria-label="Menu">
        <div className="sidebar-logo">
          <LogoMark size={26} /><span className="sidebar-logo-text">Raiz</span>
          <button type="button" className="sidebar-collapse" onClick={toggleCollapsed}
            aria-label={collapsed ? 'Abrir menu' : 'Recolher menu'} title={collapsed ? 'Abrir menu' : 'Recolher menu'} aria-expanded={!collapsed}>
            <PanelIcon />
          </button>
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            className={`tab ${view === item.view ? 'active' : ''}`}
            onClick={() => onNavigate(item.view)}
            title={collapsed ? item.label : undefined}
            aria-current={view === item.view ? 'page' : undefined}
          >
            <NavIcon item={item} />
            <span>{item.label}</span>
          </button>
        ))}
        <button className="logout-btn" onClick={() => sb.auth.signOut()}>Sair</button>
      </nav>
    </>
  );
}
