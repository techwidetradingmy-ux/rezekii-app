"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Columns, Count, Sheet, Stat } from "@/components/ui";
import { ConnBanner, ContactSheet, Source } from "@/components/seller/seller-ui";
import { SELLER, SELLER_RESULTS, rm } from "@/lib/mock";
import { RESULTS, SHOP_ITEMS } from "@/lib/mock-seller";

type StageKey = "new" | "fix" | "waiting" | "running";

const ACTIVITY: { icon: IconName; tone?: "red" | "amber" | "blue"; text: React.ReactNode; sub: string; when: string; href: string }[] = [
  { icon: "check", text: <>Spin chopper 1.5L passed our review</>, sub: "Next: it goes to TikTok", when: "10:40", href: "/seller/app/progress" },
  { icon: "video", tone: "blue", text: <><b>@kak.ros.kitchen</b> went LIVE with your casserole pot</>, sub: "38 units sold during the LIVE", when: "09:05", href: "/seller/app/results" },
  { icon: "alert", tone: "red", text: <><b>@zara.home</b> is 3 days late on a sample</>, sub: "Reminded twice · sample access paused", when: "Yesterday", href: "/seller/app/results/samples" },
  { icon: "send", tone: "amber", text: <>Cordless vacuum, pet hair edition went to TikTok</>, sub: "TikTok usually replies in 1–3 working days", when: "25 Oct", href: "/seller/app/progress" },
  { icon: "video", tone: "blue", text: <><b>@mei.ling.deals</b> posted video 2 of 3 for your tumbler</>, sub: "1 more due by 2 Nov", when: "24 Oct", href: "/seller/app/results/samples" },
];

const QUICK: [string | null, string, string, IconName, string][] = [
  ["/seller/app/submit", "Submit products", "AI suggests the commission", "plus", "linear-gradient(135deg,#22dc95,#00a862)"],
  ["/seller/app/results", "See results", "Sales, creators, videos", "chart", "linear-gradient(135deg,#7aa2ff,#1d4ed8)"],
  ["/seller/app/results/samples", "Where samples went", "Who got each one", "box", "linear-gradient(135deg,#ffb35c,#f08a00)"],
  [null, "Ask our team", "WhatsApp us", "whatsapp", "linear-gradient(135deg,#ff7aa8,#e8005a)"],
];

/** Seller home: one "do this first" card by stage, quick actions, a small results summary, recent activity. */
export default function SellerHome() {
  const { toast } = useDemo();
  const [stage, setStage] = useState<StageKey>("fix");
  const [fixing, setFixing] = useState(false);
  const [samples, setSamples] = useState(40);
  const [talk, setTalk] = useState(false);
  const [fixed, setFixed] = useState(false);
  const live = SHOP_ITEMS.filter((s) => s.stage === "Live").length;
  const waiting = SHOP_ITEMS.filter((s) => s.stage === "Under review" || s.stage === "Submitted to TikTok").length;
  const broken = SHOP_ITEMS.find((s) => s.stage === "Not approved");
  const fresh = SHOP_ITEMS.filter((s) => s.stage === "Not submitted").length;

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div className="sl-hello">
        <h1>Good morning, {SELLER.contact.split(" ")[0]}</h1>
        <p className="v2-muted">{SELLER.shop} · <b>{live}</b> products live in TAP · <b>{SELLER_RESULTS.creators}</b> creators selling this month</p>
      </div>

      <ConnBanner />

      {stage === "fix" && broken && !fixed && (
        <section className="v2-next red">
          <small>Do this first</small>
          <h2>1 product not approved: 0 samples</h2>
          <p>{broken.name} has no samples, so creators can&apos;t apply.</p>
          <div className="v2-row">
            <button type="button" className="v2-btn-white" style={{ color: "#b42318" }} onClick={() => setFixing(true)}>Add samples</button>
            <Link href="/seller/app/progress" className="v2-btn-ghostw">See progress</Link>
          </div>
        </section>
      )}
      {stage === "waiting" && (
        <section className="v2-next">
          <small>On its way</small>
          <h2>{waiting} products waiting on TikTok</h2>
          <p>Nothing to do. TikTok usually replies in 1–3 working days.{fixed ? " Your fixed mop pads are with our team first." : ""}</p>
          <div className="sl-mini-steps">
            <span className="on"><Icon name="check" size={14} width={2.6} /> Submitted</span>
            <span className="on"><Icon name="check" size={14} width={2.6} /> Our review</span>
            <span>With TikTok</span>
            <span>Live</span>
          </div>
          <div className="v2-row">
            <Link href="/seller/app/progress" className="v2-btn-white">See progress</Link>
            <Link href="/seller/app/submit" className="v2-btn-ghostw">Submit {fresh} more</Link>
          </div>
        </section>
      )}
      {stage === "new" && (
        <section className="v2-next">
          <small>Start here</small>
          <h2>Submit your first products</h2>
          <p>Pick products. AI suggests the commission; samples are set to 40.</p>
          <div className="v2-row">
            <Link href="/seller/app/submit" className="v2-btn-white">Submit products <Icon name="arrow" size={18} /></Link>
            <span style={{ fontSize: 13, opacity: 0.9 }}>Signed in ✓ · Seller Center ✓ · Submit</span>
          </div>
        </section>
      )}
      {stage === "running" && (
        <section className="v2-next">
          <small>All good</small>
          <h2>All {live} products are live</h2>
          <p>{SELLER_RESULTS.units.toLocaleString("en-MY")} units sold in 30 days. {fresh} products not in TAP yet.</p>
          <div className="v2-row">
            <Link href="/seller/app/results" className="v2-btn-white">See results</Link>
            <Link href="/seller/app/submit" className="v2-btn-ghostw">Add more products</Link>
          </div>
        </section>
      )}
      <div className="sl-stages" aria-label="Preview other states">
        <span>Preview:</span>
        {([["new", "New shop"], ["fix", "Needs a fix"], ["waiting", "Waiting"], ["running", "All live"]] as [StageKey, string][]).map(([k, l]) => (
          <button key={k} type="button" className={stage === k ? "on" : ""} onClick={() => { setStage(k); if (k === "fix") setFixed(false); }}>{l}</button>
        ))}
      </div>

      <section className="v2-quick" aria-label="Quick actions">
        {QUICK.map(([href, label, note, icon, bg]) => {
          const inner = (
            <>
              <span className="v2-qico" style={{ background: bg }}><Icon name={icon} /></span>
              <b>{label}</b>
              <small>{note}</small>
            </>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <button key={label} type="button" onClick={() => setTalk(true)}>{inner}</button>;
        })}
      </section>

      <div className="v2-split">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Last 30 days in TAP</h2>
            <Link href="/seller/app/results">See all</Link>
          </div>
          <Source />
          <div className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <Stat label="Sales" value={<Count value={SELLER_RESULTS.gmv} format={(n) => rm(n, 0)} />} note="+31% vs last month" tone="up" />
            <Stat label="Units sold" value={<Count value={SELLER_RESULTS.units} />} />
            <Stat label="Creators selling" value={<Count value={SELLER_RESULTS.creators} />} />
            <Stat label="Videos" value={<Count value={SELLER_RESULTS.videos} />} />
          </div>
          <div className="sl-cols"><Columns values={RESULTS["30 days"].daily.slice(-14)} labels={["15 Oct", "", "", "", "", "", "", "22 Oct", "", "", "", "", "", "Today"]} /></div>
        </section>

        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Recent activity</h2>
            <Link href="/seller/app/notifications">All</Link>
          </div>
          <div className="sl-acts">
            {ACTIVITY.map((a, k) => (
              <Link key={k} href={a.href} className="sl-act">
                <span className={`sl-ico ${a.tone ?? ""}`}><Icon name={a.icon} size={18} /></span>
                <span><span>{a.text}</span><small>{a.sub}</small></span>
                <time>{a.when}</time>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {fixing && broken && (
        <Sheet title="Add samples" onClose={() => setFixing(false)}>
          <div className="sl-prow" style={{ paddingTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={broken.img} alt="" />
            <span className="sl-pinfo"><strong>{broken.name}</strong><small>From Seller Center · TAP {broken.tapRate}%</small></span>
          </div>
          <div className="v2-field">Samples per SKU <small>Most shops pick 30–50</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => { setFixing(false); setFixed(true); setStage("waiting"); toast(`${samples} samples added · resubmitted`); }}>Add {samples} samples and resubmit</button>
        </Sheet>
      )}
      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </div>
  );
}
