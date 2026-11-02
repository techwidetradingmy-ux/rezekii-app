"use client";

import { Fragment } from "react";
import { BrandLogo } from "@/components/brand-logos";
import { Icon } from "@/components/icons";
import { AiMark } from "@/components/ui";

/** Small pieces shared by the mini app screens and the bento tiles. All decorative copies of real screens, so aria-hidden. */

export type Vars = React.CSSProperties & Record<`--${string}`, string | number>;
export const v = (o: Record<string, string | number>) => Object.fromEntries(Object.entries(o).map(([k, x]) => [`--${k}`, x])) as Vars;

/**
 * A translated line that keeps its styling inside it, so it stays one whole line in every language (owner, 3 Nov 2026):
 * **words** show bold, *words* in <em>, and each {name} that t() left unfilled becomes the element in `parts`.
 */
export function Rich({ text, parts = {} }: { text: string; parts?: Record<string, React.ReactNode> }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{\w+\})/).map((x, i) => {
        if (/^\*\*[^*]+\*\*$/.test(x)) return <b key={i}>{x.slice(2, -2)}</b>;
        if (/^\*[^*]+\*$/.test(x)) return <em key={i}>{x.slice(1, -1)}</em>;
        const k = /^\{(\w+)\}$/.exec(x)?.[1];
        return <Fragment key={i}>{k && k in parts ? parts[k] : x}</Fragment>;
      })}
    </>
  );
}

/** A mini app screen (title already translated): back arrow, title, the AI mark on AI features. */
export function App({ title, ai, children }: { title: string; ai?: boolean; children: React.ReactNode }) {
  return (
    <div className="lp-app" aria-hidden="true">
      <div className="lp-app-h">
        <Icon name="back" size={16} width={2.4} />
        <b>{title}</b>
        {ai ? <AiMark size={22} /> : <span />}
      </div>
      <div className="lp-app-b">{children}</div>
    </div>
  );
}

/** A product photo, lazy-loaded. */
export function Thumb({ src, size = 38 }: { src: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="lp-thumb" src={src} alt="" loading="lazy" decoding="async" width={size} height={size} style={{ width: size, height: size }} />;
}

const AV = ["linear-gradient(135deg,#22dc95,#00a862)", "linear-gradient(135deg,#7aa2ff,#1d4ed8)", "linear-gradient(135deg,#ffb35c,#f08a00)", "linear-gradient(135deg,#ff7aa8,#e8005a)", "linear-gradient(135deg,#b28dff,#6d28d9)", "linear-gradient(135deg,#5ee7df,#0e9488)"];
/** Coloured initials for a sample handle (same colour every time). */
export function Av({ name, size = 26 }: { name: string; size?: number }) {
  const clean = name.replace(/^@/, "");
  const parts = clean.split(/[.\s_]+/).filter(Boolean);
  const ini = (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase();
  const bg = AV[[...clean].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  return <span className="lp-av" style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.4) }}>{ini}</span>;
}

/**
 * Two states in one spot: `from` shows first, then `to` takes its place at `at` seconds into the scene. With reduced motion,
 * or before the scene plays, only `to` (the result) shows.
 */
export function Swap({ from, to, at = 1, className = "" }: { from: React.ReactNode; to: React.ReactNode; at?: number; className?: string }) {
  return (
    <span className={`lp-swap ${className}`} style={v({ at: `${at}s` })}>
      <span>{from}</span>
      <span>{to}</span>
    </span>
  );
}

/** Old value flips over to the Rezekii value, the old one stays struck through. `fmt` for money; rates by default. */
export function Flip({ was, now, i = 0, fmt = (x: number) => `${x}%` }: { was: number; now: number; i?: number; fmt?: (x: number) => string }) {
  return (
    <span className="lp-flip" data-was={fmt(was)} style={v({ i })}>
      <s>{fmt(was)}</s>
      <b>{fmt(now)}</b>
    </span>
  );
}

export type Plat = "TikTok" | "Facebook" | "Instagram" | "Threads";
/** The four apps Rezekii posts to, with their real logos (owner, 30 Oct 2026). */
export function PlatIcon({ name, size = 28 }: { name: Plat; size?: number }) {
  return <BrandLogo name={name} size={size} className="lp-pi" />;
}
export const PLATS: Plat[] = ["TikTok", "Facebook", "Instagram", "Threads"];

/** Ring that fills from `from` to `to` (0–1). */
export function Ring({ from, to, size = 72, children }: { from: number; to: number; size?: number; children?: React.ReactNode }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <span className="lp-ring" style={{ width: size, height: size, ...v({ o0: `${(c * (1 - from)).toFixed(1)}px`, o1: `${(c * (1 - to)).toFixed(1)}px` }) }}>
      <svg viewBox="0 0 72 72" width={size} height={size}>
        <circle cx="36" cy="36" r={r} className="bg" />
        <circle cx="36" cy="36" r={r} className="fg" strokeDasharray={c.toFixed(1)} />
      </svg>
      <span>{children}</span>
    </span>
  );
}
