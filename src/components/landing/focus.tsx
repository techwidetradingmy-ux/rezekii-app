"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { AiMark, Count } from "@/components/ui";
import { PRODUCTS, product } from "@/lib/mock";
import { Flip, Ring, Thumb } from "./bits";
import { useOnScreen, useReducedMotion } from "./hooks";

/** A stethoscope: health screening, not a doctor (owner, 31 Oct 2026: "doctor" would overclaim). */
export function Stethoscope({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3v5a5 5 0 0 0 10 0V3" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="11" r="2" />
      <path d="M4 3h2M14 3h2" />
    </svg>
  );
}

const TODO = ["Add 3 better rates", "Film: stair climber", "Remove 2 low-rated"];
const DATA: [IconName, string][] = [["bag", "Sales"], ["video", "Videos"], ["store", "Showcase"]];

/**
 * Why Rezekii (owner, 31 Oct 2026: few words, show it, don't tell it). Her own data goes in, a to-do list comes out; tap
 * "Other tools" to see the usual chart with no answer. Then the three things to remember, each with its own small animation.
 */
export function CreatorFocus() {
  const box = useRef<HTMLDivElement>(null);
  const on = useOnScreen(box, 0.3);
  const still = useReducedMotion();
  const [mode, setMode] = useState<"rezekii" | "others">("rezekii");
  const [touched, setTouched] = useState(false);
  // Flips between the two by itself until she taps.
  useEffect(() => {
    if (!on || touched || still) return;
    const t = window.setInterval(() => setMode((m) => (m === "rezekii" ? "others" : "rezekii")), 3600);
    return () => window.clearInterval(t);
  }, [on, touched, still]);
  const pick = (m: "rezekii" | "others") => { setTouched(true); setMode(m); };

  return (
    <div className="lp-focus" ref={box} data-on={on ? "" : undefined}>
      <div className="lp-flow" aria-label="Your data in, a to-do list out">
        <div className="lp-flow-in">
          {DATA.map(([icon, label], i) => (
            <span key={label} style={{ animationDelay: `${i * 0.3}s` }}><Icon name={icon} size={16} /> {label}</span>
          ))}
        </div>
        <div className="lp-flow-ai" aria-hidden="true"><i /><AiMark size={30} /><i /></div>
        <div className="lp-flow-out">
          <div className="lp-flow-tabs" role="tablist" aria-label="Compare">
            <button type="button" role="tab" aria-selected={mode === "others"} onClick={() => pick("others")}>Other tools</button>
            <button type="button" role="tab" aria-selected={mode === "rezekii"} onClick={() => pick("rezekii")}>Rezekii</button>
          </div>
          {mode === "rezekii" ? (
            <ul className="lp-flow-todo" key="r">
              {TODO.map((t, i) => (
                <li key={t} style={{ animationDelay: `${i * 0.25}s` }}><span className="tick"><Icon name="check" size={13} width={3.2} /></span>{t}</li>
              ))}
            </ul>
          ) : (
            <div className="lp-flow-chart" key="o" aria-label="A chart, and no answer">
              {[40, 72, 55, 88, 63, 95].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }} />)}
              <em>Now what?</em>
            </div>
          )}
          <small>{mode === "rezekii" ? "Made from your account" : "Same charts for everyone"}</small>
        </div>
      </div>

      <ol className="lp-top3">
        <li style={{ "--tint": "#00c073" } as React.CSSProperties}>
          <span className="n">1</span>
          <span className="vis"><Flip was={9} now={10} /></span>
          <b>Showcase Scanner</b>
          <small>More commission, same products</small>
        </li>
        <li style={{ "--tint": "#6d5efc" } as React.CSSProperties}>
          <span className="n">2</span>
          <span className="vis"><Ring from={0} to={0.96} size={58}><b className="lp-top3-pct">96%</b></Ring></span>
          <b>AI Picks</b>
          <small>What to sell next</small>
        </li>
        <li style={{ "--tint": "#e14b3b" } as React.CSSProperties}>
          <a href="#health" aria-label="See the TikTok Shop Health Scanner" />
          <span className="n">3</span>
          <span className="vis lp-top3-pulse">
            <svg viewBox="0 0 120 36" aria-hidden="true"><path d="M0 18 H40 L48 6 L56 30 L64 12 L70 18 H120" /></svg>
            <em>★ 2.8</em>
          </span>
          <b>Health Scanner</b>
          <small>Spot risky products</small>
        </li>
      </ol>
      <p className="lp-focus-free"><Icon name="gift" size={15} /> Free during Beta</p>
    </div>
  );
}

/** The sample report: the products that need attention, and the counts by level. */
const FIX = [product("p17"), product("p22")];
const THUMBS = PRODUCTS.slice(0, 18);

/**
 * TikTok Shop Health Scanner (owner, 31 Oct 2026): "get your own report, free today", shown more than told. The report scans
 * when it comes on screen; tap Remove to see a product leave, or Scan again.
 */
export function CreatorHealth() {
  const box = useRef<HTMLDivElement>(null);
  const on = useOnScreen(box, 0.25);
  const still = useReducedMotion();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState<string[]>([]);
  useEffect(() => {
    if (!on) return;
    setDone(false);
    const t = window.setTimeout(() => setDone(true), still ? 0 : 1800);
    return () => window.clearTimeout(t);
  }, [on, run, still]);
  const heavy = FIX.filter((p) => !gone.includes(p.id));
  const again = () => { setGone([]); setRun((r) => r + 1); };

  return (
    <div className="lp-hs" ref={box}>
      <div className="lp-hs-copy">
        <span className="lp-hs-badge"><Stethoscope size={16} /> TikTok Shop Health Scanner</span>
        <h2>Get Your Shop&apos;s Health Report</h2>
        <p>Every product. Checked in seconds.</p>
        <ul className="lp-hs-chips">
          <li><Icon name="scan" size={16} /> Up to 1,000 products</li>
          <li><Icon name="star" size={16} /> 3 risk levels</li>
          <li><Icon name="x" size={16} /> Remove in 1 tap</li>
          <li><Icon name="video" size={16} /> Find the videos</li>
        </ul>
        <div className="lp-hs-cta">
          <Link href="/signin" className="np-btn lp-hs-go">Get My Free Report</Link>
          <small>Free during Beta</small>
        </div>
      </div>

      <div className={`lp-rep${done ? " done" : ""}`} aria-label="Sample health report" key={run}>
        <div className="lp-rep-head">
          <span className="ic"><Stethoscope size={20} /></span>
          <span><b>Health report</b><small>@yourshop</small></span>
          <em>Sample</em>
        </div>
        <div className="lp-rep-scan" aria-hidden="true">
          {THUMBS.map((p, i) => <img key={i} src={p.img} alt="" className={done && (p.id === "p17" || p.id === "p22") && !gone.includes(p.id) ? "bad" : done && p.rating < 4 ? "low" : undefined} />)}
          {!done && <span className="beam" />}
        </div>
        <div className="lp-rep-big"><b>{on ? <Count key={run} value={1248} ms={1600} /> : "0"}</b><span>{done ? "products checked" : "checking…"}</span></div>
        <ul className="lp-rep-bars">
          {[
            ["bad", "Heavily low", heavy.length, 2],
            ["mid", "Low", 1, 1],
            ["low", "Slightly low", 3, 3],
          ].map(([k, label, n, w]) => (
            <li key={k as string} className={k as string}>
              <span>{label}</span>
              <i style={{ width: done ? `${(Number(w) / 3) * 100}%` : "0%" }} />
              <b>{done ? n : "…"}</b>
            </li>
          ))}
        </ul>
        {done && (
          heavy.length ? (
            <div className="lp-rep-fix">
              {heavy.map((p) => (
                <div key={p.id} className="row">
                  <Thumb src={p.img} size={32} />
                  <span>{p.name}<small>★ {p.rating.toFixed(1)}</small></span>
                  <button type="button" onClick={() => setGone((g) => [...g, p.id])}>Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="lp-rep-clear"><Icon name="check" size={16} width={3} /> All clear <button type="button" onClick={again}>Scan again</button></div>
          )
        )}
      </div>
    </div>
  );
}
