"use client";

import "@/app/seller.css";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import { COUNTRIES, TERMS, TERMS_VERSION, tidyPhone } from "@/lib/mock-seller";

/** Colourful initials avatar; the colour is picked from the name so it stays the same everywhere. */
const AV = ["linear-gradient(135deg,#22dc95,#00a862)", "linear-gradient(135deg,#7aa2ff,#1d4ed8)", "linear-gradient(135deg,#ffb35c,#f08a00)", "linear-gradient(135deg,#ff7aa8,#e8005a)", "linear-gradient(135deg,#b28dff,#6d28d9)", "linear-gradient(135deg,#5ee7df,#0e9488)"];
export function Ava({ name, lg }: { name: string; lg?: boolean }) {
  const clean = name.replace(/^@/, "");
  const parts = clean.split(/[.\s_]+/).filter(Boolean);
  const ini = (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)) || "?";
  const bg = AV[[...clean].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  return <span className={`sl-ava ${lg ? "lg" : ""}`} style={{ background: bg }} aria-hidden="true">{ini}</span>;
}

/** Counts up the first time it scrolls into view (for numbers lower down a page). */
export function InViewCount({ value, format = (n: number) => Math.round(n).toLocaleString("en-MY"), ms = 1400 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        setN(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, ms]);
  return <span ref={ref} className="v2-num">{format(n)}</span>;
}

/** Shown when the Seller Center connection has expired (the preview strip's "Show as not linked"). */
export function ConnBanner() {
  const { linked, setLinked, toast } = useDemo();
  if (linked) return null;
  return (
    <div className="v2-alert red">
      <span>Seller Center disconnected. Data stops updating until you reconnect.</span>
      <button type="button" onClick={() => { setLinked(true); toast("Seller Center reconnected"); }}>Reconnect</button>
    </div>
  );
}

/** The sample allocation terms in full. */
export function TermsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Sample Allocation Terms" onClose={onClose}>
      <p className="v2-small" style={{ margin: 0 }}>{TERMS_VERSION} · For every sample in Techwide&apos;s TAP, here or in Seller Center.</p>
      <ol className="sl-list" style={{ counterReset: "t" }}>
        {TERMS.map(([h, line], i) => (
          <li key={h}>
            <span className="badge" style={{ minWidth: 26, justifyContent: "center", alignSelf: "flex-start" }}>{i + 1}</span>
            <span><b style={{ color: "var(--text)" }}>{h}.</b> {line}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}

/** Custom service: tell the team what you need, they reply with a plan and a quote. No prices on the platform. */
export function ContactSheet({ onClose }: { onClose: () => void }) {
  const { toast } = useDemo();
  const NEEDS = ["Find creators for a launch", "Run everything for me", "Paid content with creators", "Something else"];
  const [need, setNeed] = useState(NEEDS[1]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState({ dial: "60", raw: "" });
  const [tried, setTried] = useState(false);
  const ph = tidyPhone(phone.raw, phone.dial);
  const ok = name.trim().length > 1 && ph.ok;
  return (
    <Sheet title="Talk to Our Team" onClose={onClose}>
      <p className="v2-muted" style={{ margin: 0, lineHeight: 1.5 }}>Tell us what you need. We reply within 1 working day with a quote.</p>
      <div className="v2-field">What do you need?
        <div className="v2-chips">
          {NEEDS.map((n) => (
            <button key={n} type="button" className={`v2-chip ${need === n ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setNeed(n)}>{n}</button>
          ))}
        </div>
      </div>
      <label className="v2-field">Your name
        <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mei Ling Tan" autoComplete="name" />
      </label>
      <PhoneField dial={phone.dial} raw={phone.raw} onChange={(dial, raw) => setPhone({ dial, raw })} showError={tried} label="WhatsApp number" />
      <label className="v2-field">Anything else? <small>Optional</small>
        <textarea className="np-input" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Products, timing, budget range…" />
      </label>
      {tried && !ok && <p className="sl-err"><Icon name="alert" size={16} /> Add your name and a phone number we can reach.</p>}
      <button type="button" className="np-btn" onClick={() => { setTried(true); if (!ok) return; toast("Sent · we'll WhatsApp you within 1 working day"); onClose(); }}>Send</button>
    </Sheet>
  );
}

/** Country code + number. Malaysian numbers are checked and tidied to +60 1x-xxx xxxx. */
export function PhoneField({ dial, raw, onChange, showError, label = "Phone number" }: { dial: string; raw: string; onChange: (dial: string, raw: string) => void; showError?: boolean; label?: string }) {
  const [blurred, setBlurred] = useState(false);
  const res = tidyPhone(raw, dial);
  const err = (showError || (blurred && raw)) && !res.ok ? res.error : null;
  return (
    <div className="v2-field">
      {label}
      <div className="sl-phone">
        <select aria-label="Country code" value={dial} onChange={(e) => onChange(e.target.value, raw)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>{c.code} +{c.dial}</option>
          ))}
        </select>
        <input className="np-input" inputMode="tel" autoComplete="tel-national" value={raw} placeholder={dial === "60" ? "12-345 6789" : "Number"} onChange={(e) => onChange(dial, e.target.value)} onBlur={() => setBlurred(true)} aria-invalid={!!err} />
      </div>
      {res.ok ? <p className="sl-ok"><Icon name="check" size={16} width={2.6} /> We&apos;ll save it as {res.pretty}</p> : err ? <p className="sl-err"><Icon name="alert" size={16} /> {err}</p> : <small>{dial === "60" ? "With or without the 0 or +60" : `Any ${COUNTRIES.find((c) => c.dial === dial)?.name ?? ""} number.`}</small>}
    </div>
  );
}

/** Three little bars for x / 3 videos. */
export function Pips({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="sl-pips" aria-label={`${n} of ${of} videos`}>
      {Array.from({ length: of }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}
    </span>
  );
}

/** Platform tile for Facebook / Instagram / Threads. */
export function Plat({ p, sm }: { p: "Facebook" | "Instagram" | "Threads"; sm?: boolean }) {
  return <span className={`sl-plat ${p} ${sm ? "sm" : ""}`} aria-label={p}>{p === "Facebook" ? "f" : p === "Instagram" ? "ig" : "@"}</span>;
}

/** "Data from TikTok · updated …" line. */
export function Source({ text = "Data from TikTok", when = "today 09:12" }: { text?: string; when?: string }) {
  return (
    <span className="sl-fine"><Icon name="refresh" size={14} /> {text} · updated {when}</span>
  );
}
