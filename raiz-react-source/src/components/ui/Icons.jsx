export const NAV_ITEMS = [
  { view: 'inicio', label: 'Início', path: 'M3 12l9-9 9 9M5 10v10h14V10', inTabbar: true },
  { view: 'rotina', label: 'Rotina', path: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', inTabbar: true },
  { view: 'habitos', label: 'Hábitos', circle: true, inTabbar: true },
  { view: 'financas', label: 'Finanças', path: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', inTabbar: true },
  { view: 'historico', label: 'Histórico', rect: true, inTabbar: true },
  { view: 'conquistas', label: 'Conquistas', trophy: true, inTabbar: false },
  { view: 'foco', label: 'Foco', target: true, inTabbar: false },
  { view: 'perfil', label: 'Perfil', person: true, inTabbar: true },
];

export function NavIcon({ item }) {
  if (item.circle) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>);
  }
  if (item.rect) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
  }
  if (item.person) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>);
  }
  if (item.trophy) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4a1 1 0 000 5h1M17 6h3a1 1 0 010 5h-1" /></svg>);
  }
  if (item.target) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>);
  }
  if (item.bell) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 21a2 2 0 004 0" /></svg>);
  }
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.path} /></svg>);
}

export function HamburgerIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
}
export function CheckIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>);
}
const S = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
export function FlameIcon() {
  return (<svg {...S}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.6 2 3 0-3-.5-5.5.5-8z" /></svg>);
}
export function FlagIcon() {
  return (<svg {...S}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>);
}
export function PencilIcon() {
  return (<svg {...S}><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>);
}
export function TrashIcon() {
  return (<svg {...S}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
}
export function CalendarIcon() {
  return (<svg {...S}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
}
export function ListIcon() {
  return (<svg {...S}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>);
}
export function MoreIcon() {
  return (<svg {...S}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>);
}
export function LockIcon() {
  return (<svg {...S}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>);
}
export function EyeIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>);
}
export function EyeOffIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.6 10.6 0 0112 5c7 0 10.5 7 10.5 7a15.5 15.5 0 01-3.1 4M6.3 6.3C3.4 8.1 1.5 12 1.5 12S5 19 12 19a10.6 10.6 0 004.1-.8" /><path d="M9.5 9.5a3 3 0 004.2 4.2" /></svg>);
}
