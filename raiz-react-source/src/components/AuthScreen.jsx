import { useState } from 'react';
import { sb } from '../lib/supabaseClient';
import { EyeIcon, EyeOffIcon, LogoMark } from './ui/Icons';
import { authErrorPt } from '../lib/authErrors';
import { getRemember, setRemember, forgetEmail } from '../lib/remember';

function PasswordInput({ value, onChange, placeholder, autoComplete, name, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        id={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
      />
      <button type="button" className="password-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const saved = getRemember();
  const [email, setEmail] = useState(saved.email || '');
  const [remember, setRememberOn] = useState(saved.on);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorColor, setErrorColor] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (busy) return;
    setError(''); setErrorColor('');

    if (mode === 'forgot') {
      if (!email) { setError('Digite seu e-mail.'); return; }
      setBusy(true);
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) { setError(authErrorPt(error)); return; }
        setErrorColor('var(--accent)');
        setError('Link enviado! Verifique seu e-mail para redefinir a senha.');
      } catch (err) { setError(authErrorPt(err)); } finally { setBusy(false); }
      return;
    }

    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    if (mode === 'signup' && password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) { setError(authErrorPt(error)); return; }
        if (data.session) setRemember(true, email.trim());
        if (data.user && !data.session) {
          setErrorColor('var(--accent)');
          setError('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) setError(authErrorPt(error));
        else setRemember(remember, email.trim());
      }
    } catch (err) { setError(authErrorPt(err)); } finally { setBusy(false); }
  }

  // B4: some o aviso antigo quando a pessoa volta a digitar
  function clearError() { if (error && !errorColor) setError(''); }

  const titles = {
    login: 'Entre para acessar sua evolução pessoal.',
    signup: 'Crie sua conta para começar.',
    forgot: 'Digite seu e-mail para receber o link de redefinição.',
  };
  const buttonLabels = { login: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link' };
  const busyLabels = { login: 'Entrando…', signup: 'Criando conta…', forgot: 'Enviando…' };

  return (
    <div className="auth-screen" id="authScreen">
      <LogoMark size={48} />
      <div className="auth-logo">Raiz</div>
      <div className="auth-sub">{titles[mode]}</div>
      {/* Formulário de verdade: o iPhone (Chaves do iCloud) e o navegador oferecem salvar e preencher e-mail e senha */}
      <form onSubmit={handleSubmit} method="post" action="#" style={{ width: '100%' }}>
      <input type="email" name="email" id="email" placeholder="E-mail" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} />
      {mode === 'login' && saved.email && email === saved.email && (
        <div className="auth-remembered">
          <a onClick={() => { forgetEmail(); setEmail(''); }}>Usar outro e-mail</a>
        </div>
      )}
      {mode !== 'forgot' && (
        <PasswordInput
          value={password}
          onChange={e => { setPassword(e.target.value); clearError(); }}
          placeholder="Senha"
          name={mode === 'signup' ? 'new-password' : 'password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          autoFocus={mode === 'login' && !!saved.email}
        />
      )}
      {mode === 'login' && (
        <label className="flag-check auth-remember">
          <input type="checkbox" checked={remember} onChange={e => setRememberOn(e.target.checked)} />
          <span>Lembrar de mim<small>Continua conectado e guarda o e-mail neste aparelho</small></span>
        </label>
      )}
      <button className="btn" type="submit" disabled={busy}>{busy ? busyLabels[mode] : buttonLabels[mode]}</button>
      </form>
      <div className="auth-error" style={{ color: errorColor || undefined }}>{error}</div>

      {mode === 'login' && (
        <div className="auth-toggle">
          <a onClick={() => { setMode('forgot'); setError(''); }}>Esqueci minha senha</a>
        </div>
      )}

      <div className="auth-toggle">
        {mode === 'signup' && (<>Já tem conta? <a onClick={() => { setMode('login'); setError(''); }}>Entrar</a></>)}
        {mode === 'login' && (<>Não tem conta? <a onClick={() => { setMode('signup'); setError(''); }}>Criar conta</a></>)}
        {mode === 'forgot' && (<>Lembrou a senha? <a onClick={() => { setMode('login'); setError(''); }}>Voltar ao login</a></>)}
      </div>
    </div>
  );
}
