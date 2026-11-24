// Traduz as mensagens de erro do Supabase Auth (Etapa 7, testes de 24/11/2026: M1)
const RULES = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Veja a caixa de entrada e o spam.'],
  [/password should be at least|password.*(at least|minimum).*characters/i, 'A senha precisa ter pelo menos 6 caracteres.'],
  [/user already registered|already been registered/i, 'Este e-mail já tem conta. Use Entrar ou Esqueci minha senha.'],
  [/rate limit|too many requests|security purposes.*after/i, 'Muitas tentativas, aguarde alguns minutos e tente de novo.'],
  [/unable to validate email|invalid email|email address.*invalid/i, 'E-mail inválido. Confira se digitou certo.'],
  [/new password should be different|same.*password/i, 'A nova senha precisa ser diferente da atual.'],
  [/weak password|password is too weak|pwned|leaked/i, 'Senha fraca. Use letras, números e símbolos.'],
  [/signups not allowed|signup.*disabled/i, 'Cadastro desativado no momento.'],
  [/session.*(missing|expired)|jwt expired|auth session/i, 'Sua sessão expirou. Abra o link do e-mail de novo.'],
  [/failed to fetch|network|load failed/i, 'Sem conexão. Verifique a internet e tente de novo.'],
];

export function authErrorPt(error) {
  const msg = error?.message || String(error || '');
  for (const [re, pt] of RULES) if (re.test(msg)) return pt;
  return 'Não deu certo. Tente de novo em instantes.';
}
