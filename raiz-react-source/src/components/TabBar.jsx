import { NAV_ITEMS, NavIcon } from './ui/Icons';

export default function TabBar({ view, onNavigate }) {
  return (
    <div className="tabbar">
      {NAV_ITEMS.filter(i => i.inTabbar).map(item => (
        <button
          key={item.view}
          className={`tab ${view === item.view ? 'active' : ''}`}
          onClick={() => onNavigate(item.view)}
        >
          <NavIcon item={item} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
