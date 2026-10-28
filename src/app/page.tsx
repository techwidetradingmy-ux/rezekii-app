import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { Icon, type IconName } from "@/components/icons";
import { ScanAnim } from "@/components/creator1/scan";
import { Reveal } from "@/components/creator1/reveal";
import { FAQS, STORIES } from "@/lib/mock-creator1";
import "./creator1.css";

export const metadata = { title: "Rezekii · More commission from your showcase" };

const VS: [string, string][] = [
  ["Checking products one by one", "One scan checks them all"],
  ["Missing chances", "New chances daily"],
  ["Uploading to every app", "Post once, everywhere"],
  ["Commission only", "Commission, Free Samples, rewards, soon paid reviews"],
  ["Nobody notices your work", "More reach, bigger brand"],
];

type Feat = { icon: IconName; bg: string; title: string; line: string; demo: React.ReactNode; soon?: boolean };
const FEATS: Feat[] = [
  {
    icon: "scan", bg: "linear-gradient(135deg,#22dc95,#00a862)", title: "Scan & one-tap raise",
    line: "Find higher rates for your products. Add them in one tap.",
    demo: <span className="cr1-d-rate"><s>6%</s><Icon name="arrow" size={16} /><b>7%</b><span className="badge">from +1%</span></span>,
  },
  {
    icon: "spark", bg: "linear-gradient(135deg,#b48cff,#6d28d9)", title: "AI picks",
    line: "AI tells you what to sell next, on video or LIVE.",
    demo: <span className="cr1-d-seq"><span className="cr1-d-chip"><Icon name="video" size={13} /> Video 3.4%</span><span className="cr1-d-chip live">LIVE 6.3%</span><span className="cr1-d-chip">Match 96</span></span>,
  },
  {
    icon: "gift", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)", title: "Free Samples",
    line: "Get products free. Post 3 videos each; post early for a bonus.",
    demo: <span className="cr1-d-vids"><i /><i /><i /><small>3 videos per sample</small></span>,
  },
  {
    icon: "send", bg: "linear-gradient(135deg,#ffb35c,#f08a00)", title: "Post everywhere",
    line: "Upload once, post to every app.",
    demo: <span className="cr1-d-seq light">{["TikTok", "Facebook", "Instagram", "Threads"].map((p) => <span key={p} className="cr1-pchip">{p}</span>)}</span>,
  },
  {
    icon: "trophy", bg: "linear-gradient(135deg,#ffd34d,#e8a400)", title: "Missions & rewards",
    line: "Earn credits for posting, not for logging in.",
    demo: <span className="cr1-d-bar"><span className="v2-meter"><i /></span><b>+30</b></span>,
  },
  {
    icon: "medal", bg: "linear-gradient(135deg,#9aa8a1,#43524b)", title: "Levels: Bronze, Silver, Gold",
    line: "Better rates as you grow. Silver from TikTok Lv.4 or RM 10,000 sales a month. Gold in Techwide's agency.",
    demo: <span className="cr1-d-medals"><i className="b">B</i><i className="s">S</i><i className="g">G</i></span>,
  },
  {
    icon: "users", bg: "linear-gradient(135deg,#ff7aa8,#e8005a)", title: "Invite friends",
    line: "Share your link. You both get rewards when they start.",
    demo: <span className="cr1-d-invite"><span className="v2-av">AR</span><i /><span className="v2-av" style={{ background: "linear-gradient(135deg,#ff7aa8,#e8005a)", color: "#ffffff" }}>NB</span></span>,
  },
  {
    icon: "video", bg: "linear-gradient(135deg,#25f4ee,#0e7490)", title: "Branded Mission paid reviews", soon: true,
    line: "Brands pay you to review, plus commission.",
    demo: <span className="cr1-d-soon"><Icon name="cal" size={16} /> Coming soon</span>,
  },
];

const PATH: [IconName, string, string, boolean?][] = [
  ["wallet", "Commission", "From TikTok Shop"],
  ["scan", "Better commission", "Same products, higher rate"],
  ["gift", "Free Samples", "Sent to your door"],
  ["trophy", "Mission rewards", "Credits for posting"],
  ["video", "Paid reviews", "Coming soon", true],
];

const READ = [
  "Your showcase products and rates",
  "Your orders and commission",
  "Your sample status",
  "Your public TikTok stats, if linked",
];
const NEVER = [
  "Change anything without your tap",
  "Ask for your TikTok password",
  "Share your contact details with sellers",
  "Sell your data",
];

/** Creator site: a sales page. Pain → ideal, every feature, stories, three steps, peace of mind, FAQ, one CTA throughout. */
export default function Landing() {
  return (
    <>
      <DemoStrip />
      <header className="site-hero cr1-hero">
        <span className="hm-grid" aria-hidden="true" />
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href="/" className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          <a href="#features">Features</a>
          <a href="#stories">Stories</a>
          <a href="#faq">FAQ</a>
          <Link href="/seller">For sellers</Link>
          <span className="site-spacer" />
          <Link href="/signin" className="site-signin">Sign in</Link>
        </nav>
        <div className="site-wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="dot" aria-hidden="true" />FOR TIKTOK SHOP CREATORS IN MALAYSIA</span>
            <h1>Your showcase may have <em>higher commission</em> waiting</h1>
            <p>We find higher rates for products you already promote. Add them all in one tap.</p>
            <div className="hero-ctas">
              <Link href="/signin" className="np-btn cr1-bigbtn">Check my showcase free <Icon name="arrow" size={20} /></Link>
              <a href="#how" className="btn-ghost">How it works</a>
            </div>
            <ul className="hero-checks">
              {["Free for creators", "No follower minimum", "Nothing changes without you"].map((c) => (
                <li key={c}><Icon name="check" size={16} stroke="#00c073" width={3} />{c}</li>
              ))}
            </ul>
            <div className="cr1-partner">
              <span className="cr1-partner-logo">
                <Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={103} height={30} />
              </span>
              <span>By Techwide Marketing, a TikTok Shop partner</span>
            </div>
          </div>
          <div className="hero-card-wrap">
            <ScanAnim variant="hero" loop ms={6200} />
          </div>
        </div>
      </header>

      <main className="site-wrap site-main cr1-main">
        <Reveal className="section" label="Before and with Rezekii">
          <span className="eyebrow">BEFORE VS WITH REZEKII</span>
          <h2>Same videos. Less guessing. More ways to earn.</h2>
          <div className="v2-vs cr1-stag">
            <div className="old">
              <h3>Before</h3>
              <ul>
                {VS.map(([o]) => (
                  <li key={o}><span className="v2-x"><Icon name="x" size={12} width={3} /></span>{o}</li>
                ))}
              </ul>
            </div>
            <div className="new">
              <h3>With Rezekii</h3>
              <ul>
                {VS.map(([, n]) => (
                  <li key={n}><span className="v2-ok"><Icon name="check" size={12} width={3.2} /></span>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal id="features" className="section" label="Features">
          <span className="eyebrow">EVERYTHING IN ONE APP</span>
          <h2>Every tool a TikTok Shop creator needs</h2>
          <div className="cr1-feats cr1-stag">
            {FEATS.map((f) => (
              <article key={f.title} className={`cr1-feat ${f.soon ? "soon" : ""}`}>
                <div className="v2-row" style={{ justifyContent: "space-between" }}>
                  <span className="cr1-ico" style={{ background: f.bg }}><Icon name={f.icon} size={24} /></span>
                  {f.soon && <span className="badge badge-amber">Coming soon</span>}
                </div>
                <h3>{f.title}</h3>
                <p>{f.line}</p>
                <div className="cr1-demo">{f.demo}</div>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal id="earn" className="section cr1-earn" label="More ways to earn">
          <span className="eyebrow">MORE WAYS TO EARN</span>
          <h2>From your first better rate to paid reviews</h2>
          <p className="lead">Each step adds another way to earn.</p>
          <ol className="cr1-path cr1-stag">
            {PATH.map(([icon, t, l, soon], i) => (
              <li key={t} className={soon ? "soon" : undefined}>
                <span className="cr1-node"><Icon name={icon} size={24} /><b>{i + 1}</b></span>
                <span>
                  <strong>{t}</strong>
                  <small>{l}</small>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal id="stories" className="section" label="Creator stories">
          <span className="eyebrow">REAL STORIES</span>
          <h2>Creators who checked</h2>
          <div className="cr1-stories cr1-stag">
            {STORIES.map((s) => (
              <article key={s.handle} className="cr1-story">
                <div className="cr1-story-top">
                  <span className="v2-av" style={{ background: s.bg, color: "#ffffff", width: 44, height: 44, fontSize: 15 }}>{s.initials}</span>
                  <span>
                    <b>{s.name}</b>
                    <small>{s.handle} · {s.state}</small>
                  </span>
                  <span className={`badge ${s.level === "Gold" ? "badge-amber" : s.level === "Silver" ? "badge-blue" : "badge-gray"}`}>{s.level}</span>
                </div>
                <div className="cr1-story-big">
                  <b>{s.big}</b>
                  <span>{s.bigLabel}</span>
                </div>
                <blockquote>&ldquo;{s.quote}&rdquo;</blockquote>
                <div className="cr1-story-facts">
                  {s.facts.map(([v, l]) => (
                    <span key={l}><b>{v}</b><small>{l}</small></span>
                  ))}
                </div>
                <footer><Icon name="check" size={14} width={3} /> Oct 2026 · Shared with permission</footer>
              </article>
            ))}
          </div>
          <p className="hm-fine">Real results, shared with permission. Results vary; we don&apos;t promise income.</p>
        </Reveal>

        <Reveal id="how" className="section" label="Three steps">
          <span className="eyebrow">THREE STEPS</span>
          <h2>Start in about a minute</h2>
          <ol className="grid3 cr1-stag">
            {[
              ["Link TikTok Shop", "Sign in, then approve access in TikTok.", "About 1 minute"],
              ["Scan", "We check every product in your showcase.", "A few minutes"],
              ["Add in one tap", "Pick the better rates, or add all.", "Checked daily"],
            ].map(([t, l, b], i) => (
              <li key={t} className="card hm-step">
                <span className="step-n">{i + 1}</span>
                <strong>{t}</strong>
                <span>{l}</span>
                <span className="badge">{b}</span>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="section" label="Peace of mind">
          <span className="eyebrow">PEACE OF MIND</span>
          <h2>Your account stays yours</h2>
          <div className="cr1-trust cr1-stag">
            <div className="cr1-tcard">
              <h3><span className="cr1-tico"><Icon name="eye" size={20} /></span>What we read</h3>
              <ul>
                {READ.map((r) => <li key={r}><span className="dot" aria-hidden="true" />{r}</li>)}
              </ul>
            </div>
            <div className="cr1-tcard never">
              <h3><span className="cr1-tico green"><Icon name="shield" size={20} /></span>What we never do</h3>
              <ul>
                {NEVER.map((r) => <li key={r}><span className="v2-ok"><Icon name="check" size={12} width={3.2} /></span>{r}</li>)}
              </ul>
            </div>
          </div>
          <p className="hm-fine">Disconnect TikTok Shop or delete your account anytime.</p>
        </Reveal>

        <Reveal id="faq" className="section" label="Questions">
          <span className="eyebrow">QUESTIONS</span>
          <h2>Good to know</h2>
          <div className="hm-faqs">
            {FAQS.map(([q, a]) => (
              <details key={q} className="hm-faq">
                <summary>{q}<Icon name="plus" size={20} /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal className="hm-cta cr1-cta" label="Get started">
          <h2>See what your showcase is missing</h2>
          <p>Free and quick. Nothing changes until you tap Add.</p>
          <Link href="/signin" className="v2-btn-white cr1-bigwhite">Check my showcase free <Icon name="arrow" size={20} /></Link>
          <span className="cr1-cta-note">No follower minimum · Malaysia</span>
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii</span>
          <span className="site-spacer" />
          <Link href="/seller">For sellers</Link>
          <Link href="/signin">Sign in</Link>
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
          <a href="mailto:support@rezekii.com">support@rezekii.com</a>
        </div>
      </footer>
    </>
  );
}
