export const NAV_ITEMS = [
  { view: 'inicio', label: 'Início', path: 'M3 12l9-9 9 9M5 10v10h14V10', inTabbar: true },
  { view: 'rotina', label: 'Rotina', path: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', inTabbar: true },
  { view: 'habitos', label: 'Hábitos', circle: true, inTabbar: true },
  { view: 'financas', label: 'Finanças', path: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', inTabbar: true },
  { view: 'historico', label: 'Histórico', rect: true, inTabbar: true },
  { view: 'perfil', label: 'Perfil', person: true, inTabbar: true },
  { view: 'conquistas', label: 'Conquistas', trophy: true, inTabbar: false },
  { view: 'foco', label: 'Foco', target: true, inTabbar: false },
];

export function NavIcon({ item }) {
  if (item.circle) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>);
  }
  if (item.rect) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
  }
  if (item.person) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>);
  }
  if (item.trophy) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4a1 1 0 000 5h1M17 6h3a1 1 0 010 5h-1" /></svg>);
  }
  if (item.target) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>);
  }
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.path} /></svg>);
}

export function HamburgerIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
}
export function CheckIcon() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="#0F2E1C" strokeWidth="3.5"><path d="M5 13l4 4L19 7" /></svg>);
}
