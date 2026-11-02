"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { AiHead, Bars, Progress, RemoveWarn, Tip } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { removeFromShowcase } from "@/lib/live";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { productHref } from "@/lib/product-view";
import { short } from "@/lib/mock";
import type { BestTime, Market, ViewSlot } from "@/modules/stats/best-time";

type Flag = { id: string; name: string; img: string | null; rating: number; reviews: number; orders: number; cancel: number; returned: number };
type Ratings = { linked: boolean; total: number; checked: number; more: boolean; flagged: Flag[]; at: string };
type Best = BestTime;
type Coverage = { linked: boolean; notYet: { id: string; name: string; sold: number }[] };
export type Signals = { ratings: Ratings | null; best: Best | null; coverage: Coverage | null; channels: string[] | null };

/** Her own signals for the Analytics AI cards (owner, 31 Oct 2026: real data only). Nothing loads when signed out. */
export function useAnalyticsSignals(on: boolean): Signals {
  const [s, setS] = useState<Signals>({ ratings: null, best: null, coverage: null, channels: null });
  useEffect(() => {
    if (!on) return;
    const get = <T,>(url: string) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null);
    void get<Ratings>("/api/v2/ratings").then((ratings) => setS((x) => ({ ...x, ratings: ratings ?? { linked: false, total: 0, checked: 0, more: false, flagged: [], at: "" } })));
    void get<Best>("/api/v2/best-time").then((best) => setS((x) => ({ ...x, best: best ?? { views: null, orders: null, market: null } })));
    void get<Coverage>("/api/v2/coverage").then((coverage) => setS((x) => ({ ...x, coverage: coverage ?? { linked: false, notYet: [] } })));
    void get<{ channels?: { app: string; status: string }[] }>("/api/v2/publish?part=setup&side=creator").then((d) => setS((x) => ({ ...x, channels: (d?.channels ?? []).filter((c) => c.status !== "reconnect").map((c) => c.app) })));
  }, [on]);
  return s;
}

// A time slot shows only with 3 settled posts (owner, 3 Nov 2026).
const shownSlots = (b: Best | null) => b?.views?.slots.filter((s) => s.posts >= 3) ?? [];
/** Her best time: most typical views, else (under 5 settled videos) when her buyers ordered most. */
const topSlot = (b: Best | null): { label: string; views: ViewSlot | null } | null => {
  const v = shownSlots(b);
  if (v.length) { const s = v.reduce((a, c) => (c.typical > a.typical ? c : a)); return { label: s.label, views: s }; }
  const o = (b?.orders?.slots ?? []).filter(([, n]) => n > 0);
  return o.length ? { label: o.reduce((a, c) => (c[1] > a[1] ? c : a))[0], views: null } : null;
};
const full = (n: number) => n.toLocaleString("en-MY");
const usually = (s: ViewSlot) => `Posts at ${s.label} usually got ${full(s.lo)}–${full(s.hi)} views (typical ${full(s.typical)}, from ${s.posts} posts).`;
const FINAL = "Based on your past posts. Your content decides the final result.";
const riskOf = (flagged: Flag[], cancel: number) => {
  const under3 = flagged.filter((f) => f.rating < 3).length;
  return { under3, under4: flagged.length - under3, level: under3 >= 3 || cancel > 15 ? "High" : under3 > 0 || cancel > 10 ? "Watch" : "Low" };
};

/** AI Summary: where her money came from, when to post, and low-rated showcase products, all from her own data. */
export function LiveAiSummary({ sig, span, cancel, lead }: { sig: Signals; span: string; cancel: number; lead: React.ReactNode }) {
  const { toast } = useDemo();
  const [gone, setGone] = useState<string[]>([]);
  const [ask, setAsk] = useState<Flag | null>(null);
  const { ratings, best } = sig;
  const slot = topSlot(best);
  const flagged = (ratings?.flagged ?? []).filter((f) => !gone.includes(f.id));
  const risk = riskOf(flagged, cancel);
  const confirm = async () => {
    if (!ask) return;
    const f = ask;
    setAsk(null);
    toast("Removing from your TikTok showcase…");
    const r = await removeFromShowcase([f.id]);
    if (!r.ok) return toast(r.error);
    setGone((g) => [...g, f.id]);
    toast("Removed from your showcase");
  };
  return (
    <section className="v2-aicard cr2-aisum" aria-label="AI summary">
      <AiHead title="AI Summary" sub={`From your TikTok Shop sales, ${span}`} />
      <ul className="an-lines">
        {lead}
        <li><Icon name="clock" size={18} /><span>{!best ? "Reading your videos…" : slot ? <><b>{slot.label}</b> {slot.views ? "best time to post" : "when your buyers order most"}</> : "Best time to post: not enough posts yet"}</span></li>
        <li className={flagged.length ? "warn" : undefined}><Icon name={flagged.length ? "alert" : "check"} size={18} /><span>{!ratings ? "Checking your showcase ratings…" : !ratings.linked ? "Connect TikTok Shop to check ratings" : flagged.length ? <><b>{flagged.length} product{flagged.length === 1 ? "" : "s"}</b> to avoid</> : <b>No products to avoid</b>}</span></li>
      </ul>

      <div className="cr2-watch">
        <div className="cr2-watch-h">
          <span>
            <b><Icon name="alert" size={17} /> {flagged.length ? `Avoid ${flagged.length === 1 ? "this product" : `these ${flagged.length}`}` : "No low-rated products"} <Tip label="Why avoid" text="Buyers rated these under 4★ on TikTok Shop. Low ratings and many cancels can hurt your TikTok account." /></b>
          </span>
          {ratings?.linked && (
            <span className={`cr2-risk ${risk.level.toLowerCase()}`} title="Rezekii's risk level, from your product ratings and cancelled orders">
              <small>Risk level</small>
              <span className="cr2-risk-bar" aria-hidden="true">{["Low", "Watch", "High"].map((l) => <i key={l} className={l === risk.level ? "on" : ""} />)}</span>
              <b>{risk.level} <Tip label="About risk level" text={`Rezekii's own check of the first ${ratings.total} products in your showcase: ${risk.under3} under 3★, ${risk.under4} at 3–3.9★, ${Math.round(cancel * 10) / 10}% of your orders cancelled. TikTok's own account health is in your TikTok Shop app.`} /></b>
            </span>
          )}
        </div>
        {flagged.slice(0, 5).map((f) => (
          <div key={f.id} className="cr2-watch-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.img ?? NO_PHOTO} alt="" />
            <span>
              <strong><Link href={productHref(f.id)} className="pv-open">{shortName(f.name)}</Link></strong>
              <span className="cr2-flags">
                {f.orders > 0 && <i>{f.cancel}% cancelled</i>}
                <i>{f.rating.toFixed(1)} ★</i>
              </span>
            </span>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => setAsk(f)}>Remove from Showcase</button>
          </div>
        ))}
        {ratings && !ratings.linked && <Link href="/app/account#connections" className="np-btn v2-btn-sm" style={{ alignSelf: "flex-start" }}>Connect TikTok Shop</Link>}
        <Link href="/app/data/risk" className="v2-link" style={{ fontSize: 13.5, padding: "4px 2px 0" }}>{flagged.length > 5 ? `See All ${flagged.length} →` : "See All Ratings →"}</Link>
      </div>
      {ask && <RemoveWarn items={[{ id: ask.id, name: shortName(ask.name), img: ask.img ?? NO_PHOTO }]} onConfirm={() => void confirm()} onClose={() => setAsk(null)} />}
    </section>
  );
}

/**
 * Best Time to Post (owner, 3 Nov 2026): her settled videos' typical views and usual range per time slot, from 30 or 60 days,
 * whichever matched her past posts better; when her buyers ordered when she has under 5; and when TikTok's best-selling videos in
 * her category were posted, as a reference that works for new creators too.
 */
export function LiveBestTime({ sig }: { sig: Signals }) {
  const { best } = sig;
  const v = best?.views;
  const shown = shownSlots(best);
  const slot = topSlot(best);
  const avg = shown.length ? shown.reduce((t, s) => t + s.typical, 0) / shown.length : 0;
  const days = !v ? "" : v.test === "better" ? `Based on your last ${v.days} days, which matched your past posts better than ${v.days === 60 ? 30 : 60} days.` : v.test === "same" ? "Based on your last 60 days, which matched your past posts as well as 30 days." : "Based on your last 60 days: not enough posts yet to test 30 days.";
  const orders = best?.orders;
  return (
    <section className="v2-card v2-aicard an-time an-split">
      <AiHead
        title="Best Time to Post"
        sub={slot ? <span className="an-hv">{slot.views ? "Most views" : "Most orders"} · {slot.label}</span> : undefined}
        tip={<Tip label="About best time" text={v ? `From your own ${v.count} TikTok videos that are at least 7 days old (newer ones are still getting views), by the Malaysia time you posted. Bar: typical views (the middle one, so one viral video doesn't skew it). Number: the usual range (the middle half). A time shows from 3 posts. ${days} Rezekii now also saves each video's views at 1, 7 and 30 days old, to compare videos at the same age later.` : "You have fewer than 5 TikTok videos that are at least 7 days old (last 60 days), so this shows when your buyers ordered in the last 30 days (Malaysia time). It switches to your video views once you post more."} />}
      />
      {!best ? <p className="v2-muted" style={{ margin: 0 }}>Reading your videos…</p> : v ? (
        shown.length && slot?.views ? (
          <>
            <p className="v2-small" style={{ margin: 0 }}>{usually(slot.views)}</p>
            <Bars rows={shown.map((s) => ({ label: s.label, value: s.typical, display: `${short(s.lo)}–${short(s.hi)}`, tone: s.typical < avg ? ("blue" as const) : undefined }))} />
            {shown.length < v.slots.length && <p className="v2-small" style={{ margin: 0 }}>Other times: not enough posts yet.</p>}
            <p className="v2-small" style={{ margin: 0 }}>{FINAL}</p>
          </>
        ) : <p className="v2-muted" style={{ margin: 0 }}>Not enough posts yet. A time shows once it has 3 videos that are at least 7 days old.</p>
      ) : slot && orders ? (
        <>
          <Bars rows={orders.slots.map(([label, n]) => ({ label, value: n, display: `${n} order${n === 1 ? "" : "s"}`, tone: n < orders.count / orders.slots.length ? ("blue" as const) : undefined }))} />
          <p className="v2-small" style={{ margin: 0 }}>Based on your past orders. Your content decides the final result.</p>
        </>
      ) : (
        <p className="v2-muted" style={{ margin: 0 }}>Not enough of your own videos or orders yet. Post a few videos and this fills in.</p>
      )}
      {best?.market && <MarketTimes m={best.market} />}
    </section>
  );
}

/** When TikTok's best-selling videos in her category were posted: winners, not a promise (owner, 3 Nov 2026). */
function MarketTimes({ m }: { m: Market }) {
  const top = m.slots.reduce((a, c) => (c.videos > a.videos ? c : a));
  const cat = m.category ? `in ${m.category} ` : "";
  return (
    <div className="an-ref">
      <h3>
        Best Sellers&apos; Times{" "}
        <Tip label="About best sellers' times" text={`TikTok's daily top-100 best-selling videos in Malaysia from the last ${m.days} days, by the Malaysia time they were posted. ${m.category ? `A video counts for ${m.category}, your main category from what you sell most, when it sells a product from TikTok's top 100 in that category.` : "Your main category isn't known yet, so this is every category."} Bar: share of the videos. Number after it: their typical views. These are winners, not a promise.`} />
      </h3>
      <p className="v2-small" style={{ margin: 0 }}>Best-selling videos {cat}were mostly posted {top.label} ({top.share}% of {full(m.videos)} videos).</p>
      <Bars rows={m.slots.filter((s) => s.videos > 0).map((s) => ({ label: s.label, value: s.share, display: s.typical === null ? `${s.share}%` : `${s.share}% · ${short(s.typical)}` }))} />
    </div>
  );
}

type Step = { id: string; tag: "Fix now" | "This week" | "Grow"; short: string; why: string; href: string };
/** Action Plan from her own signals only: low-rated products, cancels, best sellers not on Rezekii, best time, channels. */
export function LiveActionPlan({ sig, cancel }: { sig: Signals; cancel: number }) {
  const [ticked, setTicked] = useState<string[]>([]);
  const [all, setAll] = useState(false);
  const { ratings, best, coverage, channels } = sig;
  const flagged = ratings?.flagged ?? [];
  const under3 = flagged.filter((f) => f.rating < 3).length;
  const slot = topSlot(best);
  const wish = coverage?.notYet[0];
  const missing = channels ? (["facebook", "instagram", "threads"] as const).filter((a) => !channels.includes(a)) : [];
  const steps: Step[] = [
    ...(ratings && !ratings.linked ? [{ id: "link", tag: "Fix now" as const, short: "Connect TikTok Shop", why: "Rezekii needs your TikTok Shop to check your showcase and orders.", href: "/app/account#connections" }] : []),
    ...(under3 ? [{ id: "under3", tag: "Fix now" as const, short: `Remove ${under3} under-3★ product${under3 === 1 ? "" : "s"}`, why: "Buyers rated them under 3★. Low-rated products in your showcase can hurt your TikTok account.", href: "/app/data/risk" }] : []),
    ...(cancel > 10 ? [{ id: "cancel", tag: "Fix now" as const, short: `${Math.round(cancel * 10) / 10}% of orders cancelled: check why`, why: "Many cancelled orders can hurt your TikTok account. See which products get cancelled most.", href: "/app/data/risk" }] : []),
    ...(flagged.length > under3 ? [{ id: "under4", tag: "This week" as const, short: `Check ${flagged.length - under3} product${flagged.length - under3 === 1 ? "" : "s"} rated 3–3.9★`, why: "Not in the danger zone yet, but buyers aren't happy with them.", href: "/app/data/risk" }] : []),
    ...(slot?.views ? [{ id: "time", tag: "This week" as const, short: `Post at ${slot.label}`, why: `${usually(slot.views)} ${FINAL}`, href: "/app/publish/plan" }] : []),
    ...(wish ? [{ id: "wish", tag: "Grow" as const, short: `Ask for a better rate: ${shortName(wish.name)}`, why: `Your best seller not on Rezekii yet (${wish.sold} sold in 30 days). Add it to your Wish List and we ask the seller.`, href: productHref(wish.id) }] : []),
    ...(missing.length === 3 ? [{ id: "social", tag: "Grow" as const, short: "Connect Facebook, Instagram or Threads", why: "Post one video to every app at once from Publish.", href: "/app/account#connections" }] : []),
  ];
  const loading = !ratings || !best || !coverage || !channels;
  const done = steps.filter((s) => ticked.includes(s.id)).length;
  return (
    <section className="v2-card cr2-plan" aria-label="Your action plan">
      <div className="v2-card-h">
        <h2 className="v2-h2">Your Action Plan</h2>
        {steps.length > 0 && <span className="v2-small">{done} of {steps.length} done</span>}
      </div>
      {steps.length > 0 && <Progress value={done} max={steps.length} />}
      {!steps.length ? (
        <p className="v2-muted" style={{ margin: 0 }}>{loading ? "Reading your showcase, orders and videos…" : "Nothing to fix. Your showcase ratings and cancels look fine."}</p>
      ) : (
        <ol className="an-plan">
          {(all ? steps : steps.slice(0, 3)).map((a, n) => {
            const on = ticked.includes(a.id);
            return (
              <li key={a.id} className={on ? "done" : undefined}>
                <button type="button" role="checkbox" aria-checked={on} aria-label={`Mark done: ${a.short}`} className="an-num" onClick={() => setTicked((t) => (t.includes(a.id) ? t.filter((x) => x !== a.id) : [...t, a.id]))}>
                  {on ? <Icon name="check" size={14} width={3.2} /> : n + 1}
                </button>
                <span className="an-plan-t">{a.short} <Tip label={`Why: ${a.short}`} text={a.why} /></span>
                <Link href={a.href} className="an-go">Go <Icon name="arrow" size={14} /></Link>
              </li>
            );
          })}
        </ol>
      )}
      {steps.length > 3 && <button type="button" className="v2-link an-more" onClick={() => setAll((x) => !x)}>{all ? "Show Less" : `+${steps.length - 3} More`}</button>}
    </section>
  );
}
