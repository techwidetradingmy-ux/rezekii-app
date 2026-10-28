"use client";

import { Icon } from "@/components/icons";
import { TZ } from "@/lib/mock-admin";

export type Tone = "ok" | "warn" | "bad" | "info" | "mute";

/** Status pill with a dot. */
export function Pill({ tone = "mute", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`ad-pill ${tone}`}>{children}</span>;
}

/** Initials avatar, colour picked from the name so the same person always looks the same. */
export function Av({ name, size = 34 }: { name: string; size?: number }) {
  const clean = name.replace(/^@/, "");
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
  let h = 0;
  for (const c of clean) h = (h * 31 + c.charCodeAt(0)) % 6;
  return (
    <span className={`ad-av c${h}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {ini}
    </span>
  );
}

/** Small trend line with a soft area under it. */
export function Spark({ values, tone = "up" }: { values: number[]; tone?: "up" | "down" | "flat" }) {
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - min) / span) * 26 - 2] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sp${Math.abs(values.reduce((a, b) => a * 7 + b, 3)) % 99991}`;
  return (
    <svg className={`ad-spark ${tone}`} viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,32 ${line} 100,32`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Funnel: each step's bar is relative to the first step; shows the share kept from the step before. */
export function Funnel({ steps, tone }: { steps: [string, number][]; tone?: "blue" | "amber" }) {
  const top = steps[0]?.[1] || 1;
  let worst = 1;
  let worstAt = -1;
  steps.forEach(([, v], i) => {
    if (i === 0) return;
    const keep = v / (steps[i - 1][1] || 1);
    if (keep < worst) { worst = keep; worstAt = i; }
  });
  return (
    <div className="ad-funnel">
      {steps.map(([label, v], i) => {
        const keep = i === 0 ? null : Math.round((v / (steps[i - 1][1] || 1)) * 100);
        return (
          <div key={label} className={`ad-fstep ${i === worstAt ? "stuck" : ""}`}>
            <span className="ad-flabel">{label}</span>
            <span className="ad-fbar"><i className={tone} style={{ width: `${Math.max(2, (v / top) * 100)}%`, animationDelay: `${i * 70}ms` }} /></span>
            <span className="ad-fnum">
              <b>{v.toLocaleString("en-MY")}</b>
              {keep !== null && <em>{keep}% kept{i === worstAt ? " · most drop here" : ""}</em>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Label / value list. */
export function Kv({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="ad-kv">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="ad-search">
      <Icon name="search" size={18} />
      <input className="np-input" type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Filter chips with counts. */
export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: [T, number?][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="v2-chips ad-chips" role="group" aria-label={label}>
      {options.map(([o, n]) => (
        <button key={o} type="button" className={`v2-chip ${o === value ? "on" : ""}`} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
          {n !== undefined && <small>{n}</small>}
        </button>
      ))}
    </div>
  );
}

/** iOS switch. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`np-switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

/** The line under every chart: range, time zone, source, update time. */
export function Meta({ range, source, updated = "Today 10:42" }: { range: string; source: string; updated?: string }) {
  return (
    <p className="ad-meta">
      <span>{range}</span>
      <span>{TZ}</span>
      <span>Source: {source}</span>
      <span>Updated {updated}</span>
    </p>
  );
}

/** Small uppercase heading inside cards and sheets. */
export function Sec({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="ad-sec">
      <span>{children}</span>
      {right}
    </div>
  );
}

/** Reason picker used for reject / freeze / disagree. Returns null until a reason is chosen. */
export function Reasons({ options, value, onChange, note, onNote, notePlaceholder = "Note (optional)" }: {
  options: string[]; value: string | null; onChange: (v: string) => void; note: string; onNote: (v: string) => void; notePlaceholder?: string;
}) {
  return (
    <div className="v2-stack" style={{ gap: 10 }}>
      <div className="v2-chips">
        {options.map((o) => (
          <button key={o} type="button" className={`v2-chip ${value === o ? "on" : ""}`} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
      <textarea className="np-input" rows={3} value={note} placeholder={notePlaceholder} onChange={(e) => onNote(e.target.value)} />
    </div>
  );
}
