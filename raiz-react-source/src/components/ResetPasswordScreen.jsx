import { useState, useEffect } from 'react';
import { sb } from '../lib/supabaseClient';
import { EyeIcon, EyeOffIcon, LogoMark } from './ui/Icons';

function PasswordInput({ value, onChange, placeholder, name }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input type={show ? 'text' : 'password'} name={name} id={name} placeholder={placeholder} value={value} onChange={onChange} autoComplete="new-password" />
      <button type="button" className="password-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  useEffect(() => { sb.auth.getUser().then(({ data }) => setEmail(data.user?.email || '')); }, []);

  async function handleSubmit(e) {
    e?.preventDefault();
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
        <LogoMark size={48} />
        <div className="auth-logo">Raiz</div>
        <div className="auth-sub" style={{ color: 'var(--accent)' }}>Senha alterada com sucesso!</div>
        <button className="btn" onClick={onDone}>Continuar</button>
      </div>
    );
  }

  return (
    <div className="auth-screen" id="authScreen">
      <LogoMark size={48} />
        <div className="auth-logo">Raiz</div>
      <div className="auth-sub">Defina sua nova senha.</div>
      {/* O e-mail escondido diz ao gerenciador de senhas qual login atualizar */}
      <form onSubmit={handleSubmit} method="post" action="#" style={{ width: '100%' }}>
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
        <PasswordInput name="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha" />
        <PasswordInput name="confirm-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirme a nova senha" />
        <button className="btn" type="submit">Salvar nova senha</button>
      </form>
      <div className="auth-error">{error}</div>
    </div>
  );
}
