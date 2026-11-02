"use client";

import { useState } from "react";

/**
 * A product's daily sales from TikTok's daily top-100 lists (owner, 1 Nov 2026): the middle of TikTok's GMV range as a line, the
 * range itself shaded, and a gap on any day it wasn't in a top 100. Estimated, as the note under it says. `top` sets the scale's
 * top and `at` marks one day (GmvChart).
 */
export function GmvSpark({ points, ranges, width = 96, height = 32, label, days, top: topIn, at = null }: {
  points: (number | null)[]; ranges?: ([number, number] | null)[]; width?: number; height?: number; label?: string; days?: string[]; top?: number; at?: number | null;
}) {
  const n = points.length;
  const top = topIn ?? Math.max(1, ...(ranges ?? []).map((r) => (r ? r[1] : 0)), ...points.map((v) => v ?? 0));
  const x = (i: number) => (n <= 1 ? width / 2 : 2 + (i * (width - 4)) / (n - 1));
  const y = (v: number) => height - 3 - (v / top) * (height - 6);
  // Runs of days that were in a top 100, drawn separately so missing days leave a gap.
  const runs: number[][] = [];
  points.forEach((v, i) => {
    if (v == null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  });
  const known = points.filter((v): v is number => v != null);
  const aria = label ?? `Sales, last ${n} days: ${known.length ? `${known.length} of ${n} days in TikTok's top 100` : "not in TikTok's top 100"}`;
  return (
    <svg className="gs" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={aria}>
      <line x1="0" x2={width} y1={height - 3} y2={height - 3} className="gs-base" />
      {at != null && <line className="gs-at" x1={x(at)} x2={x(at)} y1={0} y2={height - 3} />}
      {ranges && runs.map((r) => {
        const band = r.filter((i) => ranges[i]);
        if (!band.length) return null;
        const up = band.map((i) => `${x(i)},${y(ranges[i]![1])}`);
        const down = [...band].reverse().map((i) => `${x(i)},${y(ranges[i]![0])}`);
        return band.length > 1 ? <polygon key={`b${r[0]}`} className="gs-band" points={[...up, ...down].join(" ")} /> : <line key={`b${r[0]}`} className="gs-band-1" x1={x(band[0])} x2={x(band[0])} y1={y(ranges[band[0]]![1])} y2={y(ranges[band[0]]![0])} />;
      })}
      {runs.map((r) => (r.length > 1 ? <polyline key={`l${r[0]}`} className="gs-line" points={r.map((i) => `${x(i)},${y(points[i]!)}`).join(" ")} /> : null))}
      {runs.map((r) => r.map((i) => <circle key={`d${i}`} className="gs-dot" cx={x(i)} cy={y(points[i]!)} r={i === at ? 3.6 : r.length > 1 && i !== r[r.length - 1] ? 1.2 : 2.2}>{days && <title>{`${days[i]}: about RM ${Math.round(points[i]!).toLocaleString("en-MY")}`}</title>}</circle>))}
    </svg>
  );
}

/** "5 Oct", Malaysia time. */
const dayLabel = (d: string) => new Date(`${d}T12:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
/** RM 20K, RM 1.5M, RM 500: the side scale. */
const rmShort = (v: number) => `RM ${v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K` : Math.round(v)}`;
const rmFull = (v: number) => Math.round(v).toLocaleString("en-MY");
/** A round top for the side scale (1, 2 or 5 × a power of ten), so its labels read plainly. */
const niceTop = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
};

/**
 * The product page's sales graph (owner, 2 Nov 2026): RM up the side, dates along the bottom (first, middle and last day), and a
 * tap or click on any day shows that day's GMV range from TikTok, or that it wasn't in TikTok's top 100 that day (never zero).
 */
export function GmvChart({ days, ranges, label, height = 96 }: { days: string[]; ranges: ([number, number] | null)[]; label: string; height?: number }) {
  const [at, setAt] = useState<number | null>(null);
  const top = niceTop(Math.max(1, ...ranges.map((r) => (r ? r[1] : 0))));
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];
  const sel = at === null ? null : ranges[at];
  return (
    <div className="gc">
      <div className="gc-plot">
        <span className="gc-y" aria-hidden="true"><small>{rmShort(top)}</small><small>{rmShort(top / 2)}</small><small>RM 0</small></span>
        <div className="gc-area">
          <GmvSpark points={ranges.map((r) => (r ? (r[0] + r[1]) / 2 : null))} ranges={ranges} width={320} height={height} days={days} label={label} top={top} at={at} />
          <span className="gc-hit" role="group" aria-label="Pick a day">
            {days.map((d, i) => (
              <button key={d} type="button" aria-pressed={at === i} aria-label={`${dayLabel(d)}: ${ranges[i] ? `RM ${rmFull(ranges[i]![0])} to ${rmFull(ranges[i]![1])}` : "not in TikTok's top 100"}`} onClick={() => setAt(at === i ? null : i)} />
            ))}
          </span>
        </div>
        <span className="gc-x" aria-hidden="true">{ticks.map((i) => <small key={i}>{dayLabel(days[i])}</small>)}</span>
      </div>
      <p className="gc-day" aria-live="polite">
        {at === null ? "Tap a day to see its sales." : <><b>{dayLabel(days[at])}</b> {sel ? `RM ${rmFull(sel[0])}–${rmFull(sel[1])}` : "Not in TikTok's top 100 that day"}</>}
      </p>
    </div>
  );
}
