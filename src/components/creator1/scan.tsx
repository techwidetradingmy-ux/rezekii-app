"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { PRODUCTS, RAISES, product } from "@/lib/mock";
import { useT } from "@/lib/i18n/client";

/** A translated line whose {placeholders} are React elements (the climbing count). */
const fillEl = (line: string, els: Record<string, React.ReactNode>) => line.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{els[s]}</Fragment> : s));

/** Width of one product tile in the strip (88px image + 12px gap, from .v2-scan-track). */
const ITEM = 100;
const MATCH = new Set(RAISES.map((r) => r.productId));
/** When each match shows up in the list, as a share of the scan. */
const AT = [0.12, 0.27, 0.43, 0.58, 0.74, 0.9];

/**
 * The signature scan: product photos stream past a glowing line, matches light up as they cross it, the counter climbs to
 * the showcase size and the better rates appear one by one. `hero` loops on the landing page; `inline` runs once.
 */
export function ScanAnim({ total = 1248, ms = 5600, loop = false, speed = 95, variant = "inline", onDone }: {
  total?: number; ms?: number; loop?: boolean; speed?: number; variant?: "hero" | "inline"; onDone?: () => void;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  const [count, setCount] = useState(0);
  const [found, setFound] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const strip = track.current;
    const frame = box.current;
    if (!strip || !frame) return;
    const imgs = Array.from(strip.querySelectorAll<HTMLImageElement>("img"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      imgs.forEach((img) => MATCH.has(img.dataset.p ?? "") && img.classList.add("hit"));
      setCount(total);
      setFound(AT.length);
      setFinished(true);
      done.current?.();
      return;
    }
    const half = PRODUCTS.length * ITEM;
    let t0 = performance.now();
    let holdUntil = 0;
    let over = false;
    let last = -1;
    let lastFound = -1;
    let raf = 0;
    const tick = (t: number) => {
      // The strip never stops; matches are lit from the moment they reach the line until they leave on the left.
      const x = ((t * speed) / 1000) % half;
      strip.style.transform = `translateX(${-x}px)`;
      const mid = frame.clientWidth / 2;
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        if (!MATCH.has(img.dataset.p ?? "")) continue;
        const c = i * ITEM + 44 - x;
        const lit = c <= mid + 40 && c > -ITEM;
        if (lit !== img.classList.contains("hit")) img.classList.toggle("hit", lit);
      }
      if (over) {
        if (loop && t > holdUntil) {
          over = false;
          t0 = t;
          setFinished(false);
          setCount(0);
          setFound(0);
          last = 0;
          lastFound = 0;
        }
      } else {
        const p = Math.min(1, (t - t0) / ms);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const n = Math.round(total * eased);
        if (n !== last && (Math.abs(n - last) >= 6 || p === 1)) {
          last = n;
          setCount(n);
        }
        const f = AT.filter((a) => p >= a).length;
        if (f !== lastFound) {
          lastFound = f;
          setFound(f);
        }
        if (p === 1) {
          over = true;
          holdUntil = t + 2800;
          setFinished(true);
          done.current?.();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A one-off scan always finishes on time, even if the tab stops painting frames (background tab, hidden window).
    const fallback = loop
      ? 0
      : window.setTimeout(() => {
          if (over) return;
          over = true;
          setCount(total);
          setFound(AT.length);
          setFinished(true);
          done.current?.();
        }, ms + 400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [total, ms, loop, speed]);

  const strip = (
    <div className="v2-scan cr1-scan" ref={box} aria-hidden="true">
      <div className="v2-scan-track" ref={track} style={{ animation: "none" }}>
        {[...PRODUCTS, ...PRODUCTS].map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} data-p={p.id} src={p.img} alt="" />
        ))}
      </div>
      <span className="v2-scan-line" />
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="cr1-scanbox" role="status" aria-live="polite">
        {strip}
        <div className="cr1-counter">
          <span>{fillEl(t("Checked {n} of {total}"), { n: <b className="v2-num">{count.toLocaleString("en-MY")}</b>, total: total.toLocaleString("en-MY") })}</span>
          <span className="badge">{found === 1 ? t("{n} better rate so far", { n: found }) : t("{n} better rates so far", { n: found })}</span>
        </div>
        <div className="v2-prog"><i style={{ width: `${(count / total) * 100}%`, animation: "none", transition: "width 0.2s linear" }} /></div>
      </div>
    );
  }

  return (
    <div className="cr1-scancard" aria-label={t("Example: a showcase scan")}>
      <div className="cr1-scanhead">
        <span className="v2-av">AR</span>
        <span>
          <b>{t("Scanning {handle}", { handle: "@aisyah.glow" })}</b>
          <small>{t("TikTok Shop showcase")}</small>
        </span>
        <span className={`cr1-live ${finished ? "off" : ""}`}><i />{finished ? t("Done") : t("Live")}</span>
      </div>
      {strip}
      <div className="cr1-counter big">
        <span>{fillEl(t("Checked {n} products"), { n: <b className="v2-num">{count.toLocaleString("en-MY")}</b> })}</span>
      </div>
      <ul className="cr1-found">
        {RAISES.slice(0, 4).map((r, i) => {
          const p = product(r.productId);
          return (
            <li key={r.id} className={i < found ? "on" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" />
              <span>{p.name}</span>
              <em><s>{r.nowRate === null ? "?" : `${r.nowRate}%`}</s>{r.tapRate}%</em>
            </li>
          );
        })}
      </ul>
      <div className="cr1-scanfoot">
        <span className={`cr1-foundn ${found > 0 ? "on" : ""}`}><Icon name="spark" size={16} /> {found === 1 ? t("{n} better rate found", { n: found }) : t("{n} better rates found", { n: found })}</span>
        <small>{t("Rates for Silver · example")}</small>
      </div>
    </div>
  );
}
