"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Hidden } from "@/components/ui";
import { PoolTag } from "@/components/creator1/brand";
import { Trend } from "@/components/creator1/shoot-today";
import { WishForm, WishSteps, useWishes } from "@/components/creator1/wish";
import { product, rm, short } from "@/lib/mock";
import { SAMPLE_STREAK, sampleCount, type Pool } from "@/lib/mock-creator1";
import { commitText } from "@/lib/mock-showcase";
import { canRequest, markRequested, productView, requestedSamples, sampleConditions } from "@/lib/product-view";
import "@/app/creator1.css";

/**
 * Product (owner, 29 Oct 2026): every product in the app opens this one page instead of a slide-up sheet. Big photo, the
 * numbers that say why it's worth it (score, sales, a 7-day sales line, her own sales), then the buttons stacked like a shop's
 * buy box: Add to Showcase or Plan a Video on top, Free Sample below; Add to Wish List when it isn't on Rezekii yet.
 */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { linked, setLinked, toast, requireWa } = useDemo();
  const { mine } = useWishes();
  const p = productView(id);
  const [added, setAdded] = useState(false);
  const [asked, setAsked] = useState(false);
  const [warn, setWarn] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  // Samples asked for and left, kept live (the preview moves one along now and then).
  const [taken, setTaken] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTaken((n) => n + 1), 20000);
    return () => window.clearInterval(t);
  }, []);

  // ?sample=1 jumps to the free sample, ?join=1 opens the wish list form (from Marketplace, AI Picks and Most Wanted).
  useEffect(() => {
    setAsked(requestedSamples().includes(id));
    const q = new URLSearchParams(window.location.search);
    if (q.get("join")) setWishOpen(true);
    const to = q.get("sample") ? "sample" : q.get("join") ? "wish" : null;
    if (to) window.setTimeout(() => document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [id]);

  if (!p) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>We couldn&apos;t find this product</b>
          <Link href="/app/market" className="np-btn v2-btn-sm">Open Marketplace</Link>
        </section>
      </div>
    );
  }

  const m = p.tapRate !== null ? product(p.id) : null;
  const wish = mine(p.id);
  // The link check follows the preview's "Show as not linked" switch; unmet ones she can fix send her to My Account.
  const conds = (m?.samples ? sampleConditions(m) : []).map((c) => (c.fix === "/app/account#connections" ? { ...c, ok: linked, you: linked ? c.you : "Link TikTok Shop" } : c));
  const unmet = conds.filter((c) => !c.ok);
  const canSample = !!m && canRequest(m);
  const base = sampleCount(p.id);
  const moved = Math.min(taken, Math.max(0, base.left - 1));
  const count = { ...base, applied: base.applied + moved, left: base.left - moved };
  const earn = p.tapRate !== null ? (p.price * p.tapRate) / 100 : null;
  // Owner, 29 Oct 2026: lead with the extra she earns through Rezekii, per sale and at her own 30-day sales.
  const extra = p.tapRate !== null && p.publicRate !== null ? (p.price * (p.tapRate - p.publicRate)) / 100 : 0;
  const month = extra * (p.mySold ?? 100);
  const back = () => (window.history.length > 1 ? router.back() : router.push("/app/market"));
  const addToShowcase = () => {
    if (!linked) return setLinked(true);
    setAdded(true);
    toast(`Added at ${p.tapRate}%: ${p.name}`);
  };
  const request = () => {
    if (!linked) return setLinked(true);
    requireWa(() => {
      if (unmet.length && !warn) {
        setWarn(true);
        document.getElementById("sample")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      markRequested(p.id);
      setAsked(true);
      setWarn(false);
      toast("Opening TikTok's sample request…");
    });
  };
  const openWish = () => {
    if (!linked) return setLinked(true);
    setWishOpen(true);
    window.setTimeout(() => document.getElementById("wish")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const sampleBtn = m?.samples && (
    asked
      ? <Link href="/app/account#samples" className="btn-outline"><Icon name="check" size={18} /> Sample Requested</Link>
      : <button type="button" className="btn-outline" onClick={canSample ? request : () => document.getElementById("sample")?.scrollIntoView({ behavior: "smooth" })}><Icon name="gift" size={18} /> {canSample ? "Request Free Sample" : `Free Sample at ${SAMPLE_STREAK[m.samples as Pool]}-Day Streak`}</button>
  );
  const buy = p.tapRate === null ? (
    wish || wishOpen ? null : <button type="button" className="np-btn" onClick={openWish}>{p.wanted ? "Join This Wish" : "Add to Wish List"}</button>
  ) : p.inShowcase || added ? (
    <>
      <Link href={`/app/publish?idea=${encodeURIComponent(`Show ${p.name}`)}`} className="np-btn"><Icon name="video" size={18} /> Plan a Video</Link>
      {sampleBtn}
    </>
  ) : (
    <>
      <button type="button" className="np-btn" onClick={addToShowcase}><Icon name="plus" size={18} width={2.4} /> Add to Showcase</button>
      {sampleBtn}
    </>
  );

  return (
    <div className="pp">
      <button type="button" className="pp-back" onClick={back} aria-label="Back"><Icon name="back" size={20} /></button>
      <div className="pp-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} />
      </div>

      <div className="pp-info">
        <h1 className="pp-name">{p.name}</h1>
        <p className="pp-meta">{p.shop} · {rm(p.price)}{p.sold !== null ? ` · ${short(p.sold)} sold` : ""}</p>
        {/* Has she sold it? (owner, 29 Oct 2026) From her TikTok Shop orders, and our campaign data for TAP products. */}
        {linked ? (
          <p className={`pp-sold${p.mySold ? " ok" : ""}`}>
            <Icon name={p.mySold ? "check" : "info"} size={15} width={2.6} />
            {p.mySold ? <span>You&apos;ve sold this · <b>{p.mySold}</b> in the last 30 days</span> : <span>You haven&apos;t sold this yet</span>}
          </p>
        ) : null}
        <div className="pp-chips">
          {p.rating !== null && <span className="pp-chip score"><Icon name="star" size={13} width={2.4} /> {p.rating.toFixed(1)}</span>}
          {m?.samples && <PoolTag pool={m.samples as Pool} />}
          {p.special && <span className="pp-chip special"><Icon name="star" size={13} width={2.4} /> Your Special Rate</span>}
          {(p.inShowcase || added) && <span className="pp-chip">In Your Showcase</span>}
          {p.tapRate === null && <span className="pp-chip muted">Not on Rezekii Yet</span>}
        </div>

        {p.tapRate !== null ? (
          extra > 0 ? (
            <div className="pp-rate">
              <span className="pp-extra"><b><Hidden>+{rm(extra)}</Hidden></b> extra per sale on Rezekii</span>
              <span className="pp-rate-line"><s>{p.publicRate}%</s> <Icon name="arrow" size={14} /> <b><Hidden>{p.tapRate}%</Hidden></b> · <Hidden>{rm(earn ?? 0)}</Hidden> a sale</span>
              <small>
                {p.mySold ? <>At your {p.mySold} sales last 30 days: <b><Hidden>+{rm(month)}</Hidden></b> a month</> : <>Sell 100 a month: <b><Hidden>+{rm(month)}</Hidden></b> more</>}
                {p.special ? ` · your special rate${p.special.until ? ` until ${p.special.until}` : ""}` : ""}
              </small>
            </div>
          ) : (
            <div className="pp-rate">
              <span className="pp-rate-line"><b><Hidden>{p.tapRate}%</Hidden></b> on Rezekii</span>
              <small>You earn <b><Hidden>{rm(earn ?? 0)}</Hidden></b> per sale{p.special ? ` · your special rate${p.special.until ? ` until ${p.special.until}` : ""}` : ""}</small>
            </div>
          )
        ) : (
          <div className="pp-rate off">
            <span className="pp-rate-line">Open plan {p.publicRate === null ? "—" : `${p.publicRate}%`}</span>
            <small>{p.wanted ? `${p.wanted.creators} creators want it on Rezekii` : "Ask us to bring it to Rezekii"}</small>
          </div>
        )}

        {buy && <div className="pp-buy">{buy}</div>}

        <section className="v2-card pp-card">
          <Trend points={p.week} label="Sales, last 7 days" />
          <div className="pp-facts">
            {p.sold !== null && <span><small>Total sold</small><b>{short(p.sold)}</b></span>}
            {p.mySold !== null && <span><small>Your sales, 30 days</small><b>{p.mySold}</b></span>}
            {p.wanted && <span><small>Creators want it</small><b>{p.wanted.creators}</b></span>}
            {p.category && <span><small>Category</small><b>{p.category}</b></span>}
          </div>
        </section>

        {m?.samples && (
          <section className="v2-card pp-card" id="sample">
            {/* Owner, 29 Oct 2026: how many asked and how many are left (live), then whether she can apply. Nothing about after. */}
            <div className="pp-sh">
              <h2 className="v2-h2">Free Sample</h2>
              <span className="pp-live"><i /> Live</span>
            </div>
            <div className="pp-count">
              <span className="v2-meter"><i style={{ width: `${(count.applied / count.total) * 100}%` }} /></span>
              <small><b>{count.applied}</b> applied · <b>{count.left}</b> left</small>
            </div>
            <h3 className="pp-sub">Can You Apply?</h3>
            <ul className="cr1-conds">
              {conds.map((c) => (
                <li key={c.label}>
                  <span className={`cr1-tick ${c.ok ? "" : "no"}`}><Icon name={c.ok ? "check" : "x"} size={13} width={3} /></span>
                  <span>
                    {c.label}
                    {!c.ok && c.fix ? <Link href={c.fix} className="pp-fix">{c.you} <Icon name="arrow" size={14} /></Link> : <small>{c.you}</small>}
                  </span>
                </li>
              ))}
            </ul>
            {warn && !asked && (
              <div className="cr1-warn">
                <span className="cr1-warn-ico"><Icon name="alert" size={22} /></span>
                <div>
                  <b>Likely to be rejected:</b>
                  <ul>{unmet.map((c) => <li key={c.label}>{c.label}. <span>{c.you}.</span></li>)}</ul>
                  <button type="button" className="btn-outline v2-btn-sm" onClick={request}>Request Anyway</button>
                </div>
              </div>
            )}
          </section>
        )}

        {wish && !wishOpen && (
          <section className="v2-card pp-card">
            <h2 className="v2-h2">On Your Wish List</h2>
            <WishSteps w={wish} />
            <small className="v2-small">{commitText(wish.commit)}</small>
          </section>
        )}
        {wishOpen && p.tapRate === null && <WishForm item={{ id: p.id, name: p.name, shop: p.shop, img: p.img, price: p.price, rate: p.publicRate }} wanted={p.wanted} onCancel={() => setWishOpen(false)} />}
      </div>
    </div>
  );
}
