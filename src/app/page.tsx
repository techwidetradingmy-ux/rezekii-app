import Image from "next/image";
import { CreatorFocus, CreatorHealth } from "@/components/landing/focus";
import { SUPPORT } from "@/lib/support";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { AiHead } from "@/components/ui";
import { Reveal } from "@/components/creator1/reveal";
import { JoinBar } from "@/components/join-board";
import { ShowcaseCheck } from "@/components/creator1/showcase-check";
import { PartnerCard } from "@/components/partner-card";
import { ForceLight } from "@/components/landing/force-light";
import { AiEyebrow } from "@/components/landing/ai-eyebrow";
import { CreatorBanner, CreatorBento, CreatorCompare, CreatorDay, CreatorHeroScan, CreatorPains, CreatorSee, CreatorStrip, CreatorUsps } from "@/components/landing/creator";
import { PartnerLine } from "@/components/landing/partner-line";
import { AiText } from "@/components/landing/ai-text";
import { Path, type PathStep } from "@/components/landing/path";
import { Faqs } from "@/components/landing/faqs";
import { FAQS } from "@/lib/mock-creator1";
import "./creator1.css";
import "./landing.css";

export const metadata = { title: "Rezekii · AI-Powered Affiliate Platform" };


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
/** Never lowers a rate (owner, 29 Oct 2026): the scanner only ever offers a raise. */
const NEVER = [
  "Lower your commission",
  "Change anything without your approval",
  "Touch your account settings or bank details",
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
      <ForceLight />
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
          <Link href="/signin?in=1" className="site-signin">Sign In</Link>
        </nav>
        {/* Pain, then hope, then the product working, big (owner, 29 Oct 2026, option A1). Phones: words, picture, then the box. */}
        <div className="site-wrap lp-hero-grid scan">
          <div className="lp-hero-copy lp-hero-top">
            <AiEyebrow text="Malaysia's 1st AI-Powered Affiliate Platform" />
            <h1>Your Showcase Is Underpaid. <em>Rezekii Finds Your Raise.</em></h1>
            <p><AiText text="Rezekii AI finds higher commission on the products you already sell. Same products, more money." /></p>
          </div>
          <div className="lp-hero-vis">
            <CreatorHeroScan />
          </div>
          <div className="lp-hero-copy lp-hero-cta">
            {/* Just the box: the partner badges sit in the row right under the hero (owner, 29 Oct 2026: the rest felt extra). */}
            <ShowcaseCheck />
            <PartnerCard />
          </div>
        </div>
      </header>

      <main className="site-wrap site-main lp-main">
        <CreatorBanner />

        {/* What makes Rezekii different, and the three things to remember (owner, 31 Oct 2026). */}
        <Reveal id="why" className="section" label="Why Rezekii">
          <div className="lp-head">
            <span className="eyebrow">WHY REZEKII</span>
            <h2>Your Data. Your To-Do List.</h2>
          </div>
          <CreatorFocus />
        </Reveal>

        <Reveal id="health" className="section" label="TikTok Shop Health Scanner">
          <CreatorHealth />
        </Reveal>

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

        <CreatorStrip />

        <Reveal className="section" label="Affiliate problems">
          <div className="lp-head">
            <span className="eyebrow">MADE FOR AFFILIATES</span>
            <h2>Every Affiliate Headache, Sorted</h2>
          </div>
          <CreatorPains />
        </Reveal>

        <Reveal id="how" className="section" label="A day with Rezekii">
          <div className="lp-head">
            <span className="eyebrow">HOW REZEKII HELPS</span>
            <AiHead title="A Day With Rezekii" sub="Watch Rezekii AI do the small jobs, hour by hour." />
          </div>
          <CreatorDay />
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
            <span className="eyebrow">WHAT CREATORS SAY</span>
            <h2>Same Products, More Commission</h2>
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

        {/* Our vision as the last ask (owner, 29 Oct 2026): join now and build Malaysia's largest affiliate community. */}
        <Reveal className="lp-final" label="Join us">
          <span className="eyebrow">OUR VISION</span>
          <h2>Let&apos;s Build Malaysia&apos;s Largest Affiliate Community</h2>
          <p>Big or small, every creator deserves more.</p>
          <Link href="/signin" className="np-btn lp-bigbtn">Join Us Today <Icon name="arrow" size={20} /></Link>
          <span className="lp-final-note">Join for Free Now. No Minimum Follower Required.</span>
          <PartnerLine center />
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii</span>
          <span className="site-spacer" />
          <Link href="/seller">For sellers</Link>
          <Link href="/signin?in=1">Sign in</Link>
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
          {/* Small print lives in the footer, not between sections (owner, 30 Oct 2026). */}
          <small className="ft-note">Screens show sample products and numbers. Results vary.</small>
        </div>
      </footer>
    </>
  );
}
