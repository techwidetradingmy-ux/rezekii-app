/** Rezekii creator level emblems: a shield in the level's metal. Bronze = star, Silver = star + laurel, Gold = crown + laurel. */
export type Level = "bronze" | "silver" | "gold";

const METAL: Record<Level, [string, string, string, string]> = {
  // gradient start, middle, end, inner line / mark colour
  bronze: ["#e7a875", "#b8743f", "#8a4b22", "#fff4ea"],
  silver: ["#f4f7f8", "#b9c4ca", "#6f7f88", "#ffffff"],
  gold: ["#fff1a8", "#f2c230", "#a86e00", "#fffbe8"],
};

const SHIELD = "M40 4 70 18v22c0 18-13 31-30 36C23 71 10 58 10 40V18z";
const INNER = "M40 12 63 23v17c0 14-10 24-23 28-13-4-23-14-23-28V23z";

export function Emblem({ level, size = 74 }: { level: Level; size?: number }) {
  const [a, b, c, mark] = METAL[level];
  const id = `rz-emblem-${level}`;
  const name = level[0].toUpperCase() + level.slice(1);
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={`${name} emblem`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.5" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#${id})`} />
      <path d={INNER} fill="none" stroke={mark} strokeWidth="2" opacity="0.8" />
      {level === "gold" ? (
        <>
          <path d="M26 33 31 22l9 8 9-8 5 11-3 12H29z" fill={mark} />
          <circle cx="31" cy="21" r="2.6" fill={mark} />
          <circle cx="40" cy="28" r="2.6" fill={mark} />
          <circle cx="49" cy="21" r="2.6" fill={mark} />
        </>
      ) : (
        <path d="m40 24 4.5 9.2 10.2 1.5-7.4 7.2 1.8 10.1L40 47.2l-9.1 4.8 1.8-10.1-7.4-7.2 10.2-1.5z" fill={mark} />
      )}
      {level !== "bronze" && <path d="M25 55c5 4.5 9.5 6.8 15 7 5.5-.2 10-2.5 15-7" fill="none" stroke={mark} strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}
