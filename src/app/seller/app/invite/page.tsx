"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { ConnBanner } from "@/components/seller/seller-ui";
import { rm } from "@/lib/mock";
import { SHOP_ITEMS, TAP_INVITE as I, TODAY } from "@/lib/mock-seller";

/**
 * The page a seller opens from Techwide's invite (owner, 28 Oct 2026): the campaign Techwide set up, the products it suggests,
 * and one button to register. Registering puts the products in the same TAP pipeline as Submit products, in sync both ways.
 */
export default function TapInvite() {
  const { toast } = useDemo();
  const open = SHOP_ITEMS.filter((p) => p.stage === "Not submitted");
  const [picked, setPicked] = useState<string[]>(I.products);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  const sel = open.filter((p) => picked.includes(p.id));

  if (declined) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card sl-done">
          <h2>No problem</h2>
          <p className="v2-muted" style={{ margin: 0, maxWidth: 440 }}>We&apos;ve told {I.from}. You can still register from this link until {I.expires}, or submit other products any time.</p>
          <div className="v2-row" style={{ justifyContent: "center" }}>
            <button type="button" className="np-btn" onClick={() => setDeclined(false)}>Look again</button>
            <Link href="/seller/app/submit" className="btn-outline" style={{ height: 48 }}>Submit other products</Link>
          </div>
        </section>
      </div>
    );
  }

  if (done) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card sl-done">
          <span className="sl-check"><Icon name="check" size={38} width={2.8} /></span>
          <h2>{sel.length} product{sel.length === 1 ? "" : "s"} registered</h2>
          <p className="v2-muted" style={{ margin: 0, maxWidth: 460, lineHeight: 1.55 }}>{I.from} sees them now in Techwide&apos;s TAP pipeline. Same steps as products you submit yourself; we&apos;ll tell you on WhatsApp and here when they&apos;re live.</p>
          <div className="sl-track" style={{ width: "100%", maxWidth: 520, marginTop: 6 }}>
            <div className="done"><i><Icon name="check" size={14} width={3} /></i><b>Registered</b><small>Now</small></div>
            <div className="now"><i /><b>Our review</b><small>Within 1 working day</small></div>
            <div className="later"><i /><b>With TikTok</b><small>1–3 working days</small></div>
            <div className="later"><i /><b>Live</b><small>Creators can apply</small></div>
          </div>
          <Link href="/seller/app/progress" className="np-btn">See progress</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="v2-stack v2-in">
      <Title title="You're Invited to a TAP Campaign" sub={`From ${I.from}, ${I.team} · sent ${I.sent} · open until ${I.expires}`} />
      <ConnBanner />

      <section className="v2-card si-hero">
        <span className="si-from"><span className="v2-av">{I.from.slice(0, 2).toUpperCase()}</span><span><b>{I.from}</b><small>{I.team}</small></span></span>
        <p className="si-note">&ldquo;{I.note}&rdquo;</p>
        <h2 className="si-name">{I.name}</h2>
        <div className="si-terms">
          <span><Icon name="tag" size={18} /><b>Public rate +{I.raise}%</b><small>For creators in this campaign</small></span>
          <span><Icon name="gift" size={18} /><b>{I.samples} samples</b><small>Per SKU, sent through TikTok</small></span>
          <span><Icon name="cal" size={18} /><b>Until {I.end}</b><small>{I.extend ? "Auto-extends before it ends" : "Ends on this date"}</small></span>
          <span><Icon name="users" size={18} /><b>{I.niche}</b><small>Creators Techwide picks</small></span>
        </div>
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">1</span><h2>Products {I.from} suggests</h2><span className="v2-small">{sel.length} picked</span></div>
        <div>
          {open.map((p) => {
            const on = picked.includes(p.id);
            return (
              <label key={p.id} className={`sl-pick ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="sl-pinfo">
                  <strong>{p.name}</strong>
                  <small>{rm(p.price)}{I.products.includes(p.id) ? ` · suggested by ${I.from}` : ""}</small>
                </span>
                <span className="sl-pick-rate">
                  <span className="sl-rate">{p.publicRate === null ? "Public ?" : `${p.publicRate}%`} <Icon name="arrow" size={12} /> <b>{p.publicRate === null ? `+${I.raise}%` : `${p.publicRate + I.raise}%`}</b></span>
                  <small>{p.publicRate === null ? "We'll check the public rate" : `Public ${p.publicRate}% now`}</small>
                </span>
              </label>
            );
          })}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Uncheck any you don&apos;t want. Want to change the rate or samples? <button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => toast(`Opening WhatsApp with ${I.from}…`)}>Ask {I.from}</button></p>
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">2</span><h2>How it stays in sync</h2></div>
        <ul className="si-sync">
          <li><Icon name="refresh" size={16} /><span>Your products, rates and samples update in your app, for {I.from}, and on TikTok together.</span></li>
          <li><Icon name="kanban" size={16} /><span>Same steps as products you submit yourself: our review, TikTok, then live.</span></li>
          <li><Icon name="shield" size={16} /><span>You can change or end it later from Change or end.</span></li>
        </ul>
      </section>

      <div className="sl-sticky">
        <span>
          <b>{sel.length} product{sel.length === 1 ? "" : "s"} · +{I.raise}% · {I.samples} samples</b>
          {sel.length === 0 ? <span className="sl-err" style={{ fontSize: 12.5 }}>Pick at least 1 product.</span> : <span>Registers today, {TODAY}</span>}
        </span>
        <span className="si-acts">
          <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setDeclined(true)}>Not now</button>
          <button type="button" className="np-btn" disabled={sel.length === 0} onClick={() => { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Register {sel.length || ""}</button>
        </span>
      </div>
    </div>
  );
}
