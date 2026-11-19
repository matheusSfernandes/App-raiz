// Rostinhos de humor desenhados com traços (1 = péssimo ... 5 = ótimo)
const MOUTHS = {
  1: 'M8 16.8 Q12 12.6 16 16.8',
  2: 'M8.6 16 Q12 14 15.4 16',
  3: 'M8.6 15.2 H15.4',
  4: 'M8.4 14.4 Q12 17.8 15.6 14.4',
  5: 'M7.8 13.6 Q12 19.4 16.2 13.6 Z',
};

export default function MoodFace({ mood, size = 26 }) {
  const m = Number(mood);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mood-face">
      <circle cx="12" cy="12" r="9.5" />
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
    </svg>
  );
}
