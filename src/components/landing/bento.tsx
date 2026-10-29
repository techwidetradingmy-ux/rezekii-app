"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AiMark, Tip } from "@/components/ui";
import { useLiveChildren, useOnScreen, useReducedMotion } from "./hooks";

export type Tile = {
  key: string;
  title: string;
  tip: string;
  icon: IconName;
  tint: string;
  /** wide = 2 columns, tall = 2 rows, big = 2 × 2 (desktop). */
  size?: "wide" | "tall" | "big";
  ai?: boolean;
  soon?: boolean;
  /** The body is its own card (the seller's live dashboard): no header on wide screens, a plain tile on phones. */
  bare?: boolean;
  body: React.ReactNode;
};

/**
 * "Everything in One App": on wide screens small live widgets, each the real feature in miniature (a tile plays only while it
 * is on screen; a soft glow follows the mouse). On phones a compact 3-column grid of icon tiles (owner, 29 Oct 2026: short page).
 */
export function Bento({ tiles, label }: { tiles: Tile[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLiveChildren(ref, ".lp-tile");
  const raf = useRef(0);
  const glow = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      ref.current?.querySelectorAll<HTMLElement>(".lp-tile").forEach((t) => {
        const r = t.getBoundingClientRect();
        t.style.setProperty("--mx", `${x - r.left}px`);
        t.style.setProperty("--my", `${y - r.top}px`);
      });
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <div ref={ref} className="lp-bento" role="list" aria-label={label} onPointerMove={glow}>
      {tiles.map((t) => (
        <article key={t.key} role="listitem" className={`lp-tile lp-live ${t.size ?? ""} ${t.bare ? "bare" : ""} ${t.soon ? "soon" : ""}`}>
          <header>
            <span className="lp-tico" style={{ background: t.tint }}><Icon name={t.icon} size={16} width={2.2} /></span>
            <h3>{t.title}</h3>
            {t.ai && <AiMark size={20} />}
            {t.soon && <span className="badge badge-amber">Soon</span>}
            <Tip text={t.tip} label={`About ${t.title}`} />
          </header>
          <div className="lp-tile-b">{t.body}</div>
        </article>
      ))}
    </div>
  );
}

/** Real AI video examples (muted). Plays only while on screen; the chips switch example. */
export function VideoTile({ clips }: { clips: { src: string; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const on = useOnScreen(ref, 0.4);
  const still = useReducedMotion();
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = vid.current;
    if (!el) return;
    if (on && !still) el.play().catch(() => {});
    else el.pause();
  }, [on, still, k]);
  const c = clips[k];
  return (
    <div ref={ref} className="lp-vid">
      <video
        ref={vid}
        key={c.src}
        src={`/ai-videos/${c.src}.mp4`}
        poster={`/ai-videos/${c.src}.jpg`}
        muted
        loop
        playsInline
        preload="none"
        aria-label={`Example AI video: ${c.label}`}
      />
      <div className="lp-vid-chips">
        {clips.map((x, i) => (
          <button key={x.src} type="button" className={i === k ? "on" : ""} aria-pressed={i === k} onClick={() => setK(i)}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}
