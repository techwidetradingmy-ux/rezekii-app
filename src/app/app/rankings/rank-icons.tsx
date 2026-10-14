/** Rankings icons drawn for Rezekii (owner, 14 Oct 2026: no emoji, they look cheap). Gradients are ids unique per use. */
import { useId } from "react";

/** The #1 crown, gold with a soft shine sweep. */
export function Crown({ size = 34 }: { size?: number }) {
  const id = useId();
  return (
    <svg className="ri-crown" width={size} height={size * 0.78} viewBox="0 0 36 28" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffe58a" /><stop offset="0.55" stopColor="#f5b821" /><stop offset="1" stopColor="#c88a06" /></linearGradient>
        <linearGradient id={`${id}s`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <clipPath id={`${id}c`}><path d="M3 23 1.5 6.5l9 7.2L18 2l7.5 11.7 9-7.2L33 23z" /></clipPath>
      </defs>
      <path d="M3 23 1.5 6.5l9 7.2L18 2l7.5 11.7 9-7.2L33 23z" fill={`url(#${id}g)`} stroke="#9a6a00" strokeWidth="1.2" strokeLinejoin="round" />
      <rect className="ri-sweep" x="-14" y="0" width="10" height="28" fill={`url(#${id}s)`} clipPath={`url(#${id}c)`} transform="skewX(-18)" />
      <rect x="3" y="23" width="30" height="4" rx="1.6" fill="#c88a06" />
      <circle cx="18" cy="16" r="2.4" fill="#e8005a" stroke="#ffffff" strokeWidth="0.8" />
      <circle cx="9.5" cy="18" r="1.5" fill="#25f4ee" stroke="#ffffff" strokeWidth="0.6" />
      <circle cx="26.5" cy="18" r="1.5" fill="#25f4ee" stroke="#ffffff" strokeWidth="0.6" />
      <circle cx="1.5" cy="6.5" r="1.6" fill="#ffe58a" />
      <circle cx="18" cy="2" r="1.8" fill="#ffe58a" />
      <circle cx="34.5" cy="6.5" r="1.6" fill="#ffe58a" />
    </svg>
  );
}

const METAL: Record<number, [string, string, string, string]> = {
  1: ["#ffe58a", "#f5b821", "#a86e00", "#e8005a"],
  2: ["#f1f5f9", "#b6c2cf", "#64748b", "#1d4ed8"],
  3: ["#f6c39a", "#d98a4e", "#8a4a1c", "#00a862"],
};

/** A ribbon medal with the place on it (2nd silver, 3rd bronze; 1st gold where a crown doesn't fit). */
export function Medal({ place, size = 30 }: { place: 1 | 2 | 3; size?: number }) {
  const id = useId();
  const [hi, mid, edge, ribbon] = METAL[place];
  return (
    <svg className="ri-medal" width={size} height={size * 1.2} viewBox="0 0 30 36" aria-hidden="true">
      <defs><radialGradient id={`${id}m`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor={hi} /><stop offset="0.6" stopColor={mid} /><stop offset="1" stopColor={edge} /></radialGradient></defs>
      <path d="M8 0h6l3 12h-6z" fill={ribbon} />
      <path d="M22 0h-6l-3 12h6z" fill={ribbon} opacity="0.75" />
      <circle cx="15" cy="23" r="11.5" fill={`url(#${id}m)`} stroke={edge} strokeWidth="1.2" />
      <circle cx="15" cy="23" r="8.3" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" />
      <text x="15" y="27.4" textAnchor="middle" fontSize="12" fontWeight="900" fill={place === 2 ? "#334155" : "#ffffff"} fontFamily="inherit">{place}</text>
    </svg>
  );
}

/** A streak flame that flickers gently. */
export function Flame({ size = 14, hot = true }: { size?: number; hot?: boolean }) {
  const id = useId();
  return (
    <svg className={`ri-flame ${hot ? "" : "cold"}`} width={size} height={size * 1.2} viewBox="0 0 20 24" aria-hidden="true">
      <defs><linearGradient id={`${id}f`} x1="0" x2="0" y1="1" y2="0"><stop offset="0" stopColor={hot ? "#e8005a" : "#94a3b8"} /><stop offset="0.55" stopColor={hot ? "#ff7a1a" : "#b6c2cf"} /><stop offset="1" stopColor={hot ? "#ffd23f" : "#dbe3ea"} /></linearGradient></defs>
      <path d="M10 1c1 4 6 6.5 6 13a6 6 0 0 1-12 0c0-3 1.6-4.8 3-6 .2 2 1 3.3 2.2 3.8C8.6 8.6 9 4.6 10 1z" fill={`url(#${id}f)`} />
      <path d="M10 13c.6 2 3 3 3 5.3a3 3 0 0 1-6 0c0-1.6 1-2.6 1.8-3.2.1 1 .5 1.5 1 1.7-.3-1.4-.2-2.7.2-3.8z" fill="#fff4c2" opacity={hot ? 0.95 : 0.6} />
    </svg>
  );
}

/** The Hall of Fame trophy. */
export function Trophy({ size = 22 }: { size?: number }) {
  const id = useId();
  return (
    <svg className="ri-trophy" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={`${id}t`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffe58a" /><stop offset="1" stopColor="#d99a0b" /></linearGradient></defs>
      <path d="M6 3h12v5a6 6 0 0 1-12 0z" fill={`url(#${id}t)`} stroke="#9a6a00" strokeWidth="1" />
      <path d="M6 5H3v1.5A3.5 3.5 0 0 0 6.5 10M18 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5" fill="none" stroke="#d99a0b" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 14h3l.6 4h-4.2z" fill="#d99a0b" />
      <rect x="7" y="18" width="10" height="3" rx="1.2" fill="#9a6a00" />
      <path d="m12 5.2.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

/** A burst of confetti, for the "you're in the top 100" banner. */
export function Burst({ size = 40 }: { size?: number }) {
  return (
    <svg className="ri-burst" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="11" fill="#ffffff" opacity="0.35" />
      <path d="m20 9 2.8 6.2 6.7.6-5 4.5 1.5 6.6L20 23.5l-6 3.4 1.5-6.6-5-4.5 6.7-.6z" fill="#ffffff" />
      {[["#e8005a", 6, 8], ["#25f4ee", 33, 9], ["#00c073", 5, 31], ["#7c3aed", 34, 30], ["#ffffff", 20, 3], ["#ffffff", 20, 37]].map(([c, x, y], i) => (
        <rect key={i} className="ri-bit" x={Number(x) - 2} y={Number(y) - 2} width="4" height="4" rx="1" fill={String(c)} style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </svg>
  );
}

/** The Rezekii creators badge icon: a small rosette. */
export function Rosette({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 14-3 8 4-2 2 3 1-7M16 14l3 8-4-2-2 3-1-7" fill="#00a862" />
      <circle cx="12" cy="9.5" r="7" fill="#00c073" stroke="#00704a" strokeWidth="1" />
      <path d="m9 9.5 2 2 4-4.2" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
