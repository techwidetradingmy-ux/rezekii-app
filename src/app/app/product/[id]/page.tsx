"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Hidden, Tip } from "@/components/ui";
import { SampleTag } from "@/components/creator1/brand";
import { Trend } from "@/components/creator1/shoot-today";
import { WishForm, WishSteps, useWishes } from "@/components/creator1/wish";
import { LIVE_STUBS, product, rm } from "@/lib/mock";
import { AddButton } from "@/components/add-button";
import { GmvChart } from "@/components/gmv-spark";
import { sampleCount } from "@/lib/mock-creator1";
import { commitText } from "@/lib/mock-showcase";
import { canRequest, markRequested, productView, requestedSamples, sampleConditions } from "@/lib/product-view";
import { loadProduct, requestSample } from "@/lib/live";
import { useLivePerf } from "@/lib/live-perf";
import "@/app/creator1.css";

/**
 * Back goes to the screen she came from when that was a page in Rezekii; opened from a link, to the Marketplace (owner,
 * 3 Nov 2026). The browser's Navigation API counts only this site's pages; without it, any page before this one.
 */
const fromApp = () => {
  const nav = (window as unknown as { navigation?: { canGoBack: boolean } }).navigation;
  return nav ? nav.canGoBack : window.history.length > 1;
};

/**
 * Product (owner, 29 Oct 2026): every product in the app opens this one page instead of a slide-up sheet. Big photo, the
 * numbers that say why it's worth it (score, sales, a 7-day sales line, her own sales), then the buttons stacked like a shop's
 * buy box, the same for every product (owner, 30 Oct 2026): Add to Showcase on top, Free Sample below. Add to Wish List is a
 * small link at the very end, for a product with no free sample or not on Rezekii yet.
 */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { linked, setLinked, toast, requireWa, live, me } = useDemo();
  const { mine } = useWishes();
  // Signed in (owner, 30 Oct 2026): a real product opened straight from a link is fetched first.
  // Not on Rezekii (owner, 31 Oct 2026): TikTok Shop's facts and the wish list numbers instead.
  // Always the full product (owner, 1 Nov 2026): a name-and-photo stand-in from Analytics or the scan is never shown as the
  // product. One request (owner, 2 Nov 2026): Rezekii's catalog, or TikTok's facts for a product not on Rezekii, with TikTok's
  // rating and categories, her free sample as the Marketplace shows it, and whether it has left the Marketplace. A product she
  // came from a list with shows at once and is brought up to date when the answer is back.
  const [, setLoaded] = useState(0);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!live) return;
    let on = true;
    setMissing(false);
    loadProduct(id, me?.level ?? "bronze").then((ok) => { if (on) (ok ? setLoaded((n) => n + 1) : !productView(id) && setMissing(true)); });
    return () => { on = false; };
  }, [live, id, me?.level]);
  const p = productView(id);
  // Has she sold it? Signed in, from her own orders in the last 30 days; nothing shown until they've loaded.
  const perf = useLivePerf();
  const mySold = live ? (perf && typeof perf === "object" ? perf.products.find((x) => x.productId === id)?.orders ?? 0 : null) : p?.mySold ?? null;
  const [asked, setAsked] = useState(false);
  // Opening TikTok's sample page takes a moment (owner, 1 Nov 2026): the button says so.
  const [opening, setOpening] = useState(false);
  const [fullName, setFullName] = useState(false);
  // Its sales on TikTok over 28 days (owner, 1 Nov 2026), from TikTok's daily top-100 lists; estimated.
  const [trend28, setTrend28] = useState<{ days: string[]; ranges: ([number, number] | null)[] } | null>(null);
  useEffect(() => {
    if (!live) return;
    let on = true;
    fetch(`/api/v2/product-trend?id=${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (on) setTrend28(d); }).catch(() => {});
    return () => { on = false; };
  }, [live, id]);
  const [warn, setWarn] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  // Samples asked for and left, kept live (the preview moves one along now and then).
  const [taken, setTaken] = useState(0);
  useEffect(() => {
    if (live) return;
    const t = window.setInterval(() => setTaken((n) => n + 1), 20000);
    return () => window.clearInterval(t);
  }, [live]);

  // ?sample=1 jumps to the free sample, ?join=1 opens the wish list form (from Marketplace, AI Picks and Most Wanted).
  useEffect(() => {
    setAsked(requestedSamples().includes(id));
    const q = new URLSearchParams(window.location.search);
    if (q.get("join")) setWishOpen(true);
    const to = q.get("sample") ? "sample" : q.get("join") ? "wish" : null;
    if (to) window.setTimeout(() => document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [id]);

  if (!p) {
    // A skeleton while it loads (owner, 1 Nov 2026), with the photo and name already known from the list she came from.
    if (live && !missing) {
      const stub = LIVE_STUBS.get(id);
      return (
        <div className="pp pp-wait" aria-busy="true" aria-label="Loading the product">
          <button type="button" className="pp-back" onClick={() => (fromApp() ? router.back() : router.push("/app/market"))} aria-label="Back"><Icon name="back" size={20} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="pp-photo">{stub?.img && <img src={stub.img} alt="" />}</div>
          <div className="pp-info">
            {stub?.name ? <h1 className="pp-name">{stub.name}</h1> : <i className="pp-sk" style={{ width: "80%", height: 24 }} />}
            <i className="pp-sk" style={{ width: "55%" }} />
            <i className="pp-sk" style={{ height: 70, borderRadius: 16 }} />
            <i className="pp-sk" style={{ height: 48, borderRadius: 14 }} />
            <i className="pp-sk" style={{ height: 48, borderRadius: 14 }} />
            {/* So people wait (owner, 2 Nov 2026). */}
            <p className="pp-wait-msg" role="status"><span className="cr1-spin xs" aria-hidden="true" /> Getting this product from TikTok…</p>
          </div>
        </div>
      );
    }
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
  const hasSample = !!m && m.samples !== null;
  // Signed in (owner, 31 Oct 2026): TikTok decides on the sample against the seller's own requirements; the only condition
  // Rezekii knows for sure is a linked TikTok Shop, so that's the one shown.
  const conds = live
    ? hasSample ? [{ label: "TikTok Shop linked", ok: !!me?.shop, you: me?.shop ? `Linked as @${me.shop.handle}` : "Link TikTok Shop", fix: "/app/account#connections" }] : []
    : (m && hasSample ? sampleConditions(m) : []).map((c) => (c.fix === "/app/account#connections" ? { ...c, ok: linked, you: linked ? c.you : "Link TikTok Shop" } : c));
  const unmet = conds.filter((c) => !c.ok);
  const canSample = !!m && canRequest(m);
  const base = sampleCount(p.id);
  const moved = Math.min(taken, Math.max(0, base.left - 1));
  const count = { ...base, applied: base.applied + moved, left: base.left - moved };
  const earn = p.tapRate !== null ? (p.price * p.tapRate) / 100 : null;
  // Owner, 29 Oct 2026: lead with the extra she earns through Rezekii, per sale and at her own 30-day sales.
  // Against her highest rate now, so a target plan is never shown as a raise it isn't (owner, 30 Oct 2026).
  const extra = p.tapRate !== null && p.nowRate !== null ? (p.price * (p.tapRate - p.nowRate)) / 100 : 0;
  const keepPlan = p.tapRate !== null && p.nowRate !== null && p.nowRate >= p.tapRate && p.nowPlan === "Target plan";
  const month = extra * (mySold || 100);
  const back = () => (fromApp() ? router.back() : router.push("/app/market"));
  const request = () => {
    if (!linked) return setLinked(true);
    requireWa(() => {
      if (unmet.length && !warn) {
        setWarn(true);
        document.getElementById("sample")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (live) {
        // For real: TikTok's own sample request page, where she confirms her address and applies (owner, 30 Oct 2026).
        // It opens in this tab (owner, 1 Nov 2026), and the button says "Opening TikTok…" until it does.
        if (opening) return;
        setOpening(true);
        requestSample(p.id).then((r) => {
          if (!r.deeplink) {
            setOpening(false);
            return toast(r.error ?? "TikTok Shop didn't open the sample request. Please try again.");
          }
          markRequested(p.id);
          setAsked(true);
          setWarn(false);
          window.location.href = r.deeplink;
          window.setTimeout(() => setOpening(false), 4000);
        });
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

  const sampleBtn = m && hasSample && (
    asked
      ? <Link href="/app/account#samples" className="btn-outline"><Icon name="check" size={18} /> Sample Requested</Link>
      : opening
        ? <button type="button" className="btn-outline" disabled aria-busy="true"><span className="cr1-spin xs" aria-hidden="true" /> Opening TikTok…</button>
        : <button type="button" className="btn-outline" onClick={canSample ? request : () => document.getElementById("sample")?.scrollIntoView({ behavior: "smooth" })}><Icon name="gift" size={18} /> {canSample ? "Request Free Sample" : `Free Sample at ${m.samples}-Day Streak`}</button>
  );
  // One buy box for every product (owner, 30 Oct 2026): Add to Showcase, then Free Sample. The wish list is a small link at the end.
  // Nothing says "In your showcase" until she taps Add on one that is (owner, 1 Nov 2026). A product TikTok refused to add for
  // her isn't offered again (owner, 2 Nov 2026).
  const buy = (
    <>
      {keepPlan
        ? <button type="button" className="np-btn" disabled><Icon name="shield" size={18} width={2.4} /> Your Target Plan Pays More</button>
        : p.refused
          ? <button type="button" className="np-btn" disabled><Icon name="x" size={18} width={2.4} /> TikTok Won&apos;t Add This</button>
          : <AddButton id={p.id} name={p.name} rate={p.tapRate} size="lg" label="Add to Showcase" inShowcase={p.inShowcase} />}
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
        <h1 className={`pp-name${fullName ? " full" : ""}`} onClick={() => setFullName((f) => !f)} title={p.name}>{p.name}</h1>
        <p className="pp-meta">{p.shop} · {rm(p.price)}</p>
        {/* Has she sold it? (owner, 29 Oct 2026) From her TikTok Shop orders, and our campaign data for TAP products. */}
        {linked && (!live || mySold !== null) ? (
          <p className={`pp-sold${mySold ? " ok" : ""}`}>
            <Icon name={mySold ? "check" : "info"} size={15} width={2.6} />
            {mySold ? <span>You&apos;ve sold this · <b>{mySold}</b> {live ? `order${mySold === 1 ? "" : "s"} ` : ""}in the last 30 days</span> : <span>{live ? "No orders from you in the last 30 days" : "You haven't sold this yet"}</span>}
          </p>
        ) : null}
        <div className="pp-chips">
          {p.rating !== null && <span className="pp-chip score"><Icon name="star" size={13} width={2.4} /> {p.rating.toFixed(1)}</span>}
          {m && m.samples !== null && <SampleTag streak={m.samples} />}
          {p.special && <span className="pp-chip special"><Icon name="star" size={13} width={2.4} /> Your Special Rate</span>}
          {p.tapRate === null && <span className="pp-chip muted">{p.gone ? "No Longer in Rezekii's Marketplace" : "Not on Rezekii Yet"}</span>}
        </div>

        {p.tapRate !== null ? (
          extra > 0 ? (
            <div className="pp-rate">
              <span className="pp-extra"><b><Hidden>+{rm(extra)}</Hidden></b> extra per sale on Rezekii</span>
              <span className="pp-rate-line">{p.nowPlan === "Target plan" ? "Target Plan " : "Open Plan "}<s>{p.nowRate}%</s> <Icon name="arrow" size={14} /> <b><Hidden>{p.tapRate}%</Hidden></b> · <Hidden>{rm(earn ?? 0)}</Hidden> a sale</span>
              <small>
                {mySold ? <>At your {mySold} sales last 30 days: <b><Hidden>+{rm(month)}</Hidden></b> a month</> : <>Sell 100 a month: <b><Hidden>+{rm(month)}</Hidden></b> more</>}
                {p.special ? ` · your special rate${p.special.until ? ` until ${p.special.until}` : ""}` : ""}
              </small>
            </div>
          ) : keepPlan ? (
            <div className="pp-rate">
              <span className="pp-rate-line"><b><Hidden>{p.nowRate}%</Hidden></b> on your target plan</span>
              <small>More than Rezekii&apos;s <Hidden>{p.tapRate}%</Hidden>, so it stays as it is.</small>
            </div>
          ) : (
            // The Open Plan rate is always shown (owner, 2 Nov 2026), also when Rezekii pays the same (Bronze).
            <div className="pp-rate">
              <span className="pp-rate-line"><b><Hidden>{p.tapRate}%</Hidden></b> on Rezekii</span>
              <small>Open Plan {p.nowRate === null ? "—" : `${p.nowRate}%`} · You earn <b><Hidden>{rm(earn ?? 0)}</Hidden></b> per sale{p.special ? ` · your special rate${p.special.until ? ` until ${p.special.until}` : ""}` : ""}</small>
            </div>
          )
        ) : (
          <div className="pp-rate off">
            <span className="pp-rate-line">{p.nowPlan === "Target plan" ? "Target Plan" : "Open Plan"} {p.nowRate === null ? "—" : `${p.nowRate}%`}</span>
            <small>{p.wanted ? `${p.wanted.creators} creators want it on Rezekii` : "Ask us to bring it to Rezekii"}</small>
          </div>
        )}

        <div className="pp-buy">{buy}</div>

        <section className="v2-card pp-card">
          {p.week.length > 0 && <Trend points={p.week} label="Sales, last 7 days" />}
          {/* Labelled (owner, 2 Nov 2026): the period, RM up the side, dates along the bottom; tap a day for its range. */}
          {live && trend28 && (
            <div className="pp-month">
              <span className="pp-month-h">
                <b>Sales on TikTok, Last 28 Days <Tip label="Where these numbers come from" text="From TikTok's daily best-seller lists (top 100 products). TikTok gives each day's sales as a range in RM: the shading is that range and the line its middle. A gap is a day it wasn't in a top 100." /></b>
                <small>{trend28.ranges.filter(Boolean).length} of 28 days in TikTok&apos;s top 100</small>
              </span>
              {trend28.ranges.some(Boolean) ? (
                <GmvChart days={trend28.days} ranges={trend28.ranges} label="Sales on TikTok, last 28 days" />
              ) : (
                <p className="v2-small" style={{ margin: 0 }}>Not in TikTok&apos;s daily top 100 in the last 28 days.</p>
              )}
            </div>
          )}
          <div className="pp-facts">
            {mySold !== null && <span><small>Your sales, 30 days</small><b>{mySold}</b></span>}
            {p.wanted && <span><small>Creators want it</small><b>{p.wanted.creators}</b></span>}
            {/* TikTok's main and sub category once the page has read them (owner, 2 Nov 2026). */}
            {p.category && <span><small>{p.sub ? "Main Category" : "Category"}</small><b>{p.category}</b></span>}
            {p.sub && <span><small>Sub Category</small><b>{p.sub}</b></span>}
          </div>
        </section>

        {hasSample && (
          <section className="v2-card pp-card" id="sample">
            {/* Owner, 29 Oct 2026: how many asked and how many are left (live), then whether she can apply. Nothing about after. */}
            <div className="pp-sh">
              <h2 className="v2-h2">Free Sample</h2>
              {!live && <span className="pp-live"><i /> Live</span>}
            </div>
            {live ? (
              <p className="v2-small" style={{ margin: 0 }}>TikTok shows a free sample you can request. When you apply, TikTok checks your account against the seller&apos;s requirements.</p>
            ) : (
              <div className="pp-count">
                <span className="v2-meter"><i style={{ width: `${(count.applied / count.total) * 100}%` }} /></span>
                <small><b>{count.applied}</b> applied · <b>{count.left}</b> left</small>
              </div>
            )}
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
        {!wish && !wishOpen && (p.tapRate === null || (!hasSample && !live)) && (
          <p className="pp-wishlink">
            Want a free sample or a better rate?{" "}
            <button type="button" onClick={openWish}>{p.wanted ? "Join This Wish" : "Add to Wish List"}</button>
          </p>
        )}
        {wishOpen && <WishForm item={{ id: p.id, name: p.name, shop: p.shop, img: p.img, price: p.price, rate: p.publicRate }} wanted={p.wanted} onCancel={() => setWishOpen(false)} />}
      </div>
    </div>
  );
}
