"use client";

import "@/app/seller.css";
import { DIAL_OPTIONS } from "@/lib/countries";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import { COUNTRIES, TERMS, TERMS_VERSION, tidyPhone } from "@/lib/mock-seller";
import type { Country } from "@/lib/countries";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, type Lang } from "@/lib/i18n/lang";

/**
 * A translated line with bold parts: `<b>…</b>` in the word list shows as bold, so each sentence stays whole in every language.
 * `b` styles the bold parts.
 */
export function Rich({ text, b }: { text: string; b?: React.CSSProperties }) {
  return <>{text.split(/<b>(.*?)<\/b>/g).map((part, i) => (i % 2 ? <b key={i} style={b}>{part}</b> : part))}</>;
}

/** A country's name in her language (Malaysia, 马来西亚). */
const countryIn = (c: Country | undefined, lang: Lang) => {
  if (!c) return "";
  try { return new Intl.DisplayNames([dateLocale(lang)], { type: "region" }).of(c.code) ?? c.name; } catch { return c.name; }
};

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

/**
 * Shown when the Seller Center connection has expired (the preview strip's "Show as not linked"). Signed in, `shop` says
 * whether this account has a Seller Center shop authorized, and Connect goes to Seller Center (owner, 30 Oct 2026).
 */
export function ConnBanner({ shop }: { shop?: boolean } = {}) {
  const t = useT();
  const { linked, setLinked, toast } = useDemo();
  if (shop !== undefined) {
    if (shop) return null;
    return (
      <div className="v2-alert red">
        <span>{t("Seller Center not connected. Connect it to see your products.")}</span>
        <button type="button" onClick={() => { window.location.href = "/api/auth/tiktokshop/start?as=seller"; }}>{t("Connect")}</button>
      </div>
    );
  }
  if (linked) return null;
  return (
    <div className="v2-alert red">
      <span>{t("Seller Center disconnected. Data stops updating until you reconnect.")}</span>
      <button type="button" onClick={() => { setLinked(true); toast(t("Seller Center reconnected")); }}>{t("Reconnect")}</button>
    </div>
  );
}

/** The sample allocation terms in full. */
export function TermsSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Sheet title={t("Sample Allocation Terms")} onClose={onClose}>
      <p className="v2-small" style={{ margin: 0 }}>{t("{version} · For every sample in Techwide's TAP, here or in Seller Center.", { version: t(TERMS_VERSION) })}</p>
      <ol className="sl-list" style={{ counterReset: "t" }}>
        {TERMS.map(([h, line], i) => (
          <li key={h}>
            <span className="badge" style={{ minWidth: 26, justifyContent: "center", alignSelf: "flex-start" }}>{i + 1}</span>
            <span><b style={{ color: "var(--text)" }}>{t(h)}.</b> {t(line)}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="np-btn" onClick={onClose}>{t("Done")}</button>
    </Sheet>
  );
}

/** Custom service: tell the team what you need, they reply with a plan and a quote. No prices on the platform. */
export function ContactSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
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
    <Sheet title={t("Talk to Our Team")} onClose={onClose}>
      <p className="v2-muted" style={{ margin: 0, lineHeight: 1.5 }}>{t("Tell us what you need. We reply within 1 working day with a quote.")}</p>
      <div className="v2-field">{t("What do you need?")}
        <div className="v2-chips">
          {NEEDS.map((n) => (
            <button key={n} type="button" className={`v2-chip ${need === n ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setNeed(n)}>{t(n)}</button>
          ))}
        </div>
      </div>
      <label className="v2-field">{t("Your name")}
        <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. {name}", { name: "Mei Ling Tan" })} autoComplete="name" />
      </label>
      <PhoneField dial={phone.dial} raw={phone.raw} onChange={(dial, raw) => setPhone({ dial, raw })} showError={tried} label={t("WhatsApp number")} />
      <label className="v2-field">{t("Anything else?")} <small>{t("Optional")}</small>
        <textarea className="np-input" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t("Products, timing, budget range…")} />
      </label>
      {tried && !ok && <p className="sl-err"><Icon name="alert" size={16} /> {t("Add your name and a phone number we can reach.")}</p>}
      <button type="button" className="np-btn" onClick={() => { setTried(true); if (!ok) return; toast(t("Sent · we'll WhatsApp you within 1 working day")); onClose(); }}>{t("Send")}</button>
    </Sheet>
  );
}

/** Country code + number. Malaysian numbers are checked and tidied to +60 1x-xxx xxxx. */
export function PhoneField({ dial, raw, onChange, showError, label }: { dial: string; raw: string; onChange: (dial: string, raw: string) => void; showError?: boolean; label?: string }) {
  const t = useT();
  const lang = useLang();
  const [blurred, setBlurred] = useState(false);
  const res = tidyPhone(raw, dial);
  const err = (showError || (blurred && raw)) && !res.ok ? res.error : null;
  return (
    <div className="v2-field">
      {label ?? t("Phone number")}
      <div className="sl-phone">
        <select aria-label={t("Country code")} value={dial} onChange={(e) => onChange(e.target.value, raw)}>
          {DIAL_OPTIONS.map((o) => (
            <option key={o.dial} value={o.dial}>{o.label}</option>
          ))}
        </select>
        <input className="np-input" inputMode="tel" autoComplete="tel-national" value={raw} placeholder={dial === "60" ? "12-345 6789" : t("Number")} onChange={(e) => onChange(dial, e.target.value)} onBlur={() => setBlurred(true)} aria-invalid={!!err} />
      </div>
      {res.ok ? <p className="sl-ok"><Icon name="check" size={16} width={2.6} /> {t("We'll save it as {number}", { number: res.pretty })}</p> : err ? <p className="sl-err"><Icon name="alert" size={16} /> {t(err)}</p> : <small>{dial === "60" ? t("With or without the 0 or +60") : t("Any {country} number.", { country: countryIn(COUNTRIES.find((c) => c.dial === dial), lang) })}</small>}
    </div>
  );
}

/** One bar per video posted, never fewer than the 1 promised (owner, 29 Oct 2026: 1 sample = at least 1 video). */
export function Pips({ n, promised = 1 }: { n: number; promised?: number }) {
  const t = useT();
  return (
    <span className="sl-pips" aria-label={n === 1 ? t("{n} video posted, {promised} promised", { n, promised }) : t("{n} videos posted, {promised} promised", { n, promised })}>
      {Array.from({ length: Math.max(n, promised) }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}
    </span>
  );
}

/** Platform tile for Facebook / Instagram / Threads. */
export function Plat({ p, sm }: { p: "Facebook" | "Instagram" | "Threads"; sm?: boolean }) {
  return <span className={`sl-plat ${p} ${sm ? "sm" : ""}`} aria-label={p}>{p === "Facebook" ? "f" : p === "Instagram" ? "ig" : "@"}</span>;
}

/** "Data from TikTok · updated …" line; `when` comes in her language ("today 09:12" in the sample). */
export function Source({ when }: { when?: string }) {
  const t = useT();
  return (
    <span className="sl-fine"><Icon name="refresh" size={14} /> {t("Data from TikTok · updated {when}", { when: when ?? t("today {time}", { time: "09:12" }) })}</span>
  );
}
