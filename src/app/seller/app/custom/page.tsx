"use client";

import "@/app/seller.css";
import "@/app/custom-service.css";
import Image from "next/image";
import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { PhoneField, Rich } from "@/components/seller/seller-ui";
import { SELLER } from "@/lib/mock";
import { tidyPhone } from "@/lib/mock-seller";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** Techwide's WhatsApp for sellers who'd rather just chat (owner, 29 Oct 2026): +60 11-7019 3374. */
const TECHWIDE_WA = "601170193374";
/** The WhatsApp chat, with her first message (in her language) already typed. */
const waLink = (text: string) => `https://wa.me/${TECHWIDE_WA}?text=${encodeURIComponent(text)}`;

// Kept in English (they're saved on the request); shown in her language.
const SERVICES: [IconName, string, string][] = [
  ["kanban", tx("Full TAP Campaign Management"), tx("We submit your products, set commission and follow up creators.")],
  ["users", tx("Creator Matching & Outreach"), tx("We find creators from our Community Wish List.")],
  ["box", tx("Free Sample Management"), tx("We approve requests, track parcels and chase the videos.")],
  ["star", tx("Paid Reviews & UGC with Ad Rights"), tx("Creator reviews you can run as Spark Ads, with the ad codes.")],
  ["video", tx("LIVE Sessions with Our Creators"), tx("Our creators sell your products live on TikTok.")],
  ["flame", tx("Mega Sale Pushes"), tx("More creators and LIVEs for 9.9, 11.11, 12.12 and Raya.")],
  ["edit", tx("Content Production"), tx("Scripts, product shoots and AI video.")],
  ["bag", tx("Shop Setup & Listing Optimisation"), tx("Set up your shop and fix titles, photos and prices.")],
  ["trend", tx("Ads Boosting"), tx("Boost your best videos with Spark Ads or GMV Max.")],
  ["chart", tx("Monthly Reports & Strategy Call"), tx("A report every month and a call to plan what's next.")],
];
const BUDGETS = [tx("Under RM 1,000"), "RM 1,000–3,000", "RM 3,000–10,000", "RM 10,000+"];

/**
 * Custom Service (owner, 29 Oct 2026): what Techwide, a TikTok Shop Partner, can run for a seller, plus a request form.
 * A request lands in admin Business › Custom Service (CUSTOM in mock-admin): services → "want", budget → "budget", goal → "detail".
 * No prices here; the team replies on WhatsApp with a plan and a quote.
 */
export default function CustomServicePage() {
  const t = useT();
  const { toast, live, me } = useDemo();
  const [busy, setBusy] = useState(false);
  const shopName = live ? me?.sellerShop ?? t("my shop") : SELLER.shop;
  const wa = waLink(t("Hi Techwide, I'm from {shop}. I'd like to know more about your Custom Service.", { shop: shopName }));
  const formRef = useRef<HTMLElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  // SELLER has no WhatsApp number in the sample data yet, so this starts empty.
  const [phone, setPhone] = useState({ dial: "60", raw: "" });
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const ph = tidyPhone(phone.raw, phone.dial);
  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const done = () => {
    setSent(true);
    toast(t("Request sent · we'll WhatsApp you within 1 working day"));
    formRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const submit = () => {
    setTried(true);
    if (!picked.length || !ph.ok) return;
    if (!live) return done();
    // Signed in (owner, 31 Oct 2026): the request is saved for our team.
    setBusy(true);
    fetch("/api/v2/seller/custom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ services: picked, budget, goal, whatsapp: ph.pretty }) })
      .then(async (r) => (r.ok ? done() : toast(((await r.json().catch(() => ({}))) as { error?: string }).error ?? t("Didn't send. Please try again."))))
      .catch(() => toast(t("Didn't send. Please try again.")))
      .finally(() => setBusy(false));
  };
  const reset = () => { setPicked([]); setBudget(null); setGoal(""); setTried(false); setSent(false); };

  return (
    <div className="v2-stack v2-in cs" style={{ gap: 18 }}>
      <Title title={t("Custom Service")} sub={t("Techwide is a TikTok Shop Partner. Our team can run creators, samples, content and ads for you. Tell us what you need and we'll reply with a plan and a quote.")} />

      <section className="cs-hero">
        <span className="cs-partner"><Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={103} height={30} /></span>
        <h2>{t("Let Our Team Run It for You")}</h2>
        <p>{t("Pick the services you want. We WhatsApp you within 1 working day with a plan and a quote. You see every result here in Rezekii.")}</p>
        <span className="cs-hero-acts">
          <a href="#request" className="cs-jump">{t("Send a Request")} <Icon name="arrow" size={16} /></a>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="cs-jump cs-wa"><Icon name="whatsapp" size={16} /> {t("Chat on WhatsApp")}</a>
        </span>
      </section>

      <div className="cs-layout">
        <section className="cs-grid" aria-label={t("Services")}>
          {SERVICES.map(([icon, svc, line]) => {
            const on = picked.includes(svc);
            return (
              <button key={svc} type="button" className={`cs-svc ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggle(svc)}>
                <span className="cs-ico"><Icon name={icon} size={20} /></span>
                <span className="cs-txt"><b>{t(svc)}</b><small>{t(line)}</small></span>
                <span className="cs-tick" aria-hidden="true"><Icon name={on ? "check" : "plus"} size={14} width={2.6} /></span>
              </button>
            );
          })}
        </section>

        <section ref={formRef} id="request" className="v2-card cs-form">
          {sent ? (
            <div className="cs-sent">
              <span className="cs-sent-ico"><Icon name="check" size={26} width={2.6} /></span>
              <h2 className="v2-h2">{t("Request Sent")}</h2>
              <p className="v2-muted" style={{ margin: 0 }}><Rich b={{ whiteSpace: "nowrap" }} text={t("We'll WhatsApp you within 1 working day on <b>{number}</b>.", { number: ph.pretty })} /></p>
              <dl className="cs-sum">
                <div><dt>{t("Shop")}</dt><dd>{SELLER.shop}</dd></div>
                <div><dt>{t("Services")}</dt><dd>{picked.map((s) => t(s)).join(", ")}</dd></div>
                <div><dt>{t("Monthly budget")}</dt><dd>{budget ? t(budget) : t("Not sure yet")}</dd></div>
                {goal.trim() && <div><dt>{t("Goal")}</dt><dd>{goal.trim()}</dd></div>}
              </dl>
              <button type="button" className="v2-link" onClick={reset}>{t("Send Another Request")}</button>
            </div>
          ) : (
            <>
              <h2 className="v2-h2">{t("Request a Quote")}</h2>
              <div className="v2-field">{t("What do you need?")} <small>{t("Pick one or more")}</small>
                <div className="v2-chips">
                  {SERVICES.map(([, svc]) => (
                    <button key={svc} type="button" className={`v2-chip ${picked.includes(svc) ? "on" : ""}`} aria-pressed={picked.includes(svc)} onClick={() => toggle(svc)}>{t(svc)}</button>
                  ))}
                </div>
              </div>
              <div className="v2-field">{t("Monthly budget")} <small>{t("Optional")}</small>
                <div className="v2-chips">
                  {BUDGETS.map((b) => (
                    <button key={b} type="button" className={`v2-chip ${budget === b ? "on" : ""}`} aria-pressed={budget === b} onClick={() => setBudget(budget === b ? null : b)}>{t(b)}</button>
                  ))}
                </div>
              </div>
              <label className="v2-field">{t("Your goal")} <small>{t("Optional")}</small>
                <input className="np-input" value={goal} maxLength={120} onChange={(e) => setGoal(e.target.value)} placeholder={t("e.g. 500 orders a month by 11.11")} />
              </label>
              <PhoneField dial={phone.dial} raw={phone.raw} onChange={(dial, raw) => setPhone({ dial, raw })} showError={tried} label={t("WhatsApp number")} />
              {tried && !picked.length && <p className="sl-err"><Icon name="alert" size={16} /> {t("Pick at least 1 service.")}</p>}
              <button type="button" className="np-btn" disabled={busy} onClick={submit}>{busy ? <span className="sl-spin" /> : <>{t("Send Request")} <Icon name="send" size={17} /></>}</button>
              <small className="v2-small">
                {/* One whole sentence; the WhatsApp link sits where {link} is. */}
                {t("No payment now. We quote first. Prefer to chat? {link}.").split(/(\{link\})/).map((part, i) =>
                  part === "{link}" ? <a key={i} href={wa} target="_blank" rel="noopener noreferrer" className="v2-link">{t("WhatsApp Us")}</a> : part)}
              </small>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
