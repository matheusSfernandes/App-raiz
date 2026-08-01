import { useState } from 'react';
import { sb } from '../lib/supabaseClient';

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorColor, setErrorColor] = useState('');

  async function handleSubmit() {
    setError(''); setErrorColor('');
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    if (isSignup) {
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

  return (
    <div className="auth-screen">
      <div className="auth-logo">Raiz</div>
      <div className="auth-sub">{isSignup ? 'Crie sua conta para começar.' : 'Entre para acessar sua evolução pessoal.'}</div>
      <input type="email" placeholder="E-mail" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Senha" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="btn" onClick={handleSubmit}>{isSignup ? 'Criar conta' : 'Entrar'}</button>
      <div className="auth-error" style={{ color: errorColor || undefined }}>{error}</div>
      <div className="auth-toggle">
        {isSignup ? (
          <>Já tem conta? <a onClick={() => setIsSignup(false)}>Entrar</a></>
        ) : (
          <>Não tem conta? <a onClick={() => setIsSignup(true)}>Criar conta</a></>
        )}
      </div>
    </div>
  );
}
