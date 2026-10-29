"use client";

import { useEffect, useRef, useState } from "react";
import { useOnScreen, useReducedMotion } from "./hooks";
import { AiText } from "./ai-text";

export type CompareRow = { label: string; without: string; with: string };

/**
 * Without Rezekii vs With Rezekii (owner, 29 Oct 2026: show the difference, not our own results). Phones: one column that
 * flips between Without and With by itself until touched. Wider screens: both side by side. Feature facts and real product
 * rates only, no outcome claims.
 */
export function Compare({ rows, note }: { rows: CompareRow[]; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.4);
  const still = useReducedMotion();
  const [side, setSide] = useState<"without" | "with">("with");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!on || still || touched) return;
    const t = window.setTimeout(() => setSide((s) => (s === "with" ? "without" : "with")), side === "with" ? 4200 : 2600);
    return () => window.clearTimeout(t);
  }, [on, still, touched, side]);
  const pick = (s: "without" | "with") => { setSide(s); setTouched(true); };
  return (
    <div ref={ref} className="lp-cmp" data-side={side}>
      <div className="lp-cmp-seg" role="group" aria-label="Compare">
        <i aria-hidden="true" />
        <button type="button" aria-pressed={side === "without"} onClick={() => pick("without")}>Without Rezekii</button>
        <button type="button" aria-pressed={side === "with"} onClick={() => pick("with")}>With Rezekii</button>
      </div>
      <div className="lp-cmp-cols" aria-hidden="true"><span /><span>Without Rezekii</span><span>With Rezekii</span></div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.label} style={{ "--i": i } as React.CSSProperties}>
            <b>{r.label}</b>
            <span className="wo"><span className="lp-sr">Without Rezekii: </span>{r.without}</span>
            <span className="wi"><span className="lp-sr">With Rezekii: </span><span><AiText text={r.with} /></span></span>
          </li>
        ))}
      </ul>
      {note && <p className="hm-fine">{note}</p>}
    </div>
  );
}
