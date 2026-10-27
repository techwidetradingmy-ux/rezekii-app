import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { Icon, type IconName } from "@/components/icons";
import { ScanAnim } from "@/components/creator1/scan";
import { Reveal } from "@/components/creator1/reveal";
import { FAQS, STORIES } from "@/lib/mock-creator1";
import "./creator1.css";

export const metadata = { title: "Rezekii · More commission from the showcase you already have" };

const VS: [string, string][] = [
  ["Checking hundreds of products one by one", "One scan checks your whole showcase"],
  ["Never knowing what you're missing", "New chances every day, sent to you"],
  ["Uploading the same video to every app", "Post once to TikTok, Facebook, Instagram and Threads"],
  ["Commission is your only income", "Commission, free samples, mission rewards, and soon Branded Mission paid reviews"],
  ["Working hard and nobody notices", "More reach and a bigger personal brand"],
];

type Feat = { icon: IconName; bg: string; title: string; line: string; demo: React.ReactNode; soon?: boolean };
const FEATS: Feat[] = [
  {
    icon: "scan", bg: "linear-gradient(135deg,#22dc95,#00a862)", title: "Scan & one-tap raise",
    line: "We check every product you promote. Where Techwide pays more for the same product, switch in one tap.",
    demo: <span className="cr1-d-rate"><s>12%</s><Icon name="arrow" size={16} /><b>20%</b><span className="badge">+8 pts</span></span>,
  },
  {
    icon: "spark", bg: "linear-gradient(135deg,#b48cff,#6d28d9)", title: "AI picks",
    line: "What to promote next, with the reason written out. For Silver and Gold creators.",
    demo: <span className="cr1-d-seq"><span className="cr1-srcchip data">Your data</span><span className="cr1-srcchip tap">Techwide TAP</span><span className="cr1-srcchip trend">TikTok trending</span></span>,
  },
  {
    icon: "gift", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)", title: "Free samples",
    line: "Open, Advanced and Designated samples. Post 3 videos per sample, and post early for a bonus.",
    demo: <span className="cr1-d-vids"><i /><i /><i /><small>3 videos per sample</small></span>,
  },
  {
    icon: "send", bg: "linear-gradient(135deg,#ffb35c,#f08a00)", title: "Post everywhere",
    line: "Upload once. Schedule the same video to TikTok, Facebook, Instagram and Threads.",
    demo: <span className="cr1-d-seq light">{["TikTok", "Facebook", "Instagram", "Threads"].map((p) => <span key={p} className="cr1-pchip">{p}</span>)}</span>,
  },
  {
    icon: "trophy", bg: "linear-gradient(135deg,#ffd34d,#e8a400)", title: "Missions & rewards",
    line: "Daily missions, streaks and chests. Credits for real actions like posting, not for logging in.",
    demo: <span className="cr1-d-bar"><span className="v2-meter"><i /></span><b>+30</b></span>,
  },
  {
    icon: "medal", bg: "linear-gradient(135deg,#9aa8a1,#43524b)", title: "Levels: Bronze, Silver, Gold",
    line: "Better rates as you grow. Silver from TikTok Lv.4 or RM 10,000 in monthly sales; Gold in Techwide's agency.",
    demo: <span className="cr1-d-medals"><i className="b">B</i><i className="s">S</i><i className="g">G</i></span>,
  },
  {
    icon: "users", bg: "linear-gradient(135deg,#ff7aa8,#e8005a)", title: "Invite friends",
    line: "Share your link or QR. You both get rewards once your friend gets going.",
    demo: <span className="cr1-d-invite"><span className="v2-av">AR</span><i /><span className="v2-av" style={{ background: "linear-gradient(135deg,#ff7aa8,#e8005a)", color: "#ffffff" }}>NB</span></span>,
  },
  {
    icon: "video", bg: "linear-gradient(135deg,#25f4ee,#0e7490)", title: "Branded Mission paid reviews", soon: true,
    line: "Brands pay you a fee to review their product, on top of your commission.",
    demo: <span className="cr1-d-soon"><Icon name="cal" size={16} /> Coming soon</span>,
  },
];

const PATH: [IconName, string, string, boolean?][] = [
  ["wallet", "Commission", "What TikTok Shop pays you today"],
  ["scan", "Better commission", "Same products, a higher rate through Techwide"],
  ["gift", "Free samples", "Products to review, sent to your door"],
  ["trophy", "Mission rewards", "Credits for posting and growing"],
  ["video", "Paid reviews", "Branded Mission, coming soon", true],
];

const READ = [
  "The products in your showcase and their commission",
  "Your orders and commission, to show you your own numbers",
  "Your sample status from TikTok",
  "Your public TikTok profile and video stats, if you link TikTok",
];
const NEVER = [
  "Post, add, remove or change anything without you tapping the button",
  "Ask for your TikTok password",
  "Show your WhatsApp number or email to sellers. Contact details are only for the Techwide team",
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
            <p>
              Rezekii checks every product you already promote against Techwide&apos;s TikTok Shop campaigns. Where the same product pays more, you
              switch in one tap.
            </p>
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
              <span>Built by Techwide Marketing, a TikTok Shop partner agency in Malaysia</span>
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
          <p className="lead">One feature, one place. Start with the scan; the rest is there when you need it.</p>
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
          <p className="lead">We walk the whole affiliate journey with you. Each step adds a way to earn on top of the last one.</p>
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
          <p className="hm-fine">Each creator&apos;s own results, shared with their permission. Results depend on your products, videos and audience; Rezekii doesn&apos;t promise income.</p>
        </Reveal>

        <Reveal id="how" className="section" label="Three steps">
          <span className="eyebrow">THREE STEPS</span>
          <h2>Start in about a minute</h2>
          <ol className="grid3 cr1-stag">
            {[
              ["Link TikTok Shop", "Sign in, then approve read access in TikTok. Signing in alone doesn't link your shop.", "About 1 minute"],
              ["Scan", "We check every product in your showcase against Techwide's campaigns, at the rate for your level.", "Usually a few minutes"],
              ["Add in one tap", "Pick the better rates, or add them all. We confirm each one with TikTok.", "Re-checked every day"],
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
          <p className="hm-fine">You can disconnect TikTok Shop in Rezekii or in TikTok at any time, and delete your account and data whenever you like.</p>
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
          <p>It&apos;s free, takes about a minute, and nothing changes in your shop unless you tap Add.</p>
          <Link href="/signin" className="v2-btn-white cr1-bigwhite">Check my showcase free <Icon name="arrow" size={20} /></Link>
          <span className="cr1-cta-note">No follower minimum · Malaysia</span>
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Techwide Marketing Sdn Bhd (202001017785)</span>
          <span className="site-spacer" />
          <Link href="/seller">For sellers</Link>
          <Link href="/signin">Sign in</Link>
          <a href="mailto:support@rezekii.com">support@rezekii.com</a>
        </div>
      </footer>
    </>
  );
}
