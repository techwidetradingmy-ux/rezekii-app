"use client";

import "@/app/seller.css";
import "@/app/custom-service.css";
import Image from "next/image";
import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { PhoneField } from "@/components/seller/seller-ui";
import { SELLER } from "@/lib/mock";
import { tidyPhone } from "@/lib/mock-seller";

const SERVICES: [IconName, string, string][] = [
  ["kanban", "Full TAP Campaign Management", "We submit your products, set commission and follow up creators."],
  ["users", "Creator Matching & Outreach", "We find creators from our Wish List and Most Wanted demand."],
  ["box", "Free Sample Management", "We approve requests, track parcels and chase the videos."],
  ["star", "Paid Reviews & UGC with Ad Rights", "Creator reviews you can run as Spark Ads, with the ad codes."],
  ["video", "LIVE Sessions with Our Creators", "Our creators sell your products live on TikTok."],
  ["flame", "Mega Sale Pushes", "More creators and LIVEs for 9.9, 11.11, 12.12 and Raya."],
  ["edit", "Content Production", "Scripts, product shoots and AI video."],
  ["bag", "Shop Setup & Listing Optimisation", "Set up your shop and fix titles, photos and prices."],
  ["trend", "Ads Boosting", "Boost your best videos with Spark Ads or GMV Max."],
  ["chart", "Monthly Reports & Strategy Call", "A report every month and a call to plan what's next."],
];
const BUDGETS = ["Under RM 1,000", "RM 1,000–3,000", "RM 3,000–10,000", "RM 10,000+"];

/**
 * Custom Service (owner, 29 Oct 2026): what Techwide, a TikTok Shop Partner, can run for a seller, plus a request form.
 * A request lands in admin Business › Custom Service (CUSTOM in mock-admin): services → "want", budget → "budget", goal → "detail".
 * No prices here; the team replies on WhatsApp with a plan and a quote.
 */
export default function CustomServicePage() {
  const { toast } = useDemo();
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

  const submit = () => {
    setTried(true);
    if (!picked.length || !ph.ok) return;
    setSent(true);
    toast("Request sent · we'll WhatsApp you within 1 working day");
    formRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const reset = () => { setPicked([]); setBudget(null); setGoal(""); setTried(false); setSent(false); };

  return (
    <div className="v2-stack v2-in cs" style={{ gap: 18 }}>
      <Title title="Custom Service" sub="Techwide is a TikTok Shop Partner. Our team can run creators, samples, content and ads for you. Tell us what you need and we'll reply with a plan and a quote." />

      <section className="cs-hero">
        <span className="cs-partner"><Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={103} height={30} /></span>
        <h2>Let Our Team Run It for You</h2>
        <p>Pick the services you want. We WhatsApp you within 1 working day with a plan and a quote. You see every result here in Rezekii.</p>
        <a href="#request" className="cs-jump">Send a request <Icon name="arrow" size={16} /></a>
      </section>

      <div className="cs-layout">
        <section className="cs-grid" aria-label="Services">
          {SERVICES.map(([icon, t, line]) => {
            const on = picked.includes(t);
            return (
              <button key={t} type="button" className={`cs-svc ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggle(t)}>
                <span className="cs-ico"><Icon name={icon} size={20} /></span>
                <span className="cs-txt"><b>{t}</b><small>{line}</small></span>
                <span className="cs-tick" aria-hidden="true"><Icon name={on ? "check" : "plus"} size={14} width={2.6} /></span>
              </button>
            );
          })}
        </section>

        <section ref={formRef} id="request" className="v2-card cs-form">
          {sent ? (
            <div className="cs-sent">
              <span className="cs-sent-ico"><Icon name="check" size={26} width={2.6} /></span>
              <h2 className="v2-h2">Request Sent</h2>
              <p className="v2-muted" style={{ margin: 0 }}>We&apos;ll WhatsApp you within 1 working day on <b style={{ whiteSpace: "nowrap" }}>{ph.pretty}</b>.</p>
              <dl className="cs-sum">
                <div><dt>Shop</dt><dd>{SELLER.shop}</dd></div>
                <div><dt>Services</dt><dd>{picked.join(", ")}</dd></div>
                <div><dt>Monthly budget</dt><dd>{budget ?? "Not sure yet"}</dd></div>
                {goal.trim() && <div><dt>Goal</dt><dd>{goal.trim()}</dd></div>}
              </dl>
              <button type="button" className="v2-link" onClick={reset}>Send another request</button>
            </div>
          ) : (
            <>
              <h2 className="v2-h2">Request a Quote</h2>
              <div className="v2-field">What do you need? <small>Pick one or more</small>
                <div className="v2-chips">
                  {SERVICES.map(([, t]) => (
                    <button key={t} type="button" className={`v2-chip ${picked.includes(t) ? "on" : ""}`} aria-pressed={picked.includes(t)} onClick={() => toggle(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="v2-field">Monthly budget <small>Optional</small>
                <div className="v2-chips">
                  {BUDGETS.map((b) => (
                    <button key={b} type="button" className={`v2-chip ${budget === b ? "on" : ""}`} aria-pressed={budget === b} onClick={() => setBudget(budget === b ? null : b)}>{b}</button>
                  ))}
                </div>
              </div>
              <label className="v2-field">Your goal <small>Optional</small>
                <input className="np-input" value={goal} maxLength={120} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 500 orders a month by 11.11" />
              </label>
              <PhoneField dial={phone.dial} raw={phone.raw} onChange={(dial, raw) => setPhone({ dial, raw })} showError={tried} label="WhatsApp number" />
              {tried && !picked.length && <p className="sl-err"><Icon name="alert" size={16} /> Pick at least 1 service.</p>}
              <button type="button" className="np-btn" onClick={submit}>Send request <Icon name="send" size={17} /></button>
              <small className="v2-small">No payment now. We quote first.</small>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
