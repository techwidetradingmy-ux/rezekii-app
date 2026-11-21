"use client";

import { SUPPORT } from "@/lib/support";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { DemoStrip } from "@/components/shell";
import { AiHead, Count, Tip } from "@/components/ui";
import { Ava, ContactSheet } from "@/components/seller/seller-ui";
import { PartnerCard } from "@/components/partner-card";
import { Reveal } from "@/components/creator1/reveal";
import { SELLER_RESULTS, rm } from "@/lib/mock";
import { SELLER_FAQ } from "@/lib/mock-seller";
import { LangSwitch, useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import { AiEyebrow } from "./ai-eyebrow";
import { Rich } from "./bits";
import { useOnScreen } from "./hooks";
import { PartnerLine } from "./partner-line";
import { AiText } from "./ai-text";
import { Path, type PathStep } from "./path";
import { SellerBento, SellerCompare, SellerHeroPhone, SellerSee, SellerUsps, SellerWeek } from "./seller";
import { Faqs } from "./faqs";

const ORDERS = [
  { img: "/products/tap-08.jpg", who: "@kak.ros.kitchen", what: "Casserole pot", amt: 319.8 },
  { img: "/products/tap-21.jpg", who: "@aisyah.glow", what: "Thermos ×3", amt: 68.7 },
  { img: "/products/tap-24.jpg", who: "@mei.ling.deals", what: "Tumbler", amt: 54.9 },
  { img: "/products/tap-11.jpg", who: "@dapur.wani", what: "Chopper ×2", amt: 19.8 },
  { img: "/products/tap-18.jpg", who: "@ahmad.fitlife", what: "Cordless vacuum", amt: 29.89 },
];

const CREATORS = ["@aisyah.glow", "@kak.ros.kitchen", "@mei.ling.deals", "@dapur.wani", "@nurul.beauty", "@ahmad.fitlife"];

/**
 * The example shop's live dashboard (sample): a sales line that draws itself, creators popping in, orders ticking past. Now a
 * bento tile; it only ticks, and draws again, while on screen.
 */
function LiveDash() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.3);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const timer = window.setInterval(() => setI((n) => n + 1), 2300);
    return () => window.clearInterval(timer);
  }, [on]);
  const d = SELLER_RESULTS.daily;
  const max = Math.max(...d);
  const pts = d.map((val, k) => [(k / (d.length - 1)) * 300, 88 - (val / max) * 76] as const);
  const line = pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const o = ORDERS[i % ORDERS.length];
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="sl-dash" aria-label={t("Example: a shop's sales from creators")}>
      <div className="sl-dash-h">
        <span className="sl-shop-ico" style={{ width: 38, height: 38, borderRadius: 12, fontSize: 14 }}>SL</span>
        <span><b>{t("Example Shop · Sales")}</b><small>{t("Last 14 days · sample")}</small></span>
        <span className="sl-live"><i /> LIVE</span>
      </div>
      <div key={on ? "on" : "off"} style={{ display: "contents" }}>
        <div className="sl-dash-gmv">
          <b><Count value={SELLER_RESULTS.gmv} format={(n) => rm(n, 0)} ms={1600} /></b>
          <span className="sl-up">+31%</span>
        </div>
        <svg className="sl-spark" viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="slg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#22dc95" /><stop offset="1" stopColor="#00a862" /></linearGradient>
            <linearGradient id="sla" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00c073" stopOpacity="0.28" /><stop offset="1" stopColor="#00c073" stopOpacity="0" /></linearGradient>
          </defs>
          <path className="ar" d={`${line} L300 96 L0 96 Z`} fill="url(#sla)" />
          <path className="ln" d={line} pathLength={600} />
          <circle className="pt" cx={last[0]} cy={last[1]} r="5.5" fill="#00c073" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
        <div className="sl-avs">
          {CREATORS.map((c, k) => (
            <span key={c} style={{ animationDelay: `${1.2 + k * 0.18}s`, borderRadius: "50%" }}><Ava name={c} /></span>
          ))}
          <em>{t("creators selling")}</em>
        </div>
      </div>
      <div className="sl-ticker" aria-live="off">
        <div className="sl-tick" key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.img} alt="" />
          <span>{t("{who} sold {what}", { who: o.who, what: o.what })}</span>
          <b>+{rm(o.amt)}</b>
        </div>
      </div>
    </div>
  );
}

const CHIPS = [tx("RM 0 a Month"), tx("Commission Only on Sales"), tx("Set Up in 3 Minutes")];

/**
 * Seller site, "Watch Rezekii Work" (owner, 29 Oct 2026): the AI-powered affiliate platform that connects sellers with
 * creators. Hero → partner → what you get → without vs with → a week with Rezekii → everything in one app → what
 * you'll see + sample testimonials → cost → 2 steps → custom service → FAQ → one CTA.
 * In English, Malay or Chinese (owner, 3 Nov 2026), with the language switch in the top bar for visitors.
 */
export function SellerLanding() {
  const t = useT();
  const [talk, setTalk] = useState(false);
  const start: PathStep[] = [
    { icon: "link", title: t("Connect Seller Center"), line: t("We import your products, prices and sales.") },
    { icon: "box", title: t("Pick Products and Submit"), line: t("Set your extra commission. Rezekii AI suggests an amount.") },
  ];
  return (
    <>
      <DemoStrip />
      <header className="lp-hero">
        <nav className="site-nav site-wrap" aria-label={t("Main menu")}>
          <Link href="/seller" className="site-brand">
            <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority /></span>
            Rezekii
          </Link>
          <span className="sl-tag">{t("Sellers")}</span>
          <a href="#how">{t("How It Works")}</a>
          <a href="#features">{t("Features")}</a>
          <a href="#cost">{t("Cost")}</a>
          <a href="#faq">{t("FAQ")}</a>
          <span className="site-spacer" />
          <Link href="/" className="lp-keep">{t("For Creators")}</Link>
          <Link href="/seller/connect">{t("Sign In")}</Link>
          <LangSwitch compact />
          <Link href="/seller/connect" className="site-signin">{t("Start Free")}</Link>
        </nav>
        <div className="site-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <AiEyebrow text={t("AI-Powered Affiliate Platform · Malaysia")} />
            <h1><Rich text={t("Let Creators Sell for You, *Without Hiring Anyone*")} /></h1>
            <p><AiText text={t("Rezekii AI matches your products with the right creators. They request samples, post videos and go LIVE. You pay only when you sell.")} /></p>
            <div className="lp-ctas">
              <Link href="/seller/connect" className="np-btn lp-bigbtn">{t("Connect Seller Center")} <Icon name="arrow" size={18} /></Link>
              <button type="button" className="lp-ghost" onClick={() => setTalk(true)}>{t("Talk to Our Team")}</button>
            </div>
            <PartnerCard />
            <ul className="lp-chips">
              {CHIPS.map((c) => (
                <li key={c}><Icon name="check" size={14} width={3} />{t(c)}</li>
              ))}
            </ul>
          </div>
          <div className="lp-hero-vis">
            <SellerHeroPhone />
          </div>
        </div>
      </header>

      <main className="site-wrap site-main lp-main">

        <Reveal className="section" label={t("What you get")}>
          <div className="lp-head">
            <span className="eyebrow">{t("WHAT YOU GET")}</span>
            <h2>{t("Creators Sell, You Grow")}</h2>
          </div>
          <SellerUsps />
        </Reveal>

        <Reveal className="section" label={t("Without and with Rezekii")}>
          <div className="lp-head">
            <span className="eyebrow">{t("THE DIFFERENCE")}</span>
            <h2>{t("Without Rezekii vs With Rezekii")}</h2>
          </div>
          <SellerCompare />
        </Reveal>

        <Reveal id="how" className="section" label={t("A week with Rezekii")}>
          <div className="lp-head">
            <span className="eyebrow">{t("HOW REZEKII HELPS")}</span>
            <AiHead title={t("A Week With Rezekii")} sub={t("Watch Rezekii AI and our team do the work.")} />
          </div>
          <SellerWeek />
        </Reveal>

        <Reveal id="features" className="section" label={t("Features")}>
          <div className="lp-head">
            <span className="eyebrow">{t("EVERYTHING IN ONE APP")}</span>
            <h2>{t("Everything in One App")}</h2>
          </div>
          <SellerBento dash={<LiveDash />} />
        </Reveal>

        <Reveal className="section" label={t("What you'll see")}>
          <div className="lp-head">
            <span className="eyebrow">{t("WHAT YOU'LL SEE")}</span>
            <h2>{t("Real Screens From the App")}</h2>
          </div>
          <SellerSee />
        </Reveal>

        <Reveal className="section" id="cost" label={t("What it costs")}>
          <div className="lp-head">
            <span className="eyebrow">{t("WHAT IT COSTS")}</span>
            <h2>{t("RM 0 a Month. Commission Only When You Sell.")}</h2>
          </div>
          <div className="lp-cost">
            <div className="old">
              <h3>{t("Hire Someone")}</h3>
              <b>RM 3,000+<small> {t("a month")}</small></b>
              <ul>
                <li><Icon name="x" size={13} width={3} />{t("Salary, plus EPF and SOCSO")}</li>
                <li><Icon name="x" size={13} width={3} />{t("You pay, sales or not")}</li>
              </ul>
            </div>
            <div className="new">
              <h3>Rezekii</h3>
              <b>RM 0<small> {t("a month")}</small></b>
              <ul>
                <li><Icon name="check" size={13} width={3} />{t("No sign-up fee, no contract")}</li>
                <li><Icon name="check" size={13} width={3} />{t("Commission only on real orders")}</li>
              </ul>
            </div>
            <div className="lp-year">
              <small>{t("Over 12 months")}</small>
              <span><em>{t("Hire someone")}</em><span className="lp-bar red"><i /></span><b>RM 36,000+</b></span>
              <span><em>Rezekii</em><span className="lp-bar"><i style={{ width: "3%" }} /></span><b>RM 0</b></span>
            </div>
          </div>
        </Reveal>

        <Reveal className="section" id="start" label={t("Start in 2 steps")}>
          <div className="lp-head">
            <span className="eyebrow">{t("TWO STEPS")}</span>
            <h2>{t("Start in 2 Steps")}<Tip text={t("We do the rest: TikTok submission, sample approvals and video follow-ups.")} label={t("What happens next")} /></h2>
          </div>
          <Path steps={start} label={t("Steps to start")} />
        </Reveal>

        <section className="lp-band" aria-label={t("Custom service")}>
          <span className="lp-band-ico"><Icon name="whatsapp" size={22} width={2.2} /></span>
          <div>
            <h2>{t("Want Our Team to Run It?")}</h2>
            <p>{t("Launches, big catalogues or paid content. We quote first.")}</p>
          </div>
          <div className="lp-band-cta">
            <button type="button" className="np-btn" onClick={() => setTalk(true)}>{t("Talk to Us")} <Icon name="arrow" size={18} /></button>
            <PartnerLine />
          </div>
        </section>

        <Reveal className="section" id="faq" label={t("Questions")}>
          <div className="lp-head">
            <span className="eyebrow">{t("FAQ")}</span>
            <h2>{t("Questions Sellers Ask Us")}</h2>
          </div>
          <Faqs items={SELLER_FAQ.map(([q, a]): [string, string] => [t(q), t(a)])} />
        </Reveal>

        <Reveal className="lp-final" label={t("Get started")}>
          <h2>{t("Let Creators Sell for You")}</h2>
          <p>{t("Set up in about 3 minutes. No sales, you pay us nothing.")}</p>
          <Link href="/seller/connect" className="np-btn lp-bigbtn">{t("Connect Seller Center")} <Icon name="arrow" size={18} /></Link>
          <PartnerLine center />
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii · TikTok Shop Partner</span>
          <span className="site-spacer" />
          <Link href="/">{t("For Creators")}</Link>
          <a href="#faq">{t("FAQ")}</a>
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">{t("Privacy Policy")}</a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">{t("Terms of Service")}</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setTalk(true); }}>{t("Talk to Us")}</a>
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
          <small className="ft-note">{t("Screens show sample products, creators and numbers. Results vary.")}</small>
        </div>
      </footer>
      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </>
  );
}
