// Efeitos discretos ao concluir: poucos pontos na cor de destaque e um som curto e baixo
export function burstConfetti(x, y) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2F6B4F';
  const n = 8;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 18 + Math.random() * 14;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.style.cssText = `position:fixed;left:${x + 11}px;top:${y + 11}px;width:4px;height:4px;border-radius:50%;background:${accent};pointer-events:none;z-index:9999;opacity:.9;transition:transform .45s cubic-bezier(.2,.8,.3,1), opacity .45s ease;`;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px, ${dy}px)`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 500);
  }
}

export function playSuccessSound() {
  if (localStorage.getItem('raiz_sound_enabled') === '0') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch { /* ignore */ }
}
