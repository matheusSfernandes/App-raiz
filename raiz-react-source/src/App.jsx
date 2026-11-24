import { useState, useEffect } from 'react';
import { sb, storedSession } from './lib/supabaseClient';
import { clearOfflineData } from './lib/offline';
import { sessionShouldEnd } from './lib/remember';
import OfflineBar from './components/OfflineBar';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Toasts from './components/Toasts';
import { HamburgerIcon, NAV_ITEMS } from './components/ui/Icons';
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

const VIEWS = ['inicio', 'rotina', 'habitos', 'metas', 'treino', 'financas', 'historico', 'perfil', 'conquistas', 'foco'];

function AppShell() {
  const { profile, loading, toasts } = useAppData();
  // Abre direto numa tela quando vem de um lembrete (?view=historico&tab=revisao)
  const [view, setView] = useState(() => {
    const v = new URLSearchParams(location.search).get('view');
    return VIEWS.includes(v) ? v : 'inicio';
  });
  const [viewTab, setViewTab] = useState(() => new URLSearchParams(location.search).get('tab'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  // M5 (testes 24/11): a tela atual fica no endereço (?view=rotina), então recarregar mantém a tela
  // e o Voltar do navegador ou do Android volta para a tela anterior
  useEffect(() => {
    history.replaceState({ view }, '', view === 'inicio' ? location.pathname : `?view=${view}`);
    function onPop(e) {
      const v = e.state?.view || new URLSearchParams(location.search).get('view') || 'inicio';
      setView(v); setViewTab(null); setDrawerOpen(false);
    }
    function onMsg(e) {
      if (e.data?.type !== 'open') return;
      const p = new URL(e.data.url).searchParams;
      const v = p.get('view') || 'inicio';
      setViewTab(p.get('tab'));
      setView(v);
      history.pushState({ view: v }, '', v === 'inicio' ? location.pathname : `?view=${v}`);
    }
    window.addEventListener('popstate', onPop);
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('popstate', onPop);
      navigator.serviceWorker?.removeEventListener('message', onMsg);
    };
  }, []);

  // intent 'novo': abre a tela já com o formulário de criação aberto (usado pelo guia do primeiro acesso)
  function navigate(v, intent = null) {
    if (v !== view) history.pushState({ view: v }, '', v === 'inicio' ? location.pathname : `?view=${v}`);
    setView(v);
    setViewTab(intent);
    setDrawerOpen(false);
    const mainEl = document.querySelector('.main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
  }

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const nameSuffix = profile.name ? `, ${profile.name.split(' ')[0]}` : '';
  // B1 (testes 24/11): fora do Início, o título mostra o nome da tela atual
  const viewLabel = NAV_ITEMS.find(i => i.view === view)?.label || 'Raiz';
  const isHome = view === 'inicio';
  useEffect(() => { document.title = isHome ? 'Raiz' : `${viewLabel} · Raiz`; }, [isHome, viewLabel]);
  const startNew = viewTab === 'novo';

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
          {isHome ? (
            <>
              <h1 className="greeting">{greet}{nameSuffix}</h1>
              <div className="quote">"{profile.quote || 'Você não precisa ser perfeito, só precisa ser persistente.'}"</div>
            </>
          ) : (
            <h1 className="greeting view-title">{viewLabel}</h1>
          )}
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
              {view === 'rotina' && <RotinaView startNew={startNew} />}
              {view === 'habitos' && <HabitosView startNew={startNew} />}
              {view === 'metas' && <MetasView />}
              {view === 'treino' && <TreinoView />}
              {view === 'financas' && <FinancasView startNew={startNew} />}
              {view === 'historico' && <HistoricoView key={viewTab || 'h'} initialTab={viewTab} />}
              {view === 'perfil' && <PerfilView onNavigate={navigate} />}
              {view === 'conquistas' && <ConquistasView />}
              {view === 'foco' && <FocoView />}
            </div>
          )}
        </div>
      </div>
      <TabBar view={view} onNavigate={navigate} />
      <OfflineBar />
      <Toasts toasts={toasts} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const offlineFallback = () => (!navigator.onLine ? storedSession() : null);
    (async () => {
      // "Lembrar de mim" desmarcado e o app foi fechado: encerra a sessão neste aparelho
      if (sessionShouldEnd() && storedSession()) await sb.auth.signOut({ scope: 'local' }).catch(() => {});
      const { data, error } = await sb.auth.getSession();
      setSession(data.session || (error ? storedSession() : offlineFallback()));
    })();
    const { data: listener } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') clearOfflineData();
      if (!s && event === 'INITIAL_SESSION') { const f = storedSession(); if (f && !navigator.onLine) { setSession(f); return; } }
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
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
