// "Lembrar de mim" no login (Etapa 7, 24/11/2026)
// Marcado: guarda o e-mail no aparelho e a sessão continua aberta até tocar em Sair.
// Desmarcado: não guarda o e-mail e a sessão termina quando o app ou a aba é fechado.
// A senha nunca é guardada pelo app: quem preenche é o gerenciador de senhas do aparelho (Chaves do iCloud, Google).
const KEY = 'raiz-lembrar';      // { on: true|false, email }
const OPEN = 'raiz-sessao-aberta'; // marca desta abertura do app (sessionStorage some ao fechar)

export function getRemember() {
  try { return { on: true, email: '', ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { on: true, email: '' }; }
}

export function setRemember(on, email) {
  try {
    localStorage.setItem(KEY, JSON.stringify(on ? { on: true, email } : { on: false, email: '' }));
    sessionStorage.setItem(OPEN, '1');
  } catch { /* modo privado */ }
}

export function forgetEmail() {
  try { const r = getRemember(); localStorage.setItem(KEY, JSON.stringify({ ...r, email: '' })); } catch { /* */ }
}

// Na abertura: se a pessoa escolheu não ser lembrada e o app foi fechado, a sessão deve terminar
export function sessionShouldEnd() {
  try {
    if (getRemember().on) return false;
    if (sessionStorage.getItem(OPEN)) return false;
    return true;
  } catch { return false; }
}
