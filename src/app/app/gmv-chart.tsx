"use client";

import { useId, useState } from "react";

const rm = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayLabel = (now: number, daysAgo: number) =>
  new Date(now - daysAgo * 86400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });

/**
 * GMV per day as a filled line (the mockup's creator-card chart), revealed left to right with a short animation.
 * The reveal is a growing clip, not a stroke dash: a dash is measured before the chart is stretched to fit, so tall spikes
 * left the end of the line undrawn.
 * Hovering or tapping shows that day's GMV. `daily` is oldest first; the last value is today.
 */
export function GmvChart({ daily, now, height = 140, tone = "green" }: { daily: number[]; now: number; height?: number; tone?: "green" | "light" }) {
  const id = useId();
  const [at, setAt] = useState<number | null>(null);
  const W = 600;
  const max = Math.max(1, ...daily);
  const n = daily.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => height - 6 - (v / max) * (height - 18);
  const line = daily.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const stroke = tone === "light" ? "#25f4ee" : "#00c073";
  const best = daily.indexOf(Math.max(...daily));
  const label = `GMV per day for the last ${n} days. Highest ${rm(daily[best] ?? 0)} on ${dayLabel(now, n - 1 - best)}.`;
  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    setAt(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1)))));
  };
  return (
    <div className="gc" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        onMouseMove={(e) => pick(e.clientX, e.currentTarget)}
        onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setAt(null)}
        style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <rect className="gc-reveal" x={-4} y={-20} width={W + 8} height={height + 40} />
          </clipPath>
        </defs>
        <path className="gc-area" d={`${line} L${W} ${height} L0 ${height} Z`} fill={`url(#${id}f)`} />
        <path className="gc-line" d={line} clipPath={`url(#${id}c)`} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {at !== null && <line x1={x(at)} x2={x(at)} y1="0" y2={height} stroke={stroke} strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {at !== null && (
        <span className="gc-tip" style={{ left: `${(x(at) / W) * 100}%` }}>
          {dayLabel(now, n - 1 - at)} · {rm(daily[at])}
        </span>
      )}
    </div>
  );
}
