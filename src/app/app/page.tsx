"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Hidden, Lock } from "@/components/ui";
import { AI_PICKS, CREATOR, MY_SAMPLES, RAISES, product, rm } from "@/lib/mock";

const QUICK: [string, string, string, IconName, string][] = [
  ["/app/opportunities", "Scan showcase", "Find better commission", "scan", "linear-gradient(135deg,#22dc95,#00a862)"],
  ["/app/opportunities/samples", "Sample market", "Free samples to apply for", "gift", "linear-gradient(135deg,#7aa2ff,#1d4ed8)"],
  ["/app/publish", "Post a video", "TikTok, IG, FB, Threads", "send", "linear-gradient(135deg,#ffb35c,#f08a00)"],
  ["/app/rewards/referral", "Invite friends", "Rewards for both of you", "users", "linear-gradient(135deg,#ff7aa8,#e8005a)"],
];

/** Creator home: one "do this first" card by stage, four quick actions, new commission chances, recommended products. */
export default function CreatorHome() {
  const { linked, setLinked, toast } = useDemo();
  const [joined, setJoined] = useState<string[]>([]);
  const due = MY_SAMPLES.find((s) => s.status === "Posting");
  const dueProduct = due ? product(due.productId) : null;
  const raises = RAISES.filter((r) => r.eligible && !joined.includes(r.id)).slice(0, 3);

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Good morning, {CREATOR.first}</h1>
        <p className="v2-muted" style={{ margin: "4px 0 0" }}>
          This month we checked <b><Count value={CREATOR.checkedThisMonth} /></b> products for you · <b>{CREATOR.activatedThisMonth}</b> better rates now active
        </p>
      </div>

      {!linked ? (
        <section className="v2-next">
          <small>Start here</small>
          <h2>See if your showcase has better commission waiting</h2>
          <p>Link TikTok Shop and we check every product you promote. Takes about a minute.</p>
          <div className="v2-row">
            <button type="button" className="v2-btn-white" onClick={() => setLinked(true)}>Link TikTok Shop <Icon name="arrow" size={18} /></button>
            <span style={{ fontSize: 13, opacity: 0.9 }}>Signed in ✓ · Link TikTok Shop · Approval</span>
          </div>
        </section>
      ) : due && dueProduct ? (
        <section className="v2-next red">
          <small>Do this first</small>
          <h2>{dueProduct.name}: 1 more video by {due.due}</h2>
          <p>{due.videos} of 3 videos posted for this sample. Finish on time to keep your sample streak.</p>
          <div className="v2-row">
            <Link href="/app/opportunities/my-samples" className="v2-btn-white">Submit video link</Link>
            <button type="button" className="v2-btn-ghostw" onClick={() => toast("Extension request sent to the Techwide team")}>Ask for more time</button>
          </div>
        </section>
      ) : null}

      <section className="v2-quick" aria-label="Quick actions">
        {QUICK.map(([href, label, note, icon, bg]) => (
          <Link key={href} href={href}>
            <span className="v2-qico" style={{ background: bg }}><Icon name={icon} /></span>
            <b>{label}</b>
            <small>{note}</small>
          </Link>
        ))}
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">New commission chances <span className="badge">{raises.length}</span></h2>
          <Link href="/app/opportunities">See all</Link>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Same products already in your showcase, paying more through Techwide. Last scan today 09:12 · rates for your level ({CREATOR.level}).</p>
        <Lock what="your commission chances">
          <div className="v2-divide">
            {raises.map((r) => {
              const p = product(r.productId);
              return (
                <div key={r.id} className="v2-prow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.shop} · until {r.until}</small>
                  </span>
                  <span className="v2-acts">
                    <span className="v2-rate">{r.nowRate === null ? <s>unknown</s> : <s>{r.nowRate}%</s>}<Icon name="arrow" size={14} /><b><Hidden>{r.tapRate}%</Hidden></b></span>
                    <button type="button" className="np-btn v2-btn-sm" onClick={() => { setJoined((j) => [...j, r.id]); toast(`Added to your showcase · checking with TikTok`); }}>Add</button>
                  </span>
                </div>
              );
            })}
            {raises.length === 0 && <p className="v2-muted" style={{ margin: "12px 0 0" }}>All caught up. We re-check your showcase every day.</p>}
          </div>
        </Lock>
      </section>

      <section className="v2-stack">
        <div className="v2-card-h">
          <h2 className="v2-h2">Recommended for you</h2>
          <Link href="/app/opportunities/picks" className="v2-link">See all</Link>
        </div>
        <div className="v2-pgrid">
          {AI_PICKS.slice(0, 4).map((pk) => {
            const p = product(pk.productId);
            return (
              <Link key={p.id} href="/app/opportunities/picks" className="v2-pcard" style={{ color: "var(--text)", textDecoration: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <strong>{p.name}</strong>
                <span className="v2-row" style={{ gap: 6 }}>
                  <span className="badge">Earn <Hidden>{p.tapRate}%</Hidden></span>
                  <small>{rm(p.price)}</small>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
