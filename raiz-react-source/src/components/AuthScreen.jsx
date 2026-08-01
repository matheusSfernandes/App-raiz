import { useState } from 'react';
import { sb } from '../lib/supabaseClient';
import { EyeIcon, EyeOffIcon } from './ui/Icons';

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorColor, setErrorColor] = useState('');

  async function handleSubmit() {
    setError(''); setErrorColor('');

    if (mode === 'forgot') {
      if (!email) { setError('Digite seu e-mail.'); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) { setError(error.message); return; }
      setErrorColor('var(--moss)');
      setError('Link enviado! Verifique seu e-mail para redefinir a senha.');
      return;
    }

    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    if (mode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      if (data.user && !data.session) {
        setErrorColor('var(--moss)');
        setError('Conta criada! Verifique seu e-mail para confirmar antes de entrar.');
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
  }

  const titles = {
    login: 'Entre para acessar sua evolução pessoal.',
    signup: 'Crie sua conta para começar.',
    forgot: 'Digite seu e-mail para receber o link de redefinição.',
  };
  const buttonLabels = { login: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link' };

  return (
    <div className="auth-screen" id="authScreen">
      <div className="auth-logo">Raiz</div>
      <div className="auth-sub">{titles[mode]}</div>
      <input type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      {mode !== 'forgot' && (
        <PasswordInput
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      )}
      <button className="btn" onClick={handleSubmit}>{buttonLabels[mode]}</button>
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
