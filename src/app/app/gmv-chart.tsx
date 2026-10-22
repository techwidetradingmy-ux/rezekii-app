"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";

const rm = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The one GMV chart for every page (owner, 14 Oct 2026: same design everywhere, interactive, with motion). A filled line drawn
 * left to right (a growing clip, so tall spikes are never left undrawn), the best point marked with a soft pulse, and an optional
 * comparison as a dashed line. Hovering, tapping or dragging shows a guide, a dot on each line and a card with that point's GMV.
 * `values` and `labels` run oldest first.
 */
export function GmvChart({ values, labels, compare, compareName, height = 200, ariaLabel }: { values: number[]; labels: string[]; compare?: number[]; compareName?: string; height?: number; ariaLabel?: string }) {
  const t = useT();
  const id = useId();
  const [at, setAt] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const len = values.length;
  const top = Math.max(1, ...values, ...(compare ?? [])) * 1.12;
  const x = (i: number) => (len <= 1 ? W / 2 : (i / (len - 1)) * W);
  const y = (v: number) => H - 6 - (v / top) * (H - 18);
  const line = (arr: number[]) => arr.slice(0, len).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const best = values.indexOf(Math.max(...values));
  const pick = (clientX: number, el: Element) => {
    const r = el.getBoundingClientRect();
    setAt(Math.max(0, Math.min(len - 1, Math.round(((clientX - r.left) / r.width) * (len - 1)))));
  };
  const cur = at !== null ? values[at] ?? 0 : 0;
  const was = at !== null && compare ? compare[at] ?? 0 : null;
  const delta = was !== null && was > 0 ? Math.round(((cur - was) / was) * 100) : null;
  const label = ariaLabel ?? t("GMV over {n} points. Highest {x} on {day}.", { n: len, x: rm(values[best] ?? 0), day: labels[best] ?? "" });
  return (
    <div className="gc" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        onMouseMove={(e) => pick(e.clientX, e.currentTarget)}
        onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget)}
        onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setAt(null)}
        style={{ display: "block", overflow: "visible", cursor: "crosshair", touchAction: "pan-y" }}
      >
        <defs>
          <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00c073" stopOpacity="0.3" /><stop offset="1" stopColor="#00c073" stopOpacity="0" /></linearGradient>
          <clipPath id={`${id}c`}><rect className="gc-reveal" x={-4} y={-30} width={W + 8} height={H + 60} /></clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={0} x2={W} y1={H * k} y2={H * k} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
        <path className="gc-area" d={`${line(values)} L${x(len - 1)} ${H} L0 ${H} Z`} fill={`url(#${id}f)`} />
        {compare && <path d={line(compare)} clipPath={`url(#${id}c)`} fill="none" stroke="#2f80ed" strokeWidth="2.2" strokeDasharray="6 5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        <path className="gc-line" d={line(values)} clipPath={`url(#${id}c)`} fill="none" stroke="#00c073" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {at !== null && <line x1={x(at)} x2={x(at)} y1={0} y2={H} stroke="#00c073" strokeOpacity="0.4" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* Dots sit outside the stretched SVG so they stay round. */}
      {len > 1 && values[best] > 0 && at === null && (
        <span className="gc-peak" style={{ left: `${(x(best) / W) * 100}%`, top: y(values[best]) }} aria-hidden="true"><i /></span>
      )}
      {at !== null && (
        <>
          {compare && <span className="gc-dot gc-dot2" style={{ left: `${(x(at) / W) * 100}%`, top: y(compare[at] ?? 0) }} aria-hidden="true" />}
          <span className="gc-dot" style={{ left: `${(x(at) / W) * 100}%`, top: y(cur) }} aria-hidden="true" />
          <span className={`gc-card ${x(at) > W * 0.7 ? "r" : x(at) < W * 0.3 ? "l" : ""}`} style={{ left: `${(x(at) / W) * 100}%` }}>
            <small>{labels[at]}</small>
            <b>{rm(cur)}</b>
            {was !== null && <span>{compareName ?? t("before")} {rm(was)}{delta !== null && <em className={delta < 0 ? "dn" : "up"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%</em>}</span>}
          </span>
        </>
      )}
    </div>
  );
}
