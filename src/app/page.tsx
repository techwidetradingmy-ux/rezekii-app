import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { AiHead } from "@/components/ui";
import { Reveal } from "@/components/creator1/reveal";
import { JoinBar } from "@/components/join-board";
import { ShowcaseCheck } from "@/components/creator1/showcase-check";
import { PartnerCard } from "@/components/partner-card";
import { AiEyebrow } from "@/components/landing/ai-eyebrow";
import { CreatorBento, CreatorCompare, CreatorDay, CreatorHeroPhone, CreatorSee, CreatorUsps } from "@/components/landing/creator";
import { PartnerLine } from "@/components/landing/partner-line";
import { Path, type PathStep } from "@/components/landing/path";
import { Faqs } from "@/components/landing/faqs";
import { FAQS } from "@/lib/mock-creator1";
import "./creator1.css";
import "./landing.css";

export const metadata = { title: "Rezekii · AI-Powered Affiliate Platform" };

const CHIPS = ["Free During Beta", "No Follower Minimum", "Nothing Changes Without You"];

const START: PathStep[] = [
  { icon: "user", title: "Sign Up", line: "Free during Beta. About 1 minute." },
  { icon: "link", title: "Link TikTok Shop", line: "Approve access in TikTok. Unlink anytime." },
  { icon: "scan", title: "Scan & Add", line: "Rezekii AI checks every product. Add better rates in one tap." },
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

/**
 * Creator site, "Watch Rezekii Work" (owner, 29 Oct 2026): Rezekii is an AI-powered affiliate platform that helps TikTok Shop
 * creators through their journey, free during Beta. The page is a live demo: what you get → without vs with → a day with
 * Rezekii → everything in one app → what you'll see → 3 steps → peace of mind → FAQ → one CTA.
 */
export default function Landing() {
  return (
    <>
      <DemoStrip />
      <JoinBar />
      <header className="lp-hero">
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href="/" className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#see">What You&apos;ll See</a>
          <a href="#faq">FAQ</a>
          <span className="site-spacer" />
          <Link href="/seller" className="lp-keep">For Sellers</Link>
          <Link href="/signin" className="site-signin">Sign In</Link>
        </nav>
        <div className="site-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <AiEyebrow />
            <h1>Your Showcase May Have <em>Higher Commission</em> Waiting</h1>
            <p>Rezekii AI finds better rates, trending products and your best time to post. You just make the videos.</p>
            <ShowcaseCheck />
            <PartnerLine />
            <ul className="lp-chips">
              {CHIPS.map((c) => (
                <li key={c}><Icon name="check" size={14} width={3} />{c}</li>
              ))}
            </ul>
          </div>
          <div className="lp-hero-vis">
            <CreatorHeroPhone />
          </div>
        </div>
      </header>

      <main className="site-wrap site-main lp-main">
        <PartnerCard />

        <Reveal className="section" label="What you get">
          <div className="lp-head">
            <span className="eyebrow">WHAT YOU GET</span>
            <h2>Your AI Affiliate Helper</h2>
          </div>
          <CreatorUsps />
        </Reveal>

        <Reveal className="section" label="Without and with Rezekii">
          <div className="lp-head">
            <span className="eyebrow">THE DIFFERENCE</span>
            <h2>Without Rezekii vs With Rezekii</h2>
          </div>
          <CreatorCompare />
        </Reveal>

        <Reveal id="how" className="section" label="A day with Rezekii">
          <div className="lp-head">
            <span className="eyebrow">HOW REZEKII HELPS</span>
            <AiHead title="A Day With Rezekii" sub="Watch Rezekii AI do the small jobs, hour by hour." />
          </div>
          <CreatorDay />
          <p className="hm-fine">Screens show sample products and numbers. Results vary.</p>
        </Reveal>

        <Reveal id="features" className="section" label="Features">
          <div className="lp-head">
            <span className="eyebrow">EVERYTHING IN ONE APP</span>
            <h2>Everything in One App</h2>
          </div>
          <CreatorBento />
        </Reveal>

        <Reveal id="see" className="section" label="What you'll see">
          <div className="lp-head">
            <span className="eyebrow">WHAT YOU&apos;LL SEE</span>
            <h2>Real Screens From the App</h2>
          </div>
          <CreatorSee />
        </Reveal>

        <Reveal id="start" className="section" label="Start in 3 steps">
          <div className="lp-head">
            <span className="eyebrow">THREE STEPS</span>
            <h2>Start in 3 Steps</h2>
          </div>
          <Path steps={START} label="Steps to start" />
        </Reveal>

        <Reveal className="section" label="Peace of mind">
          <div className="lp-head">
            <span className="eyebrow">PEACE OF MIND</span>
            <h2>Your Account Stays Yours</h2>
          </div>
          <div className="lp-trust">
            <div>
              <h3><Icon name="eye" size={18} /> What We Read</h3>
              <ul>{READ.map((r) => <li key={r}><span className="dot" aria-hidden="true" />{r}</li>)}</ul>
            </div>
            <div className="never">
              <h3><Icon name="shield" size={18} /> What We Never Do</h3>
              <ul>{NEVER.map((r) => <li key={r}><Icon name="check" size={14} width={3} />{r}</li>)}</ul>
            </div>
          </div>
          <p className="hm-fine">Disconnect TikTok Shop or delete your account anytime.</p>
        </Reveal>

        <Reveal id="faq" className="section" label="Questions">
          <div className="lp-head">
            <span className="eyebrow">QUESTIONS</span>
            <h2>Good to Know</h2>
          </div>
          <Faqs items={FAQS} />
        </Reveal>

        <Reveal className="lp-final" label="Get started">
          <h2>See What Your Showcase Is Missing</h2>
          <p>Free during Beta.</p>
          <Link href="/signin" className="np-btn lp-bigbtn">Check My Showcase <Icon name="arrow" size={20} /></Link>
          <span className="lp-final-note">No follower minimum · Malaysia</span>
          <PartnerLine center />
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
