import { useId } from 'react';

// Rostinhos de humor desenhados com traços (1 = péssimo ... 5 = ótimo).
// Com `colored`, a figura ganha a cor do humor com textura de giz:
// o preenchimento sai granulado e as bordas levemente irregulares.
const MOUTHS = {
  1: 'M8 16.8 Q12 12.6 16 16.8',
  2: 'M8.6 16 Q12 14 15.4 16',
  3: 'M8.6 15.2 H15.4',
  4: 'M8.4 14.4 Q12 17.8 15.6 14.4',
  5: 'M7.8 13.6 Q12 19.4 16.2 13.6 Z',
};

function Features({ m }) {
  return (
    <>
      {m === 5 ? (
        <>
          <path d="M7.6 10.2 Q9 8.6 10.4 10.2" />
          <path d="M13.6 10.2 Q15 8.6 16.4 10.2" />
        </>
      ) : (
        <>
          <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
        </>
      )}
      {m === 1 && <><path d="M7.6 8.8 L10 7.6" /><path d="M16.4 8.8 L14 7.6" /></>}
      {MOUTHS[m] && <path d={MOUTHS[m]} />}
    </>
  );
}

export default function MoodFace({ mood, size = 26, colored = false }) {
  const m = Number(mood);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  if (!colored) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mood-face">
        <circle cx="12" cy="12" r="9.5" />
        <Features m={m} />
      </svg>
    );
  }

  const fill = `chalkfill${uid}`;
  const line = `chalkline${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`mood-face chalk mood-${m}`}>
      <defs>
        {/* Preenchimento: borda tremida + grãos falhados, como giz deitado no papel */}
        <filter id={fill} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed={m * 3} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed={m * 5 + 1} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 4.75" result="mask" />
          <feComposite in="shape" in2="mask" operator="in" />
        </filter>
        {/* Traços: leve tremor e poucos falhados */}
        <filter id={line} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={m * 7 + 2} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="1" seed={m * 11 + 3} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -8 0 0 0 5.9" result="mask" />
          <feComposite in="shape" in2="mask" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${fill})`} className="mf-fill">
        <circle cx="12" cy="12" r="9.3" stroke="none" />
      </g>
      <g filter={`url(#${line})`}>
        <circle cx="12" cy="12" r="9.5" className="mf-ring" />
        <g className="mf-ink"><Features m={m} /></g>
      </g>
    </svg>
  );
}
