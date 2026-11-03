"use client";

import "@/app/seller.css";
import "@/app/custom-service.css";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Columns, Count, Stat } from "@/components/ui";
import { ConnBanner, ContactSheet, Rich, Source } from "@/components/seller/seller-ui";
import { JoinBoard } from "@/components/join-board";
import { SELLER, SELLER_RESULTS, rm } from "@/lib/mock";
import { RESULTS, SHOP_ITEMS } from "@/lib/mock-seller";
import { useDemo } from "@/components/demo";
import { LiveActivity, LiveHello, LiveNext, LiveSummary, useSellerHome } from "@/components/seller/live-home";
import { useConnectResult } from "@/components/seller/live-connect";
import { useT } from "@/lib/i18n/client";
import { GettingStarted } from "@/components/guide";
import { tx, type T } from "@/lib/i18n/lang";

type StageKey = "new" | "fix" | "waiting" | "running";

/** The sample's recent activity, in her language (shop, product and creator names stay as they are). */
const activity = (t: T): { icon: IconName; tone?: "red" | "amber" | "blue"; text: string; sub: string; when: string; href: string }[] => [
  { icon: "check", text: t("{product} passed our review", { product: "Spin chopper 1.5L" }), sub: t("Next: it goes to TikTok"), when: "10:40", href: "/seller/app/progress" },
  { icon: "video", tone: "blue", text: t("<b>{handle}</b> went LIVE with your {product}", { handle: "@kak.ros.kitchen", product: "casserole pot" }), sub: t("{n} units sold during the LIVE", { n: 38 }), when: "09:05", href: "/seller/app/results" },
  { icon: "alert", tone: "red", text: t("<b>{handle}</b> is {n} days late on a sample", { handle: "@zara.home", n: 3 }), sub: t("No video yet · reminded twice · samples paused"), when: t("Yesterday"), href: "/seller/app/results/samples" },
  { icon: "send", tone: "amber", text: t("{product} went to TikTok", { product: "Cordless vacuum, pet hair edition" }), sub: t("TikTok usually replies in 1–3 working days"), when: "25 Oct", href: "/seller/app/progress" },
  { icon: "video", tone: "blue", text: t("<b>{handle}</b> posted a 2nd video for your {product}", { handle: "@mei.ling.deals", product: "tumbler" }), sub: t("1 video promised · 2 posted"), when: "24 Oct", href: "/seller/app/results/samples" },
];

const QUICK: [string | null, string, string, IconName, string][] = [
  ["/seller/app/submit", tx("Register products"), tx("Once, in your own campaign"), "plus", "linear-gradient(135deg,#22dc95,#00a862)"],
  ["/seller/app/results", tx("See results"), tx("Sales, creators, videos"), "chart", "linear-gradient(135deg,#7aa2ff,#1d4ed8)"],
  ["/seller/app/results/samples", tx("Where samples went"), tx("Who got each one"), "box", "linear-gradient(135deg,#ffb35c,#f08a00)"],
  [null, tx("Ask our team"), tx("WhatsApp us"), "whatsapp", "linear-gradient(135deg,#ff7aa8,#e8005a)"],
];

/**
 * Seller home: one "do this first" card by stage, quick actions, a small results summary, recent activity. Signed in (owner,
 * 31 Oct 2026) the hello, the card, the results and the activity come from her real shop; the rest is the same page.
 */
export default function SellerHome() {
  const t = useT();
  const { live: signedIn } = useDemo();
  const real = useSellerHome(signedIn);
  useConnectResult();
  const [stage, setStage] = useState<StageKey>("fix");
  const [talk, setTalk] = useState(false);
  const [fixed, setFixed] = useState(false);
  const live = SHOP_ITEMS.filter((s) => s.stage === "Live").length;
  const waiting = SHOP_ITEMS.filter((s) => s.stage === "Under review" || s.stage === "Submitted to TikTok").length;
  const broken = SHOP_ITEMS.find((s) => s.stage === "Not approved");
  const fresh = SHOP_ITEMS.filter((s) => s.stage === "Not submitted").length;

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      {signedIn ? (
        <LiveHello items={real.items} totals={real.totals} />
      ) : (
        <div className="sl-hello">
          <h1>{t("Good morning, {name}", { name: SELLER.contact.split(" ")[0] })}</h1>
          <p className="v2-muted">{SELLER.shop} · <Rich text={t("<b>{n}</b> products live in TAP", { n: live })} /> · <Rich text={t("<b>{n}</b> creators selling this month", { n: SELLER_RESULTS.creators })} /></p>
        </div>
      )}

      <ConnBanner />
      {/* First steps for a new seller (owner, 4 Nov 2026). */}
      <GettingStarted side="seller" />
      {signedIn && <LiveNext items={real.items} />}

      {!signedIn && stage === "fix" && broken && !fixed && (
        <section className="v2-next red">
          <small>{t("Do this first")}</small>
          <h2>{t("1 Product Not Approved: 0 Samples")}</h2>
          <p>{t("{name} has no samples, so creators can't apply.", { name: broken.name })}</p>
          <div className="v2-row">
            <Link href={`/seller/app/product/${broken.id}`} className="v2-btn-white" style={{ color: "#b42318" }}>{t("Fix and Resubmit")}</Link>
            <Link href="/seller/app/progress" className="v2-btn-ghostw">{t("See Progress")}</Link>
          </div>
        </section>
      )}
      {!signedIn && stage === "waiting" && (
        <section className="v2-next">
          <small>{t("On the way")}</small>
          <h2>{t("{n} products waiting on TikTok", { n: waiting })}</h2>
          <p>{fixed ? t("Nothing to do. TikTok usually replies in 1–3 working days. Your fixed mop pads are with our team first.") : t("Nothing to do. TikTok usually replies in 1–3 working days.")}</p>
          <div className="sl-mini-steps">
            <span className="on"><Icon name="check" size={14} width={2.6} /> {t("Registered")}</span>
            <span className="on"><Icon name="check" size={14} width={2.6} /> {t("Our review")}</span>
            <span>{t("With TikTok")}</span>
            <span>{t("Live")}</span>
          </div>
          <div className="v2-row">
            <Link href="/seller/app/progress" className="v2-btn-white">{t("See Progress")}</Link>
            <Link href="/seller/app/submit" className="v2-btn-ghostw">{t("Register {n} more", { n: fresh })}</Link>
          </div>
        </section>
      )}
      {!signedIn && stage === "new" && (
        <section className="v2-next">
          <small>{t("Start here")}</small>
          <h2>{t("Register Your First Products")}</h2>
          <p>{t("Your own campaign is ready in Seller Center. Pick products there once; Techwide reviews each one.")}</p>
          <div className="v2-row">
            <Link href="/seller/app/submit" className="v2-btn-white">{t("Register Products")} <Icon name="arrow" size={18} /></Link>
            <span style={{ fontSize: 13, opacity: 0.9 }}>{t("Signed in ✓ · Seller Center ✓ · Register")}</span>
          </div>
        </section>
      )}
      {!signedIn && stage === "running" && (
        <section className="v2-next">
          <small>{t("All good")}</small>
          <h2>{t("All {n} products are live", { n: live })}</h2>
          <p>{t("{n} units sold in 30 days.", { n: SELLER_RESULTS.units.toLocaleString("en-MY") })} {t("{n} products not in TAP yet.", { n: fresh })}</p>
          <div className="v2-row">
            <Link href="/seller/app/results" className="v2-btn-white">{t("See Results")}</Link>
            <Link href="/seller/app/submit" className="v2-btn-ghostw">{t("Add More Products")}</Link>
          </div>
        </section>
      )}
      {!signedIn && <div className="sl-stages" aria-label={t("Preview other states")}>
        <span>{t("Preview:")}</span>
        {([["new", t("New shop")], ["fix", t("Needs a fix")], ["waiting", t("Waiting")], ["running", t("All live")]] as [StageKey, string][]).map(([k, l]) => (
          <button key={k} type="button" className={stage === k ? "on" : ""} onClick={() => { setStage(k); if (k === "fix") setFixed(false); }}>{l}</button>
        ))}
      </div>}

      <section className="v2-quick" aria-label={t("Quick actions")}>
        {QUICK.map(([href, label, note, icon, bg]) => {
          const inner = (
            <>
              <span className="v2-qico" style={{ background: bg }}><Icon name={icon} /></span>
              <b>{t(label)}</b>
              <small>{t(note)}</small>
            </>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <button key={label} type="button" onClick={() => setTalk(true)}>{inner}</button>;
        })}
      </section>

      <div className="v2-split">
        {signedIn ? <LiveSummary totals={real.totals} failed={real.failed} /> : <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">{t("Last 30 Days in TAP")}</h2>
            <Link href="/seller/app/results">{t("See All")}</Link>
          </div>
          <Source />
          <div className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <Stat label={t("Sales")} value={<Count value={SELLER_RESULTS.gmv} format={(n) => rm(n, 0)} />} note={t("+{n}% vs last month", { n: 31 })} tone="up" />
            <Stat label={t("Units Sold")} value={<Count value={SELLER_RESULTS.units} />} />
            <Stat label={t("Creators Selling")} value={<Count value={SELLER_RESULTS.creators} />} />
            <Stat label={t("Videos")} value={<Count value={SELLER_RESULTS.videos} />} />
          </div>
          <div className="sl-cols"><Columns values={RESULTS["30 days"].daily.slice(-14)} labels={["15 Oct", "", "", "", "", "", "", "22 Oct", "", "", "", "", "", t("Today")]} /></div>
        </section>}

        {signedIn ? <LiveActivity /> : <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">{t("Recent Activity")}</h2>
            <Link href="/seller/app/notifications">{t("All")}</Link>
          </div>
          <div className="sl-acts">
            {activity(t).map((a, k) => (
              <Link key={k} href={a.href} className="sl-act">
                <span className={`sl-ico ${a.tone ?? ""}`}><Icon name={a.icon} size={18} /></span>
                <span><span><Rich text={a.text} /></span><small>{a.sub}</small></span>
                <time>{a.when}</time>
              </Link>
            ))}
          </div>
        </section>}
      </div>

      <div className="v2-split">
        {/* The joining ticker is sample data; signed in it's left out until there's a real feed (owner, 31 Oct 2026). */}
        {!signedIn && (
          <section className="v2-card">
            <JoinBoard title={t("Who's Joining")} />
          </section>
        )}
        {/* Custom Service (owner, 29 Oct 2026): a small way in to what our team can run for the shop. */}
        <section className="v2-card cs-home">
          <h2 className="v2-h2">{t("Want Our Team to Run It?")}</h2>
          <p>{t("Techwide can run your TAP campaign, creators, samples, LIVEs, content and ads. Tell us what you need and we'll quote.")}</p>
          <ul aria-label={t("For example")}>
            {[t("Full TAP management"), t("LIVE sessions"), t("Mega sale pushes"), "Spark Ads"].map((s) => <li key={s} className="badge">{s}</li>)}
          </ul>
          <Link href="/seller/app/custom" className="np-btn">{t("See Custom Service")} <Icon name="arrow" size={18} /></Link>
        </section>
      </div>

      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </div>
  );
}
