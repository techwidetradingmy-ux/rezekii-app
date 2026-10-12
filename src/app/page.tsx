import Image from "next/image";
import Link from "next/link";
import { Emblem, type Level } from "./emblems";
import { HomeCalculator } from "./home-calculator";
import { HOME_PRODUCTS, TAP_PRODUCT_COUNT } from "./home-products";
import { COMPANY, SUPPORT_EMAIL, SiteFooter, SiteNav, TikTokLogo } from "./site";

const N = TAP_PRODUCT_COUNT.toLocaleString("en-US");

/** Level benefits (same list as the Levels screen). */
const BENEFITS: { label: string; v: [string, string, string] }[] = [
  { label: "Commission on Techwide campaign links", v: ["Open Plan rate", "Open Plan + 1%", "Special rate for you"] },
  { label: "Free product samples", v: ["Included", "Included", "Included"] },
  { label: "Level emblem on your profile and in Rankings", v: ["Included", "Included", "Included"] },
  { label: "How you get it", v: ["When you join", "10 sample videos + RM1,000 lifetime sales", "By invitation"] },
  { label: "How you keep it", v: ["Always", "RM1,000 in sales every month", "Set by Techwide"] },
];
const SILVER_HOW = "10 sample videos and RM1,000 in lifetime sales";

const STATS = [
  ["RM2.85M", "Sales in August 2026", "By creators Techwide works with"],
  ["84,224", "Orders in one month", "August 2026"],
  ["174", "TikTok Shop campaigns", "Run by Techwide with sellers"],
  ["27", "Creators in our agency", "And growing"],
];

const VS: [string, string, string][] = [
  ["Commission", "TikTok's Open Plan rate", "Open Plan + 1% at Silver, special rates at Gold"],
  ["Products to promote", "Search TikTok Shop on your own", `${N} approved TAP products, commission shown upfront`],
  ["Free samples", "Ask each seller and hope for a reply", "Techwide gets them approved and you track them to your door"],
  ["Posting", "Post by hand, one video at a time", "Schedule to your own TikTok and it posts on time"],
  ["Knowing what sells", "Guess from the TikTok app", "Sales per video and LIVE, plus daily best-sellers and top creators"],
  ["Growth", "On your own", "Levels, monthly rankings and an agency team behind you"],
  ["Cost", "Free", "Free"],
];

const STEPS = [
  ["Join with TikTok", 'Tap "Continue with TikTok" and approve. No forms, no follower minimum.', "About 1 minute"],
  ["Pick products, get samples", "Browse Techwide's campaign products, request a free sample, and get your link in one tap.", "Free samples"],
  ["Post, sell, level up", "Schedule your videos, see which ones sell, and move up from Bronze to Silver and Gold.", "Better commission"],
];

const FEATURES: [string, string, string, string][] = [
  ["Schedule your posts", "Upload once, pick a time, and Rezekii posts to your own TikTok on time. Cancel any time before.", "#00874f", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"],
  ["See what sells", "Views, orders and sales for every video and LIVE, so you know what to post next.", "#1d4ed8", "M4 19V5M4 19h16M8 15l3-4 3 2 4-6"],
  ["Campaign marketplace", `${N} approved products from Techwide's TikTok Shop campaigns, with your commission shown upfront.`, "#e8005a", "M5 7h14l-1.5 13h-11zM9 7a3 3 0 0 1 6 0"],
  ["Free samples", "Request samples of the products you want to promote and track them to your door.", "#d97706", "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"],
  ["Levels and rewards", "Bronze, Silver and Gold, with better commission as you grow. Share your level-up with friends.", "#7c3aed", "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"],
  ["Monthly rankings", "A new leaderboard every month. See where you stand and who to learn from.", "#0e7490", "M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 21h8M9.5 17h5v4h-5z"],
];

const FAQS: [string, string][] = [
  ["How much more can I earn?", `At Silver, every link you make from Techwide's campaigns pays TikTok's Open Plan rate plus 1%. On RM100,000 of sales in a month, that's RM1,000 more, and Gold creators get special rates. Silver needs ${SILVER_HOW}.`],
  ["Is Rezekii free?", "Yes. Rezekii is free for creators. Commission is paid to you by TikTok Shop as usual."],
  ["Do I need a lot of followers?", "No. Any creator with a TikTok account can join. Your level grows with your sales, not your follower count."],
  ["Will Rezekii post without asking me?", "Never. Rezekii only posts videos you schedule, at the time you pick, with the privacy you choose. You can cancel before it goes out."],
  ["How do free samples work?", "Request a sample for a campaign product. Techwide approves it with the seller, and you can track delivery in Rezekii. Post a video for it to count towards Silver."],
  ["Who runs Rezekii?", `${COMPANY} (202001017785), a TikTok Shop partner agency in Malaysia that runs affiliate campaigns with sellers and creators.`],
  ["Can I leave any time?", "Yes. Disconnect in Settings or in the TikTok app, and you can delete your Rezekii account and data whenever you like."],
];

const LEVELS: [Level, string][] = [["bronze", "Bronze"], ["silver", "Silver"], ["gold", "Gold"]];
const short = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(v));
const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa5b1" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const V = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00a862" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>;
const CHECK = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c073" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>;

export default function Home() {
  return (
    <>
      <header className="site-hero">
        <span className="hm-grid" aria-hidden="true" />
        <SiteNav variant="hero" />
        <div className="site-wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="dot" aria-hidden="true" />FOR TIKTOK SHOP CREATORS IN MALAYSIA</span>
            <h1>Same videos. <em>More commission.</em> Stop leaving money on the table.</h1>
            <p>
              Rezekii creators promote {N}{" "}approved products from Techwide&apos;s TikTok Shop campaigns, get free samples, and earn TikTok&apos;s Open
              Plan rate plus 1% once they reach Silver. On RM100k of sales, that&apos;s RM1,000 more every month.
            </p>
            <div className="hero-ctas">
              <Link href="/signin" className="btn-tiktok"><TikTokLogo />Continue with TikTok</Link>
              <a href="#earn" className="btn-ghost">See what you&apos;re missing</a>
            </div>
            <ul className="hero-checks">
              <li>{CHECK}Free to join</li>
              <li>{CHECK}Any follower count</li>
              <li>{CHECK}Nothing posts without you</li>
            </ul>
          </div>
          <div className="hero-card-wrap" aria-label="Example of a scheduled post">
            <div className="hero-card">
              <p className="cap">Next post · example</p>
              <div className="hero-post">
                <Image src="/examples/kacip.webp" alt="" width={64} height={86} />
                <span><strong>Kacip Fatimah: 3 tanda hormon wanita 40+</strong><small>Posting as Tina Wellness</small></span>
              </div>
              <div className="hero-slot"><strong>Sun 15 Oct · 8:00 PM</strong><span className="badge">Scheduled</span></div>
              <div className="stat3">
                <span><b>12.4k</b><small>views</small></span>
                <span><b>38</b><small>orders</small></span>
                <span><b>RM1.2k</b><small>sales</small></span>
              </div>
              <div className="hero-level"><Emblem level="silver" size={40} /><span><strong>Almost Silver!</strong><small>RM140 to go</small></span></div>
              <span className="hero-fine">Example figures for illustration.</span>
            </div>
          </div>
        </div>
      </header>

      <main className="site-wrap site-main">
        <section className="section" aria-labelledby="h-proof">
          <span className="eyebrow">BACKED BY TECHWIDE · A TIKTOK SHOP PARTNER AGENCY</span>
          <h2 id="h-proof">Creators we work with already sell a lot.</h2>
          <div className="hm-stats">
            {STATS.map(([v, label, note]) => (
              <div key={label} className="hm-stat"><b>{v}</b><strong>{label}</strong><span>{note}</span></div>
            ))}
          </div>
        </section>

        <section id="earn" className="hm-money" aria-labelledby="h-earn">
          <div className="hm-money-copy">
            <span className="eyebrow">MONEY ON THE TABLE</span>
            <h2 id="h-earn">1% of RM100k is RM1,000. Every month.</h2>
            <p>
              A normal creator earns TikTok&apos;s Open Plan rate. A Rezekii Silver creator earns the same rate plus 1% on every Techwide campaign
              link: same video, same sale, more money. Without Rezekii, that extra stays on the table.
            </p>
            <div className="hm-tags"><span className="badge">Open Plan + 1% at Silver</span><span className="badge badge-amber">Special rates at Gold</span><span className="badge badge-gray">Paid by TikTok Shop</span></div>
          </div>
          <HomeCalculator silverHow={SILVER_HOW} />
        </section>

        <section id="compare" className="section" aria-labelledby="h-vs">
          <span className="eyebrow">REZEKII CREATOR VS NORMAL CREATOR</span>
          <h2 id="h-vs">Same TikTok. A very different payday.</h2>
          <div className="hm-vs" role="table" aria-label="Normal creator compared with Rezekii creator">
            <div role="row" className="hm-vs-row hm-vs-head">
              <span role="columnheader">What you get</span>
              <span role="columnheader">Normal creator</span>
              <span role="columnheader" className="rz">Rezekii creator</span>
            </div>
            {VS.map(([k, no, rz]) => (
              <div role="row" className="hm-vs-row" key={k}>
                <span role="rowheader" className="k">{k}</span>
                <span role="cell" className="no">{X}<span>{no}</span></span>
                <span role="cell" className="rz">{V}<span>{rz}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="section" aria-labelledby="h-how">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2 id="h-how">Start in one minute. Grow every month.</h2>
          <ol className="grid3">
            {STEPS.map(([title, body, tag], i) => (
              <li key={title} className="card hm-step"><span className="step-n">{i + 1}</span><strong>{title}</strong><span>{body}</span><span className="badge">{tag}</span></li>
            ))}
          </ol>
        </section>

        <section id="features" className="section" aria-labelledby="h-features">
          <span className="eyebrow">EVERYTHING IN ONE PLACE</span>
          <h2 id="h-features">Built for creators who post every day.</h2>
          <ul className="grid3">
            {FEATURES.map(([title, body, bg, d]) => (
              <li key={title} className="card hm-feat">
                <span className="ico" style={{ background: bg }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="h-prod">
          <div className="hm-prod-head">
            <div><span className="eyebrow">PRODUCTS YOU CAN PROMOTE</span><h2 id="h-prod">{N} approved products. Free samples.</h2></div>
            <span className="hm-prod-note">Best sellers from Techwide&apos;s live TAP campaigns</span>
          </div>
          <div className="hm-marq" role="region" aria-label="Best-selling products you can promote" tabIndex={0}>
            <ul className="hm-track">
              {[...HOME_PRODUCTS, ...HOME_PRODUCTS].map((p, i) => (
                <li key={i} className="hm-prod" aria-hidden={i >= HOME_PRODUCTS.length || undefined}>
                  <Image src={p.img} alt="" width={176} height={176} />
                  <strong>{p.name}</strong>
                  <span><small>{short(p.sold)} sold</small><span className="badge">Earn RM{((p.price * p.silverRate) / 10000).toFixed(2)}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="levels" className="section" aria-labelledby="h-levels">
          <span className="eyebrow">REZEKII LEVELS</span>
          <h2 id="h-levels">Sell more, level up, earn more.</h2>
          <p className="lead">Every creator starts at Bronze. Silver adds 1% on every Techwide campaign link, and Gold gets special rates.</p>
          <ul className="grid3">
            {LEVELS.map(([lv, name], i) => (
              <li key={lv} className={`card hm-level hm-level-${lv}`}>
                <Emblem level={lv} size={120} animate />
                <h3>{name}</h3>
                <p className="hm-level-key">{BENEFITS[0].v[i]}</p>
                <ul>
                  {BENEFITS.map((b) => (
                    <li key={b.label}><span className="dot" aria-hidden="true" /><span><strong>{b.label}:</strong> {b.v[i]}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section id="control" className="card control" aria-labelledby="h-control">
          <div>
            <span className="eyebrow">YOUR ACCOUNT STAYS YOURS</span>
            <h2 id="h-control">Nothing posts without you.</h2>
            <p className="lead">Rezekii only posts what you choose, when you choose.</p>
          </div>
          <ul>
            <li><span className="dot" />You see a preview and choose who can view each post before anything is sent to TikTok.</li>
            <li><span className="dot" />We never add watermarks, logos or text to your videos.</li>
            <li><span className="dot" />You can cancel a scheduled post any time before it goes out.</li>
            <li><span className="dot" />Disconnect TikTok in Settings, or in the TikTok app under Settings and privacy, Security, Manage app permissions.</li>
          </ul>
        </section>

        <section id="faq" className="section" aria-labelledby="h-faq">
          <span className="eyebrow">QUESTIONS</span>
          <h2 id="h-faq">Good to know.</h2>
          <div className="hm-faqs">
            {FAQS.map(([q, a], i) => (
              <details key={q} className="hm-faq" open={i === 0}>
                <summary>{q}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="hm-cta" aria-labelledby="h-join">
          <h2 id="h-join">Stop leaving money on the table.</h2>
          <p>Join free with your TikTok account in about a minute, and start earning more from the sales you already make.</p>
          <Link href="/signin" className="btn-tiktok"><TikTokLogo />Continue with TikTok</Link>
        </section>

        <section className="about" aria-labelledby="h-about">
          <h2 id="h-about">About Rezekii</h2>
          <p>
            Rezekii is built and run by {COMPANY}, a TikTok Shop partner agency in Malaysia that runs affiliate campaigns with sellers and
            creators. Questions? Email {SUPPORT_EMAIL}.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
