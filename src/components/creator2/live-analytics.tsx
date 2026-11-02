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

type Flag = { id: string; name: string; img: string | null; rating: number; reviews: number; orders: number; cancel: number; returned: number };
type Ratings = { linked: boolean; total: number; checked: number; more: boolean; flagged: Flag[]; at: string };
type Best = { basis: "views" | "orders"; count: number; slots: [string, number][] };
type Coverage = { linked: boolean; notYet: { id: string; name: string; sold: number }[] };
export type Signals = { ratings: Ratings | null; best: Best | null; coverage: Coverage | null; channels: string[] | null };

/** Her own signals for the Analytics AI cards (owner, 31 Oct 2026: real data only). Nothing loads when signed out. */
export function useAnalyticsSignals(on: boolean): Signals {
  const [s, setS] = useState<Signals>({ ratings: null, best: null, coverage: null, channels: null });
  useEffect(() => {
    if (!on) return;
    const get = <T,>(url: string) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null);
    void get<Ratings>("/api/v2/ratings").then((ratings) => setS((x) => ({ ...x, ratings: ratings ?? { linked: false, total: 0, checked: 0, more: false, flagged: [], at: "" } })));
    void get<Best>("/api/v2/best-time").then((best) => setS((x) => ({ ...x, best: best ?? { basis: "orders", count: 0, slots: [] } })));
    void get<Coverage>("/api/v2/coverage").then((coverage) => setS((x) => ({ ...x, coverage: coverage ?? { linked: false, notYet: [] } })));
    void get<{ channels?: { app: string; status: string }[] }>("/api/v2/publish?part=setup&side=creator").then((d) => setS((x) => ({ ...x, channels: (d?.channels ?? []).filter((c) => c.status !== "reconnect").map((c) => c.app) })));
  }, [on]);
  return s;
}

const topSlot = (b: Best | null) => (b && b.slots.some(([, v]) => v > 0) ? b.slots.reduce((a, c) => (c[1] > a[1] ? c : a)) : null);
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
        <li><Icon name="clock" size={18} /><span>{!best ? "Reading your videos…" : slot ? <><b>{slot[0]}</b> {best.basis === "views" ? "best time to post" : "when your buyers order most"}</> : "Best time to post: not enough videos yet"}</span></li>
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

/** Best Time to Post: average views of her own videos by the hour she posted, or when her buyers ordered. */
export function LiveBestTime({ sig }: { sig: Signals }) {
  const { best } = sig;
  const slot = topSlot(best);
  const avg = best && best.slots.length ? best.slots.reduce((t, [, v]) => t + v, 0) / best.slots.length : 0;
  const views = best?.basis === "views";
  return (
    <section className="v2-card v2-aicard an-time an-split">
      <AiHead
        title="Best Time to Post"
        sub={slot ? <span className="an-hv">{views ? "Most views" : "Most orders"} · {slot[0]}</span> : undefined}
        tip={<Tip label="About best time" text={views ? `From your own ${best!.count} TikTok videos in the last 60 days: the average views in each time slot, by the Malaysia time you posted. Everyone's best time is different.` : "You have fewer than 5 TikTok videos in the last 60 days, so this shows when your buyers ordered in the last 30 days (Malaysia time). It switches to your video views once you post more."} />}
      />
      {!best ? <p className="v2-muted" style={{ margin: 0 }}>Reading your videos…</p> : !slot ? (
        <p className="v2-muted" style={{ margin: 0 }}>Not enough of your own videos or orders yet. Post a few videos and this fills in.</p>
      ) : (
        <Bars rows={best.slots.map(([label, v]) => ({ label, value: v, display: views ? `${short(v)} views` : `${v} order${v === 1 ? "" : "s"}`, tone: v < avg ? ("blue" as const) : undefined }))} />
      )}
    </section>
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
    ...(slot && best?.basis === "views" ? [{ id: "time", tag: "This week" as const, short: `Post at ${slot[0]}`, why: "Your videos posted in this time slot got the most views on average in the last 60 days.", href: "/app/publish/plan" }] : []),
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
