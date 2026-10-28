"use client";

import { useState } from "react";
import { Seg } from "@/components/ui";
import { rm } from "@/lib/mock";

type Unit = "day" | "week" | "month";
/** Round totals worth celebrating; the chart marks where she crossed them. */
const MARKS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/**
 * Commission over the chosen range (owner, 28 Oct 2026): a running total by default, or per day/week/month. Drag or tap across
 * the chart and the big number shows that point. The total draws itself in with a soft glow, the latest point pulses, her best
 * day/week/month gets a label, and gold dots mark where her total crossed a round number (options A + C), all from her own sales.
 */
export function CommissionChart({ points, unit, range }: { points: [string, number][]; unit: Unit; range: string }) {
  const per = `Per ${unit}`;
  const [mode, setMode] = useState<"Total" | string>("Total");
  const [at, setAt] = useState<number | null>(null);
  const running = points.reduce<number[]>((acc, [, v]) => [...acc, (acc.at(-1) ?? 0) + v], []);
  const total = mode === "Total";
  const values = total ? running : points.map(([, v]) => v);
  const max = Math.max(...values) || 1;
  const n = points.length;
  const last = n - 1;
  const shown = at ?? last;
  const xOf = (i: number) => (total ? (n === 1 ? 50 : (i / last) * 100) : ((i + 0.5) / n) * 100);
  const yOf = (v: number) => 100 - (v / max) * 88;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setAt(total ? Math.round(f * last) : Math.min(last, Math.floor(f * n)));
  };
  const line = values.map((v, i) => `${i ? "L" : "M"}${xOf(i).toFixed(2)},${yOf(v).toFixed(2)}`).join(" ");
  // Best single day/week/month, and up to 3 round totals crossed in this range (the biggest ones, not too close to the start).
  const bestAt = points.reduce((b, [, v], i) => (v > points[b][1] ? i : b), 0);
  const end = running[last];
  const marks = MARKS.filter((m) => m < end && m >= end * 0.15).slice(-3).map((m) => ({ m, i: running.findIndex((v) => v >= m) })).filter((x) => x.i > 0 && x.i < last);

  return (
    <div className="cc">
      <div className="cc-head">
        <span className="cc-now">
          <small>{at === null ? (total ? `Total · ${range}` : `${points[last][0]} · ${unit === "day" ? "today" : `this ${unit}`}`) : total ? `Total by ${points[at][0]}` : points[at][0]}</small>
          <b className="v2-num">{rm(values[shown])}</b>
        </span>
        <Seg value={mode} options={["Total", per] as const} onChange={(m) => { setMode(m); setAt(null); }} />
      </div>
      <div className="cc-plot" role="img" aria-label={`Commission ${total ? "running total" : per.toLowerCase()}, ${range}: ${rm(running[last])}`} onPointerDown={pick} onPointerMove={pick} onPointerLeave={() => setAt(null)}>
        {total ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ccFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c073" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00c073" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L100,100 L0,100 Z`} fill="url(#ccFill)" />
            <path d={line} className="cc-glow" />
            <path d={line} className="cc-line" />
          </svg>
        ) : (
          <span className="cc-bars" aria-hidden="true">
            {values.map((v, i) => <i key={points[i][0]} className={i === shown ? "on" : undefined} style={{ height: `${(v / max) * 88}%` }} />)}
          </span>
        )}
        {total && at === null && <span className="cc-best" aria-hidden="true">Best {unit} · {rm(points[bestAt][1], 0)}</span>}
        {total && marks.map(({ m, i }, k) => (
          <span key={m} className="cc-mark" style={{ left: `${xOf(i)}%`, top: `${yOf(running[i])}%`, animationDelay: `${0.9 + k * 0.25}s` }} aria-hidden="true">
            <em className={xOf(i) > 70 ? "right" : xOf(i) < 30 ? "left" : undefined}>{rm(m, 0)} · {points[i][0]}</em>
          </span>
        ))}
        {at !== null && <i className="cc-cursor" style={{ left: `${xOf(shown)}%` }} aria-hidden="true" />}
        {total && <i className={`cc-dot${at === null ? " live" : ""}`} style={{ left: `${xOf(shown)}%`, top: `${yOf(values[shown])}%` }} aria-hidden="true" />}
      </div>
      <div className="cc-axis" aria-hidden="true"><span>{points[0][0]}</span><span>{unit === "day" ? "Today" : unit === "week" ? "This week" : points[last][0]}</span></div>
    </div>
  );
}
