export function burstConfetti(x, y) {
  const colors = ['#FF3D81', '#FFB627', '#2FE6E6', '#58D68D'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
    const dist = 60 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:7px;height:7px;border-radius:2px;background:${colors[i % colors.length]};pointer-events:none;z-index:9999;transition:transform .6s cubic-bezier(.25,.8,.25,1), opacity .6s ease;`;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 650);
  }
}

export function playSuccessSound() {
  if (localStorage.getItem('raiz_sound_enabled') === '0') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  } catch (e) { /* ignore */ }
}
