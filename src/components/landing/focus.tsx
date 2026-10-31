"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { product } from "@/lib/mock";
import { Thumb } from "./bits";

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

/** The three things Rezekii is known for (owner, 31 Oct 2026), most wanted first. */
const FOCUS: { n: number; icon: IconName | "steth"; title: string; line: string; tint: string }[] = [
  { n: 1, icon: "scan", title: "Showcase Scanner", line: "More commission on the products you already sell. One scan of your whole showcase finds better rates, added in one tap.", tint: "#00c073" },
  { n: 2, icon: "spark", title: "AI Picks", line: "What to sell next, picked from your own sales: your niche, your price range, video or LIVE, and what earns most per post.", tint: "#6d5efc" },
  { n: 3, icon: "steth", title: "TikTok Shop Health Scanner", line: "A health screening for your showcase. Finds low-rated products and the videos that sold them, before they cause trouble.", tint: "#e14b3b" },
];

/**
 * Why Rezekii is different (owner, 31 Oct 2026): analytics made from her own account, turned into actions, and the three
 * features to remember. Added to the landing page; nothing else on it changes.
 */
export function CreatorFocus() {
  return (
    <div className="lp-focus">
      <div className="lp-focus-why">
        <p className="lp-focus-lead">
          Other tools show everyone the same charts and leave you to work them out. Rezekii reads <b>your own</b> TikTok Shop sales, videos and showcase, and
          turns them into actions you can tick off. Reading data is good. Acting on it is what grows your income.
        </p>
        <div className="lp-focus-vs" role="table" aria-label="Other tools and Rezekii">
          <div role="row" className="hd"><span role="columnheader">Other analytics tools</span><span role="columnheader">Rezekii</span></div>
          <div role="row"><span role="cell">The same charts for everyone</span><span role="cell"><Icon name="check" size={14} width={3} /> Made from your own account</span></div>
          <div role="row"><span role="cell">You work out what the numbers mean</span><span role="cell"><Icon name="check" size={14} width={3} /> Tells you what to do next, as a checklist</span></div>
          <div role="row"><span role="cell">Numbers from whenever they last updated</span><span role="cell"><Icon name="check" size={14} width={3} /> Up to date, read from TikTok when you open it</span></div>
        </div>
      </div>
      <ol className="lp-focus-list">
        {FOCUS.map((f) => (
          <li key={f.n} style={{ "--tint": f.tint } as React.CSSProperties}>
            <span className="lp-focus-ic">{f.icon === "steth" ? <Stethoscope /> : <Icon name={f.icon} size={22} />}</span>
            <span className="lp-focus-n">{f.n}</span>
            <h3>{f.title}</h3>
            <p>{f.line}</p>
          </li>
        ))}
      </ol>
      <p className="lp-focus-free"><Icon name="gift" size={16} /> Free during Beta. No minimum followers.</p>
    </div>
  );
}

/** A sample health report: the three levels and what to do with the worst ones. */
const REPORT_ROWS = [
  { key: "bad", label: "Heavily low", range: "under 3.0★", n: 2 },
  { key: "mid", label: "Low", range: "3.0–3.4★", n: 1 },
  { key: "low", label: "Slightly low", range: "3.5–3.9★", n: 3 },
  { key: "ok", label: "Healthy", range: "4.0★ and up", n: 1242 },
];
const REPORT_FIX = [product("p17"), product("p22")];

/**
 * TikTok Shop Health Scanner (owner, 31 Oct 2026: a health screening for big showcases, "get your own report, free today").
 * Every point is something the Risk Check really does.
 */
export function CreatorHealth() {
  return (
    <div className="lp-health">
      <div className="lp-health-copy">
        <span className="lp-health-badge"><Stethoscope size={16} /> TikTok Shop Health Scanner</span>
        <h2>Get Your Shop&apos;s Health Report</h2>
        <p>Hundreds of products in your showcase? Checking each one in TikTok Shop takes hours. Rezekii screens them all in seconds and shows what needs your attention.</p>
        <ul>
          <li><Icon name="scan" size={18} /><span><b>Full screening.</b> Every product in your showcase, up to 1,000.</span></li>
          <li><Icon name="star" size={18} /><span><b>Clear results.</b> Heavily low (under 3.0★), low (under 3.5★) and slightly low (under 4.0★), worst first.</span></li>
          <li><Icon name="check" size={18} /><span><b>Your call.</b> Remove one, a few or a whole level in one tap, or keep them.</span></li>
          <li><Icon name="video" size={18} /><span><b>Your videos too.</b> See which of your videos sold each low-rated product.</span></li>
          <li><Icon name="shield" size={18} /><span><b>Advice you can act on.</b> When to delete a video, and when to keep it for an appeal.</span></li>
        </ul>
        <div className="lp-health-cta">
          <Link href="/signin" className="np-btn lp-health-go">Get My Free Health Report</Link>
          <small>Free today during Beta. Sign up in about a minute.</small>
        </div>
      </div>

      <div className="lp-report" aria-label="Sample health report">
        <div className="lp-report-head">
          <span className="lp-report-ic"><Stethoscope size={20} /></span>
          <span><b>Health report</b><small>@yourshop · today</small></span>
          <em>Sample</em>
        </div>
        <div className="lp-report-pulse" aria-hidden="true">
          <svg viewBox="0 0 300 40" preserveAspectRatio="none"><path d="M0 20 H90 L102 6 L114 34 L126 12 L136 20 H300" /></svg>
        </div>
        <div className="lp-report-big"><b>1,248</b><span>products screened</span></div>
        <ul className="lp-report-rows">
          {REPORT_ROWS.map((r) => (
            <li key={r.key} className={r.key}>
              <i />
              <span>{r.label}<small>{r.range}</small></span>
              <b>{r.n.toLocaleString("en-MY")}</b>
            </li>
          ))}
        </ul>
        <div className="lp-report-fix">
          <span className="lbl">Needs attention</span>
          {REPORT_FIX.map((p) => (
            <div key={p.id} className="row">
              <Thumb src={p.img} size={34} />
              <span>{p.name}<small>★ {p.rating.toFixed(1)} · heavily low</small></span>
              <em className="rm">Remove</em>
              <em>Keep</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
