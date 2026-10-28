"use client";

import "@/app/seller.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { DemoStrip } from "@/components/shell";
import { Columns, Count } from "@/components/ui";
import { Ava, ContactSheet, InViewCount, Pips } from "@/components/seller/seller-ui";
import { SAMPLE_DESTINATIONS, SELLER_RESULTS, product, rm } from "@/lib/mock";
import { AGENCY, SELLER_FAQ, TESTIMONIALS } from "@/lib/mock-seller";

const PAIN: [string, string][] = [
  ["Creators vanish after getting your sample.", "Samples only go to creators who deliver on time."],
  ["Samples go to people who never post.", "We review every request. 1 sample = 3 videos."],
  ["You pay RM 3,000–3,500 a month for staff to chase creators.", "We chase creators for you. No hire needed."],
  ["You pay upfront, before any orders.", "We only earn commission when you sell."],
];

const ORDERS = [
  { img: "/products/tap-08.jpg", who: "@kak.ros.kitchen", what: "Casserole pot", amt: 319.8 },
  { img: "/products/tap-21.jpg", who: "@aisyah.glow", what: "Thermos ×3", amt: 68.7 },
  { img: "/products/tap-24.jpg", who: "@mei.ling.deals", what: "Tumbler", amt: 54.9 },
  { img: "/products/tap-11.jpg", who: "@dapur.wani", what: "Chopper ×2", amt: 19.8 },
  { img: "/products/tap-18.jpg", who: "@ahmad.fitlife", what: "Cordless vacuum", amt: 29.89 },
];

const CREATORS = ["@aisyah.glow", "@kak.ros.kitchen", "@mei.ling.deals", "@dapur.wani", "@nurul.beauty", "@ahmad.fitlife"];

/** The hero's mini dashboard: a sales line that draws itself, creators popping in, orders ticking past. */
function LiveDash() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => n + 1), 2300);
    return () => window.clearInterval(t);
  }, []);
  const d = SELLER_RESULTS.daily;
  const max = Math.max(...d);
  const pts = d.map((v, k) => [(k / (d.length - 1)) * 300, 88 - (v / max) * 76] as const);
  const line = pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const o = ORDERS[i % ORDERS.length];
  const last = pts[pts.length - 1];
  return (
    <div className="sl-dash-wrap">
      <div style={{ position: "relative", width: 340, maxWidth: "100%" }}>
        <span className="sl-chip-float a"><span className="sl-ico" style={{ width: 24, height: 24, borderRadius: 8 }}><Icon name="check" size={14} width={2.6} /></span> Sample delivered · 3 / 3 videos</span>
        <div className="sl-dash" aria-label="Example: a shop's TAP sales">
          <div className="sl-dash-h">
            <span className="sl-shop-ico" style={{ width: 38, height: 38, borderRadius: 12, fontSize: 14 }}>SL</span>
            <span><b>Example shop · TAP sales</b><small>Last 14 days</small></span>
            <span className="sl-live"><i /> LIVE</span>
          </div>
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
            <em>+41 creators selling</em>
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
        <span className="sl-chip-float b"><Icon name="flame" size={16} /> 47 creators this month</span>
      </div>
    </div>
  );
}

export default function SellerLanding() {
  const [talk, setTalk] = useState(false);
  return (
    <>
      <DemoStrip />
      <header className="site-hero sl-site">
        <div className="hm-grid" />
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href="/seller" className="site-brand">
            <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority /></span>
            Rezekii
          </Link>
          <span className="sl-tag">Sellers</span>
          <a href="#how">How it works</a>
          <a href="#results">Results</a>
          <a href="#cost">Cost</a>
          <a href="#faq">FAQ</a>
          <span className="site-spacer" />
          <Link href="/">For creators</Link>
          <Link href="/seller/connect">Sign in</Link>
          <Link href="/seller/connect" className="site-signin">Start free</Link>
        </nav>
        <div className="site-wrap hero-grid">
          <div className="hero-copy v2-in">
            <span className="hero-eyebrow"><span className="dot" /> FOR TIKTOK SHOP SELLERS IN MALAYSIA</span>
            <h1>Let creators sell for you, <em>without hiring anyone</em></h1>
            <p><b style={{ color: "var(--text)" }}>No sales, you pay us nothing.</b> Submit products once. Techwide&apos;s creators make the videos and LIVEs.</p>
            <div className="hero-ctas">
              <Link href="/seller/connect" className="btn-tiktok">Connect Seller Center <Icon name="arrow" size={18} /></Link>
              <button type="button" className="btn-ghost" style={{ font: "inherit", fontWeight: 800, cursor: "pointer" }} onClick={() => setTalk(true)}>Talk to our team</button>
            </div>
            <ul className="hero-checks">
              <li><Icon name="check" size={16} width={2.6} stroke="#00a862" /> RM 0 a month</li>
              <li><Icon name="check" size={16} width={2.6} stroke="#00a862" /> Commission only when you sell</li>
              <li><Icon name="check" size={16} width={2.6} stroke="#00a862" /> Set up in about 3 minutes</li>
            </ul>
          </div>
          <LiveDash />
        </div>
      </header>

      <main className="site-wrap site-main">
        <section className="section" id="results">
          <span className="eyebrow">THE NUMBERS</span>
          <h2>Our numbers</h2>
          <div className="hm-stats sl-wall">
            <div className="hm-stat"><b><InViewCount value={AGENCY.gmv / 1e6} format={(n) => `RM ${n.toFixed(2)}M`} /></b><span>GMV through Techwide in {AGENCY.month}</span></div>
            <div className="hm-stat"><b><InViewCount value={AGENCY.orders} /></b><span>Orders in {AGENCY.month}</span></div>
            <div className="hm-stat"><b><InViewCount value={AGENCY.campaigns} /></b><span>TAP campaigns running now</span></div>
            <div className="hm-stat"><b><InViewCount value={AGENCY.products} /></b><span>Products creators can promote</span></div>
          </div>
          <p className="sl-fine"><Icon name="shield" size={14} /> Techwide agency results. Updated before launch.</p>
        </section>

        <section className="section">
          <span className="eyebrow">THE PAINFUL TRUTH</span>
          <h2>Working with creators shouldn&apos;t feel like a second job</h2>
          <div className="v2-vs">
            <div className="old">
              <h3>What usually happens</h3>
              <ul>
                {PAIN.map(([p]) => (
                  <li key={p}><span className="v2-x"><Icon name="x" size={12} width={3} /></span><span>{p}</span></li>
                ))}
              </ul>
            </div>
            <div className="new">
              <h3>With Rezekii</h3>
              <ul>
                {PAIN.map(([p, fix]) => (
                  <li key={p}><span className="v2-ok"><Icon name="check" size={12} width={3} /></span><span>{fix}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="cost">
          <span className="eyebrow">WHAT IT COSTS</span>
          <h2>RM 0 a month. Commission only when you sell.</h2>
          <div className="sl-cost">
            <div className="old">
              <h3>Hire someone</h3>
              <div className="amt">RM 3,000<small> a month and up</small></div>
              <p style={{ margin: 0, fontWeight: 800 }}>Results not guaranteed.</p>
              <ul>
                <li><span className="v2-x"><Icon name="x" size={12} width={3} /></span>Salary RM 3,000–3,500, plus EPF and SOCSO</li>
                <li><span className="v2-x"><Icon name="x" size={12} width={3} /></span>Weeks to find and train them</li>
                <li><span className="v2-x"><Icon name="x" size={12} width={3} /></span>You pay every month, sales or not</li>
              </ul>
            </div>
            <div className="new">
              <h3>Rezekii</h3>
              <div className="amt">RM 0<small> a month</small></div>
              <p style={{ margin: 0, fontWeight: 800 }}>Commission only when you sell.</p>
              <ul>
                <li><span className="v2-ok"><Icon name="check" size={12} width={3} /></span>No sign-up fee, no contract</li>
                <li><span className="v2-ok"><Icon name="check" size={12} width={3} /></span>Commission comes out of real orders</li>
                <li><span className="v2-ok"><Icon name="check" size={12} width={3} /></span>Stop adding samples any time</li>
              </ul>
            </div>
          </div>
          <div className="sl-year">
            <b style={{ fontSize: 15 }}>Over 12 months</b>
            <div className="sl-year-row"><span>Hire someone</span><span className="v2-meter"><i className="red" style={{ width: "100%" }} /></span><b>RM 36,000+</b></div>
            <div className="sl-year-row" style={{ color: "var(--gink)" }}><span>Rezekii</span><span className="v2-meter"><i style={{ width: "3%" }} /></span><b>RM 0</b></div>
          </div>
          <p className="hm-fine">You still pay for samples, sent through TikTok as usual.</p>
        </section>

        <section className="section">
          <span className="eyebrow">WHAT SELLERS SAY</span>
          <h2>Shops already selling with our creators</h2>
          <div className="grid3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.shop} className="card sl-quote" style={{ margin: 0 }}>
                <div className="v2-row" style={{ justifyContent: "space-between" }}>
                  <span className="sl-stars" aria-label="5 stars">{Array.from({ length: 5 }, (_, k) => <svg key={k} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>)}</span>
                  <span className="badge sl-qstat">{t.stat}</span>
                </div>
                <p>&ldquo;{t.quote}&rdquo;</p>
                <footer>
                  <Ava name={t.shop} lg />
                  <span><b>{t.shop}</b>{t.who} · {t.what}</span>
                </footer>
                <small className="v2-small">Shared with permission · Oct 2026</small>
              </figure>
            ))}
          </div>
        </section>

        <section className="section" id="how">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Two steps. About 3 minutes.</h2>
          <div className="v2-grid2">
            <div className="card hm-step">
              <span className="step-n">1</span>
              <strong>Connect Seller Center</strong>
              <span>Connect your TikTok Shop. We import your products, prices and sales.</span>
              <div className="v2-row" style={{ marginTop: 6 }}>
                <span className="badge" style={{ background: "#000000", color: "#ffffff", boxShadow: "none" }}>TikTok Seller Center</span>
                <Icon name="link" size={18} stroke="#00a862" />
                <span className="badge">Rezekii</span>
              </div>
            </div>
            <div className="card hm-step">
              <span className="step-n">2</span>
              <strong>Pick products and submit</strong>
              <span>Pick products and set your extra commission. AI suggests an amount.</span>
              <div className="v2-chips" style={{ marginTop: 6 }}>
                <span className="v2-chip" style={{ height: 34, cursor: "default" }}>+2%</span>
                <span className="v2-chip on" style={{ height: 34, cursor: "default" }}>+5% <small>AI pick</small></span>
                <span className="v2-chip" style={{ height: 34, cursor: "default" }}>+8%</span>
              </div>
            </div>
          </div>
          <p className="lead">We do the rest: TikTok submission, sample approvals and video follow-ups.</p>
        </section>

        <section className="section">
          <span className="eyebrow">WHAT YOU&apos;LL SEE</span>
          <h2>Every sale and every sample, in one place</h2>
          <div className="v2-grid2">
            <div className="v2-card sl-window">
              <div className="sl-window-bar"><i /><i /><i /><span>TAP performance</span></div>
              <div className="sl-window-body">
                <div className="stat3">
                  <span><b>{rm(SELLER_RESULTS.gmv, 0)}</b><small>Sales</small></span>
                  <span><b>{SELLER_RESULTS.units.toLocaleString("en-MY")}</b><small>Units</small></span>
                  <span><b>{SELLER_RESULTS.creators}</b><small>Creators</small></span>
                </div>
                <Columns values={SELLER_RESULTS.daily} />
                <small className="v2-small">TikTok data, updated daily.</small>
              </div>
            </div>
            <div className="v2-card sl-window">
              <div className="sl-window-bar"><i /><i /><i /><span>Where samples went</span></div>
              <div className="sl-window-body" style={{ gap: 0 }}>
                {SAMPLE_DESTINATIONS.map((s) => (
                  <div key={s.handle} className="sl-act">
                    <Ava name={s.handle} />
                    <span><b style={{ fontSize: 14 }}>{s.handle}</b><small>{product(s.productId).name}</small></span>
                    <span className={`badge ${s.ok ? "" : "badge-red"}`}>{s.ok ? <><Pips n={Number(s.status[0])} /> {s.status[0]} / 3</> : "Overdue · reminded"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="sl-band">
          <div>
            <span className="eyebrow">CUSTOM SERVICE</span>
            <h2>Want our team to run it for you?</h2>
            <p>For launches, big catalogues or paid content. Tell us what you need and we&apos;ll quote.</p>
          </div>
          <button type="button" className="np-btn" onClick={() => setTalk(true)}>Talk to us <Icon name="arrow" size={18} /></button>
        </section>

        <section className="section" id="faq">
          <span className="eyebrow">FAQ</span>
          <h2>Questions sellers ask us</h2>
          <div className="hm-faqs">
            {SELLER_FAQ.map(([q, a]) => (
              <details key={q} className="hm-faq">
                <summary>{q}<Icon name="plus" size={20} /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="hm-cta">
          <h2>Let creators sell for you</h2>
          <p>Set up in about 3 minutes. No sales, you pay us nothing.</p>
          <Link href="/seller/connect" className="v2-btn-white" style={{ height: 54, padding: "0 26px", fontSize: 16 }}>Connect Seller Center <Icon name="arrow" size={18} /></Link>
        </section>
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
