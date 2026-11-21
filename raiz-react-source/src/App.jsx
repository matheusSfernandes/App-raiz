import { useState, useEffect } from 'react';
import { sb } from './lib/supabaseClient';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Toasts from './components/Toasts';
import { HamburgerIcon } from './components/ui/Icons';
import { AppDataProvider, useAppData } from './context/AppDataContext';

import InicioView from './components/views/InicioView';
import RotinaView from './components/views/RotinaView';
import HabitosView from './components/views/HabitosView';
import FinancasView from './components/views/FinancasView';
import HistoricoView from './components/views/HistoricoView';
import PerfilView from './components/views/PerfilView';
import ConquistasView from './components/views/ConquistasView';
import FocoView from './components/views/FocoView';
import TreinoView from './components/views/TreinoView';
import MetasView from './components/views/MetasView';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function AppShell() {
  const { profile, loading, toasts } = useAppData();
  // Abre direto numa tela quando vem de um lembrete (?view=historico&tab=revisao)
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('view') || 'inicio');
  const [viewTab, setViewTab] = useState(() => new URLSearchParams(location.search).get('tab'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (location.search) history.replaceState(null, '', location.pathname);
    function onMsg(e) {
      if (e.data?.type !== 'open') return;
      const p = new URL(e.data.url).searchParams;
      setViewTab(p.get('tab'));
      setView(p.get('view') || 'inicio');
    }
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, []);

  function navigate(v) {
    setView(v);
    setViewTab(null);
    setDrawerOpen(false);
    const mainEl = document.querySelector('.main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
  }

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const nameSuffix = profile.name ? `, ${profile.name.split(' ')[0]}` : '';

  return (
    <div className="shell">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} view={view} onNavigate={navigate} />
      <div className="main">
        <div className="top">
          <div className="top-row">
            <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu"><HamburgerIcon /></button>
            <button className="logout-btn" onClick={() => sb.auth.signOut()}>Sair</button>
          </div>
          <div className="eyebrow">{DAY_NAMES[now.getDay()].toUpperCase()}, {now.toLocaleDateString('pt-BR')}</div>
          <div className="greeting">{greet}{nameSuffix}</div>
          <div className="quote">"{profile.quote || 'Você não precisa ser perfeito, só precisa ser persistente.'}"</div>
        </div>

        <div className="content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <div className="loading-text">Carregando seus dados...</div>
            </div>
          ) : (
            <div className="dashboard-grid">
              {view === 'inicio' && <InicioView onNavigate={navigate} />}
              {view === 'rotina' && <RotinaView />}
              {view === 'habitos' && <HabitosView />}
              {view === 'metas' && <MetasView />}
              {view === 'treino' && <TreinoView />}
              {view === 'financas' && <FinancasView />}
              {view === 'historico' && <HistoricoView key={viewTab || 'h'} initialTab={viewTab} />}
              {view === 'perfil' && <PerfilView onNavigate={navigate} />}
              {view === 'conquistas' && <ConquistasView />}
              {view === 'foco' && <FocoView />}
            </div>
          )}
        </div>
      </div>
      <TabBar view={view} onNavigate={navigate} />
      <Toasts toasts={toasts} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    }
  }, []);

  if (session === undefined) return null;
  if (passwordRecovery) return <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />;
  if (!session) return <AuthScreen />;

  return (
    <AppDataProvider user={session.user}>
      <AppShell />
    </AppDataProvider>
  );
}
