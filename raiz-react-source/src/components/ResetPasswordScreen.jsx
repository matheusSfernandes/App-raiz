import { useState } from 'react';
import { sb } from '../lib/supabaseClient';

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} autoComplete="new-password" />
      <button type="button" className="password-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError('');
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    const { error } = await sb.auth.updateUser({ password });
    if (error) { setError(error.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="auth-screen" id="authScreen">
        <div className="auth-logo">Raiz</div>
        <div className="auth-sub" style={{ color: 'var(--moss)' }}>Senha alterada com sucesso!</div>
        <button className="btn" onClick={onDone}>Continuar</button>
      </div>
    );
  }

  return (
    <div className="auth-screen" id="authScreen">
      <div className="auth-logo">Raiz</div>
      <div className="auth-sub">Defina sua nova senha.</div>
      <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha" />
      <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirme a nova senha" />
      <button className="btn" onClick={handleSubmit}>Salvar nova senha</button>
      <div className="auth-error">{error}</div>
    </div>
  );
}
