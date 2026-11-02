import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser } from "@/app/current-user";
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
import { CreatorBanner, CreatorBento, CreatorCompare, CreatorDay, CreatorHeroScan, CreatorPains, CreatorReport, CreatorSee, CreatorStrip, CreatorUsps } from "@/components/landing/creator";
import { PartnerLine } from "@/components/landing/partner-line";
import { AiText } from "@/components/landing/ai-text";
import { Rich } from "@/components/landing/bits";
import { Path, type PathStep } from "@/components/landing/path";
import { Faqs } from "@/components/landing/faqs";
import { FAQS } from "@/lib/mock-creator1";
import { LangSwitch } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import { getLang, tFor } from "@/lib/i18n/server";
import "./creator1.css";
import "./landing.css";

/** The tab title in her language (owner, 3 Nov 2026). */
export async function generateMetadata() {
  const t = tFor(await getLang());
  return { title: t("Rezekii · AI-Powered Affiliate Platform") };
}

const START: PathStep[] = [
  { icon: "user", title: tx("Sign Up"), line: tx("Free during Beta. About 1 minute.") },
  { icon: "link", title: tx("Link TikTok Shop"), line: tx("Approve access in TikTok. Unlink anytime.") },
  { icon: "scan", title: tx("Scan & Add"), line: tx("Rezekii AI checks every product. Add better rates in one tap.") },
];

const READ = [
  tx("Your showcase products and rates"),
  tx("Your orders and commission"),
  tx("Your sample status"),
  tx("Your public TikTok stats, if linked"),
];
/** Never lowers a rate (owner, 29 Oct 2026): the scanner only ever offers a raise. */
const NEVER = [
  tx("Lower your commission"),
  tx("Change anything without your approval"),
  tx("Touch your account settings or bank details"),
  tx("Ask for your TikTok password"),
  tx("Share your contact details with sellers"),
  tx("Sell your data"),
];
const PARTS = [tx("Better rates"), tx("AI Picks"), tx("Health check")];

/**
 * Creator site, "Watch Rezekii Work" (owner, 29 Oct 2026): Rezekii is an AI-powered affiliate platform that helps TikTok Shop
 * creators through their journey, free during Beta. The page is a live demo: what you get → without vs with → a day with
 * Rezekii → everything in one app → what you'll see → 3 steps → peace of mind → FAQ → one CTA.
 * In English, Malay or Chinese (owner, 3 Nov 2026), with the language switch in the top bar for visitors.
 */
export default async function Landing() {
  // Signed in (owner, 2 Nov 2026): straight into the app. Admins still see the site.
  const user = await currentUser();
  if (user && user.role !== "admin") redirect("/app");
  const t = tFor(await getLang());
  return (
    <>
      <ForceLight />
      <DemoStrip />
      <JoinBar />
      <header className="lp-hero">
        <nav className="site-nav site-wrap" aria-label={t("Main menu")}>
          <Link href="/" className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          <a href="#how">{t("How It Works")}</a>
          <a href="#features">{t("Features")}</a>
          <a href="#see">{t("What You'll See")}</a>
          <a href="#faq">{t("FAQ")}</a>
          <span className="site-spacer" />
          <Link href="/seller" className="lp-keep">{t("For Sellers")}</Link>
          <LangSwitch compact />
          <Link href="/signin?in=1" className="site-signin">{t("Sign In")}</Link>
        </nav>
        {/* Pain, then hope, then the product working, big (owner, 29 Oct 2026, option A1). Phones: words, picture, then the box. */}
        <div className="site-wrap lp-hero-grid scan">
          <div className="lp-hero-copy lp-hero-top">
            <AiEyebrow text={t("Malaysia's 1st AI-Powered Affiliate Platform")} />
            <h1><Rich text={t("Your Showcase Is Underpaid. *Rezekii Finds Your Raise.*")} /></h1>
            <p><AiText text={t("Rezekii AI finds higher commission on the products you already sell. Same products, more money.")} /></p>
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

        {/* Your free report (owner, 1 Nov 2026, option D): the three main tools up top, then one banner to get it. */}
        <Reveal id="report" className="section" label={t("Your free report")}>
          <div className="lp-head">
            <span className="eyebrow">{t("YOUR FREE REPORT")}</span>
            <h2>{t("Your Account, Checked in 3 Parts")}</h2>
          </div>
          <CreatorReport />
          <div className="lp-rbanner">
            <span className="lp-rbanner-ic" aria-hidden="true"><Icon name="scan" size={120} /></span>
            <span className="lp-rcta-free"><Icon name="gift" size={14} /> {t("Free during Beta")}</span>
            <h3>{t("Get Your Own Report, Free Today")}</h3>
            <ul className="lp-rbanner-parts">
              {PARTS.map((x) => <li key={x}><Icon name="check" size={13} width={3} />{t(x)}</li>)}
            </ul>
            <Link href="/signin" className="np-btn lp-rbanner-go">{t("Get My Free Report")} <Icon name="arrow" size={19} /></Link>
          </div>
        </Reveal>

        <Reveal className="section" label={t("What you get")}>
          <div className="lp-head">
            <span className="eyebrow">{t("WHAT YOU GET")}</span>
            <h2>{t("Your AI Affiliate Helper")}</h2>
          </div>
          <CreatorUsps />
        </Reveal>

        <Reveal className="section" label={t("Without and with Rezekii")}>
          <div className="lp-head">
            <span className="eyebrow">{t("THE DIFFERENCE")}</span>
            <h2>{t("Without Rezekii vs With Rezekii")}</h2>
          </div>
          <CreatorCompare />
        </Reveal>

        <CreatorStrip />

        <Reveal className="section" label={t("Affiliate problems")}>
          <div className="lp-head">
            <span className="eyebrow">{t("MADE FOR AFFILIATES")}</span>
            <h2>{t("Every Affiliate Headache, Sorted")}</h2>
          </div>
          <CreatorPains />
        </Reveal>

        <Reveal id="how" className="section" label={t("A day with Rezekii")}>
          <div className="lp-head">
            <span className="eyebrow">{t("HOW REZEKII HELPS")}</span>
            <AiHead title={t("A Day With Rezekii")} sub={t("Watch Rezekii AI do the small jobs, hour by hour.")} />
          </div>
          <CreatorDay />
        </Reveal>

        <Reveal id="features" className="section" label={t("Features")}>
          <div className="lp-head">
            <span className="eyebrow">{t("EVERYTHING IN ONE APP")}</span>
            <h2>{t("Everything in One App")}</h2>
          </div>
          <CreatorBento />
        </Reveal>

        <Reveal id="see" className="section" label={t("What you'll see")}>
          <div className="lp-head">
            <span className="eyebrow">{t("WHAT CREATORS SAY")}</span>
            <h2>{t("Same Products, More Commission")}</h2>
          </div>
          <CreatorSee />
        </Reveal>

        <Reveal id="start" className="section" label={t("Start in 3 steps")}>
          <div className="lp-head">
            <span className="eyebrow">{t("THREE STEPS")}</span>
            <h2>{t("Start in 3 Steps")}</h2>
          </div>
          <Path steps={START.map((s) => ({ ...s, title: t(s.title), line: t(s.line) }))} label={t("Steps to start")} />
        </Reveal>

        <Reveal className="section" label={t("Peace of mind")}>
          <div className="lp-head">
            <span className="eyebrow">{t("PEACE OF MIND")}</span>
            <h2>{t("Your Account Stays Yours")}</h2>
          </div>
          <div className="lp-trust">
            <div>
              <h3><Icon name="eye" size={18} /> {t("What We Read")}</h3>
              <ul>{READ.map((r) => <li key={r}><span className="dot" aria-hidden="true" />{t(r)}</li>)}</ul>
            </div>
            <div className="never">
              <h3><Icon name="shield" size={18} /> {t("What We Never Do")}</h3>
              <ul>{NEVER.map((r) => <li key={r}><Icon name="check" size={14} width={3} />{t(r)}</li>)}</ul>
            </div>
          </div>
          <p className="hm-fine">{t("Disconnect TikTok Shop or delete your account anytime.")}</p>
        </Reveal>

        <Reveal id="faq" className="section" label={t("Questions")}>
          <div className="lp-head">
            <span className="eyebrow">{t("QUESTIONS")}</span>
            <h2>{t("Good to Know")}</h2>
          </div>
          <Faqs items={FAQS.map(([q, a]): [string, string] => [t(q), t(a)])} />
        </Reveal>

        {/* Our vision as the last ask (owner, 29 Oct 2026): join now and build Malaysia's largest affiliate community. */}
        <Reveal className="lp-final" label={t("Join us")}>
          <span className="eyebrow">{t("OUR VISION")}</span>
          <h2>{t("Let's Build Malaysia's Largest Affiliate Community")}</h2>
          <p>{t("Big or small, every creator deserves more.")}</p>
          <Link href="/signin" className="np-btn lp-bigbtn">{t("Join Us Today")} <Icon name="arrow" size={20} /></Link>
          <span className="lp-final-note">{t("Join for Free Now. No Minimum Follower Required.")}</span>
          <PartnerLine center />
        </Reveal>
      </main>

      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii</span>
          <span className="site-spacer" />
          <Link href="/seller">{t("For Sellers")}</Link>
          <Link href="/signin?in=1">{t("Sign in")}</Link>
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">{t("Privacy Policy")}</a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">{t("Terms of Service")}</a>
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
          {/* Small print lives in the footer, not between sections (owner, 30 Oct 2026). */}
          <small className="ft-note">{t("Screens show sample products and numbers. Results vary.")}</small>
        </div>
      </footer>
    </>
  );
}
