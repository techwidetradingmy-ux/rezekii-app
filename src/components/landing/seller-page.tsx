"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { DemoStrip } from "@/components/shell";
import { AiHead, Count, Tip } from "@/components/ui";
import { Ava, ContactSheet } from "@/components/seller/seller-ui";
import { JoinBar } from "@/components/join-board";
import { PartnerCard } from "@/components/partner-card";
import { Reveal } from "@/components/creator1/reveal";
import { SELLER_RESULTS, rm } from "@/lib/mock";
import { SELLER_FAQ } from "@/lib/mock-seller";
import { AiEyebrow } from "./ai-eyebrow";
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
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref, 0.3);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setI((n) => n + 1), 2300);
    return () => window.clearInterval(t);
  }, [on]);
  const d = SELLER_RESULTS.daily;
  const max = Math.max(...d);
  const pts = d.map((val, k) => [(k / (d.length - 1)) * 300, 88 - (val / max) * 76] as const);
  const line = pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const o = ORDERS[i % ORDERS.length];
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="sl-dash" aria-label="Example: a shop's sales from creators">
      <div className="sl-dash-h">
        <span className="sl-shop-ico" style={{ width: 38, height: 38, borderRadius: 12, fontSize: 14 }}>SL</span>
        <span><b>Example Shop · Sales</b><small>Last 14 days · sample</small></span>
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
          <em>creators selling</em>
        </div>
      </div>
      <div className="sl-ticker" aria-live="off">
        <div className="sl-tick" key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.img} alt="" />
          <span>{o.who} sold {o.what}</span>
          <b>+{rm(o.amt)}</b>
        </div>
      </div>
    </div>
  );
}

const CHIPS = ["RM 0 a Month", "Commission Only on Sales", "Set Up in 3 Minutes"];

const START: PathStep[] = [
  { icon: "link", title: "Connect Seller Center", line: "We import your products, prices and sales." },
  { icon: "box", title: "Pick Products and Submit", line: "Set your extra commission. Rezekii AI suggests an amount." },
];

/**
 * Seller site, "Watch Rezekii Work" (owner, 29 Oct 2026): the AI-powered affiliate platform that connects sellers with
 * creators. JoinBar → hero → partner → what you get → without vs with → a week with Rezekii → everything in one app → what
 * you'll see + sample testimonials → cost → 2 steps → custom service → FAQ → one CTA.
 */
export function SellerLanding() {
  const [talk, setTalk] = useState(false);
  return (
    <>
      <DemoStrip />
      <JoinBar />
      <header className="lp-hero">
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href="/seller" className="site-brand">
            <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority /></span>
            Rezekii
          </Link>
          <span className="sl-tag">Sellers</span>
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#cost">Cost</a>
          <a href="#faq">FAQ</a>
          <span className="site-spacer" />
          <Link href="/" className="lp-keep">For Creators</Link>
          <Link href="/seller/connect">Sign In</Link>
          <Link href="/seller/connect" className="site-signin">Start Free</Link>
        </nav>
        <div className="site-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <AiEyebrow />
            <h1>Let Creators Sell for You, <em>Without Hiring Anyone</em></h1>
            <p><AiText text="Rezekii AI matches your products with the right creators. They request samples, post videos and go LIVE. You pay only when you sell." /></p>
            <div className="lp-ctas">
              <Link href="/seller/connect" className="np-btn lp-bigbtn">Connect Seller Center <Icon name="arrow" size={18} /></Link>
              <button type="button" className="lp-ghost" onClick={() => setTalk(true)}>Talk to Our Team</button>
            </div>
            <PartnerLine />
            <ul className="lp-chips">
              {CHIPS.map((c) => (
                <li key={c}><Icon name="check" size={14} width={3} />{c}</li>
              ))}
            </ul>
          </div>
          <div className="lp-hero-vis">
            <SellerHeroPhone />
          </div>
        </div>
      </header>

      <main className="site-wrap site-main lp-main">
        <PartnerCard />

        <Reveal className="section" label="What you get">
          <div className="lp-head">
            <span className="eyebrow">WHAT YOU GET</span>
            <h2>Creators Sell, You Grow</h2>
          </div>
          <SellerUsps />
        </Reveal>

        <Reveal className="section" label="Without and with Rezekii">
          <div className="lp-head">
            <span className="eyebrow">THE DIFFERENCE</span>
            <h2>Without Rezekii vs With Rezekii</h2>
          </div>
          <SellerCompare />
        </Reveal>

        <Reveal id="how" className="section" label="A week with Rezekii">
          <div className="lp-head">
            <span className="eyebrow">HOW REZEKII HELPS</span>
            <AiHead title="A Week With Rezekii" sub="Watch Rezekii AI and our team do the work." />
          </div>
          <SellerWeek />
          <p className="hm-fine">Screens show sample products, creators and numbers. Results vary.</p>
        </Reveal>

        <Reveal id="features" className="section" label="Features">
          <div className="lp-head">
            <span className="eyebrow">EVERYTHING IN ONE APP</span>
            <h2>Everything in One App</h2>
          </div>
          <SellerBento dash={<LiveDash />} />
        </Reveal>

        <Reveal className="section" label="What you'll see">
          <div className="lp-head">
            <span className="eyebrow">WHAT YOU&apos;LL SEE</span>
            <h2>Real Screens From the App</h2>
          </div>
          <SellerSee />
        </Reveal>

        <Reveal className="section" id="cost" label="What it costs">
          <div className="lp-head">
            <span className="eyebrow">WHAT IT COSTS</span>
            <h2>RM 0 a Month. Commission Only When You Sell.</h2>
          </div>
          <div className="lp-cost">
            <div className="old">
              <h3>Hire Someone</h3>
              <b>RM 3,000+<small> a month</small></b>
              <ul>
                <li><Icon name="x" size={13} width={3} />Salary, plus EPF and SOCSO</li>
                <li><Icon name="x" size={13} width={3} />You pay, sales or not</li>
              </ul>
            </div>
            <div className="new">
              <h3>Rezekii</h3>
              <b>RM 0<small> a month</small></b>
              <ul>
                <li><Icon name="check" size={13} width={3} />No sign-up fee, no contract</li>
                <li><Icon name="check" size={13} width={3} />Commission only on real orders</li>
              </ul>
            </div>
            <div className="lp-year">
              <small>Over 12 months</small>
              <span><em>Hire someone</em><span className="lp-bar red"><i /></span><b>RM 36,000+</b></span>
              <span><em>Rezekii</em><span className="lp-bar"><i style={{ width: "3%" }} /></span><b>RM 0</b></span>
            </div>
          </div>
        </Reveal>

        <Reveal className="section" id="start" label="Start in 2 steps">
          <div className="lp-head">
            <span className="eyebrow">TWO STEPS</span>
            <h2>Start in 2 Steps<Tip text="We do the rest: TikTok submission, sample approvals and video follow-ups." label="What happens next" /></h2>
          </div>
          <Path steps={START} label="Steps to start" />
        </Reveal>

        <section className="lp-band" aria-label="Custom service">
          <span className="lp-band-ico"><Icon name="whatsapp" size={22} width={2.2} /></span>
          <div>
            <h2>Want Our Team to Run It?</h2>
            <p>Launches, big catalogues or paid content. We quote first.</p>
          </div>
          <div className="lp-band-cta">
            <button type="button" className="np-btn" onClick={() => setTalk(true)}>Talk to Us <Icon name="arrow" size={18} /></button>
            <PartnerLine />
          </div>
        </section>

        <Reveal className="section" id="faq" label="Questions">
          <div className="lp-head">
            <span className="eyebrow">FAQ</span>
            <h2>Questions Sellers Ask Us</h2>
          </div>
          <Faqs items={SELLER_FAQ} />
        </Reveal>

        <Reveal className="lp-final" label="Get started">
          <h2>Let Creators Sell for You</h2>
          <p>Set up in about 3 minutes. No sales, you pay us nothing.</p>
          <Link href="/seller/connect" className="np-btn lp-bigbtn">Connect Seller Center <Icon name="arrow" size={18} /></Link>
          <PartnerLine center />
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii · TikTok Shop Partner</span>
          <span className="site-spacer" />
          <Link href="/">For creators</Link>
          <a href="#faq">FAQ</a>
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setTalk(true); }}>Talk to us</a>
        </div>
      </footer>
      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </>
  );
}
