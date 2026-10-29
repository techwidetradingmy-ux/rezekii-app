"use client";

import "@/app/seller.css";
import "@/app/creator1.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { SELLER } from "@/lib/mock";
import { UPDATED } from "@/lib/mock-seller";
import { HOT_RAISE, WANTED, commitText, onBoard, type Wanted } from "@/lib/mock-showcase";

/** Techwide's TAP partner ID sellers invite to their own campaign (sample). */
const PARTNER_ID = "7495 1180 2264";

const n = (v: number) => v.toLocaleString("en-MY");
const BONUSES = ["Extra % for top sellers", "Cash bonus at a sales target", "Free samples for everyone who committed"] as const;

/**
 * Wanted by Creators (owner, 29 Oct 2026): this shop's products that creators asked for on Rezekii, synced with every commitment
 * they make. The seller sees who wants it, what they already sell, and what they'll give each month, then submits it to our TAP
 * campaign or invites us to their own, and can add a bonus. We negotiate for the creators; no rate is promised here.
 */
export default function WantedByCreators() {
  const { toast } = useDemo();
  const mine = WANTED.filter((w) => w.shop === SELLER.shop && (w.status === "New" || w.status === "Contacting")).sort((a, b) => b.creators - a.creators);
  const ranked = WANTED.filter(onBoard).sort((a, b) => b.week - a.week || b.creators - a.creators);
  const [sel, setSel] = useState<Wanted | null>(null);
  const [bonus, setBonus] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [own, setOwn] = useState(false);
  const total = (k: "creators" | "videos" | "lives") => mine.reduce((s, w) => s + w[k], 0);
  const open = (w: Wanted) => { setSel(w); setBonus(null); setAsked(false); setOwn(false); };

  return (
    <div className="v2-stack v2-in">
      <Title title="Wanted by Creators" sub={<>Products from {SELLER.shop} that creators want to promote on Rezekii, and what they&apos;ll commit. Synced {UPDATED}.</>} />

      <section className="v2-card wb-sum">
        <span><small>Creators asking</small><b>{total("creators")}</b></span>
        <span><small>Videos a month</small><b>{n(total("videos"))}</b></span>
        <span><small>LIVE a month</small><b>{total("lives")}</b></span>
      </section>

      <section className="v2-card">
        {mine.map((w) => (
          <button key={w.id} type="button" className="sl-prow wb-row" onClick={() => open(w)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.img} alt="" />
            <span className="wb-main">
              <b>{w.name}</b>
              <small>{w.creators} creators · {n(w.videos)} videos{w.lives ? `, ${w.lives} LIVE` : ""} a month</small>
              <small>{w.sold30 ? `They sold ${n(w.sold30)} of it in 30 days` : "New listing"}{onBoard(w) ? ` · #${ranked.indexOf(w) + 1} on Most Wanted` : ""}</small>
            </span>
            <Icon name="arrow" size={16} />
          </button>
        ))}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Creators agreed to share their commitment and their sales of your product with you.</p>

      {sel && (
        <Sheet title="Wanted by Creators" onClose={() => setSel(null)} wide>
          <div className="wb-pitch">
            <div className="wb-band"><b>Rezekii Most Wanted</b>{onBoard(sel) && <span>#{ranked.indexOf(sel) + 1} this week</span>}</div>
            <div className="wb-pbody">
              <div className="cr1-sheetprod">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.img} alt="" />
                <span><b>{sel.name}</b><small>{SELLER.shop}</small></span>
              </div>
              <b className="wb-big">{sel.creators} creators want to sell your product</b>
              <small>{sel.sold30 ? `They sold ${n(sel.sold30)} of it in the last 30 days` : "It's a new listing, and they still want it"}</small>
              <div className="wb-commit">
                <small>Ready to commit each month</small>
                <b>{n(sel.videos)} videos{sel.lives ? ` · ${sel.lives} LIVE` : ""}{sel.rights ? ` · ad rights from ${sel.rights}` : ""}</b>
              </div>
            </div>
          </div>

          <div className="ad-wl-sec">
            <h3>Creators</h3>
            {sel.offers.map((o) => (
              <div key={o.handle} className="ad-wl-offer">
                <b>{o.handle}</b>
                <small>{o.sold ? `${n(o.sold)} sold in 30 days` : "No sales yet"} · {commitText(o.commit)}</small>
              </div>
            ))}
            {sel.creators > sel.offers.length && <small className="v2-muted">and {sel.creators - sel.offers.length} more</small>}
          </div>

          <Link href={`/seller/app/submit?p=${sel.id}`} className="np-btn">Submit to Our TAP Campaign</Link>
          <button type="button" className="btn-outline" onClick={() => setOwn((o) => !o)}>Invite Us to Your Own TAP Campaign</button>
          {own && (
            <ol className="wb-own">
              <li>In TikTok Seller Center, create a TAP campaign with this product.</li>
              <li>Run it as long as TikTok allows, at least +{HOT_RAISE}% above your public rate for products creators want.</li>
              <li>Invite Techwide (partner ID {PARTNER_ID}). We accept and bring these creators in.</li>
            </ol>
          )}

          <div className="ad-wl-sec">
            <h3>Add a Bonus (optional)</h3>
            <div className="v2-chips">{BONUSES.map((b) => <button key={b} type="button" className={`v2-chip ${bonus === b ? "on" : ""}`} onClick={() => setBonus(b)}>{b}</button>)}</div>
            {bonus && (asked
              ? <p className="v2-small" style={{ margin: 0 }}><Icon name="check" size={14} width={2.6} /> Sent. The Rezekii team will set it up with you.</p>
              : <button type="button" className="btn-outline" onClick={() => { setAsked(true); toast("Sent to the Rezekii team"); }}>Send to Rezekii team</button>)}
          </div>
        </Sheet>
      )}
    </div>
  );
}
