"use client";

import Link from "next/link";
import { Updated } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarPicker, between, dayName, iso } from "@/components/calendar-picker";
import { useDemo } from "@/components/demo";
import { AiHead, Bars, Count, Lock, Progress, RemoveWarn, Seg, Stat, Tip, Title } from "@/components/ui";
import { product, rm, short } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { loadAnalytics, loadAnalyticsRange, retryAnalytics, type LiveAnalytics } from "@/lib/live";
import { CANCEL_MIN_ITEMS, CANCEL_TIP, cancelLevel } from "@/lib/cancel";
import { useSharedRange } from "@/lib/range";
import { DirToggle, useSortPref } from "@/components/sort-bar";
import { ACTIONS, CHARTS, POST_TIMES, RANGES, RANGE_DATA, SHORT, WATCH, type Chart, type RangeData, type RangeKey } from "@/lib/mock-creator2";
import { FLAGGED } from "@/components/creator1/rating-scan";
import { CommissionChart } from "@/components/creator2/commission-chart";
import "@/app/creator2.css";
import { useKept } from "@/lib/keep";
import { shortName } from "@/lib/live-perf";
import { LiveActionPlan, LiveAiSummary, LiveBestTime, useAnalyticsSignals } from "@/components/creator2/live-analytics";

// A real account can have no orders yet, so nothing divides by zero.
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
/** Action plan order (owner, 28 Oct 2026): protect the account first, then today's chance, then this week, then growth. */
const RANK = { "Fix now": 0, "Shoot today": 1, "This week": 2, Grow: 3 } as const;
const PLAN = [...ACTIONS].sort((a, b) => RANK[a.tag] - RANK[b.tag]);
const TODAY = "2026-10-28";
const JOINED = "2026-03-01";
const back = (n: number) => { const d = new Date(Date.UTC(2026, 9, 28 - n)); return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const DAYS_IN: Record<RangeKey, number> = { "3 days": 3, "7 days": 7, "14 days": 14, "30 days": 30, "90 days": 90, Lifetime: between(JOINED, TODAY) };
const SPAN: Record<RangeKey, [string, string]> = Object.fromEntries(RANGES.map((r) => [r, r === "Lifetime" ? [JOINED, TODAY] : [back(DAYS_IN[r] - 1), TODAY]])) as Record<RangeKey, [string, string]>;
const PRESETS: [string, string][] = RANGES.map((r) => [r, r === "Lifetime" ? "Lifetime" : `Last ${r}`]);
/** Nothing loaded yet: zeros for the sums, while the screen shows loading instead of numbers. */
const BLANK: RangeData = { gmv: 0, orders: 0, est: 0, paid: 0, cancel: 0, gmvChange: null, ordersChange: null, channel: [0, 0, 0], byProduct: [], other: 0, note: "" };
type Picked = { status: "idle" | "loading" | "failed"; data: { range: RangeData; chart: Chart } | null };

/** Analytics overview: the numbers for any range, an AI summary with low-rated products to avoid, an action plan, and where the money comes from. */
export default function DataOverview() {
  const router = useRouter();
  const { toast, live } = useDemo();
  // The range is shared with Performance (owner, 1 Nov 2026): pick days here and Performance opens on the same ones.
  const [shared, setShared] = useSharedRange();
  const range = shared.preset;
  const custom = shared.custom;
  // Signed in (owner, 30 Oct 2026): her real orders replace the sample numbers.
  const [real, setReal] = useState<LiveAnalytics | null>(null);
  const [realFailed, setRealFailed] = useState(false);
  const [realTry, setRealTry] = useState(0);
  useEffect(() => {
    if (!live) return;
    let on = true;
    setRealFailed(false);
    loadAnalytics().then((x) => { if (!on) return; setReal(x); setRealFailed(!x); });
    return () => { on = false; };
  }, [live, realTry]);
  const sig = useAnalyticsSignals(live);
  // Signed in: today and her first order in Malaysia time bound the calendar (owner, 31 Oct 2026).
  const myt = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
  const today = live ? myt(Date.now()) : TODAY;
  const joined = live ? (real?.first ? myt(Date.parse(real.first)) : today) : JOINED;
  const liveSpan = (r: RangeKey): [string, string] => (r === "Lifetime" ? [joined, today] : [myt(Date.now() - (DAYS_IN[r] - 1) * 86_400_000), today]);
  // Own dates from the calendar; this preview shows the sample data of the closest preset.
  const [from, to] = custom ?? (live ? liveSpan(range) : SPAN[range]);
  // Signed in, her own dates show exactly those days (owner, 31 Oct 2026); the sample preview uses the closest preset.
  // Only the latest pick shows (owner, 1 Nov 2026): an earlier, slower answer is ignored, and nothing else fills in meanwhile.
  const [picked, setPicked] = useState<Picked>({ status: "idle", data: null });
  const [pickTry, setPickTry] = useState(0);
  useEffect(() => {
    if (!live || !custom) return setPicked({ status: "idle", data: null });
    let on = true;
    setPicked({ status: "loading", data: null });
    loadAnalyticsRange(custom[0], custom[1]).then((x) => { if (on) setPicked(x ? { status: "idle", data: x } : { status: "failed", data: null }); });
    return () => { on = false; };
  }, [live, custom, pickTry]);
  const [split, setSplit] = useKept<"By channel" | "By product">("data-split", "By channel");
  // Highest or lowest first in Commission Sources, remembered (owner, 1 Nov 2026).
  const [, , srcDir, flipSrc] = useSortPref("data-sources", ["Share"] as const, "Share");
  const [removed, setRemoved] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [allPlan, setAllPlan] = useState(false);
  // Signed in, a range shows its own numbers or a loading state, never another range's numbers or the sample (owner, 1 Nov 2026).
  const d: RangeData | null = !live ? RANGE_DATA[range] : custom ? picked.data?.range ?? null : real?.ranges[range] ?? null;
  const chart: Chart | null = !live ? CHARTS[range] : custom ? picked.data?.chart ?? null : real?.charts[range] ?? null;
  const failed = live && (custom ? picked.status === "failed" : realFailed);
  const retry = () => { if (custom) setPickTry((n) => n + 1); else { retryAnalytics(); setRealTry((n) => n + 1); } };
  const dd = d ?? BLANK;
  const wait = (x: React.ReactNode) => (d ? x : <span className="an-wait" aria-label="Loading" />);
  const [topN, setTopN] = useState<5 | 10>(5);
  const since = live ? (real?.first ? new Date(real.first).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null) : "March 2026";
  const span = live && custom ? `${dayName(from)} – ${dayName(to)}` : range === "Lifetime" ? (since ? `since ${since}` : "all time") : `last ${range}`;
  const synced = real?.syncedAt ? new Date(real.syncedAt) : null;
  const updated = !live ? "Updated today 09:12" : !real ? "Loading your orders…" : synced
    ? `Updated ${myt(synced.getTime()) === today ? "today" : synced.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })} ${synced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}`
    : "No orders yet";

  const ranked = [...dd.byProduct].sort((a, b) => b.commission - a.commission);
  const top2 = (ranked[0]?.commission ?? 0) + (ranked[1]?.commission ?? 0);
  const nameOf = (id: string) => SHORT[id] ?? (live ? shortName(product(id).name) : product(id).name);
  // By items (owner, 1 Nov 2026); judged by Rezekii's standard only from 5 items sold.
  const judged = dd.items === undefined || dd.items >= CANCEL_MIN_ITEMS;
  const cancelAt = judged ? cancelLevel(dd.cancel) : null;
  const bestTime = POST_TIMES.reduce((a, b) => (b[1] > a[1] ? b : a));
  const avgViews = POST_TIMES.reduce((a, [, v]) => a + v, 0) / POST_TIMES.length;
  // Drops in red with a down arrow, rises in green with an up arrow (owner, 1 Nov 2026).
  const change = (n: number | null) => (n === null ? "New" : <><span className={n < 0 ? "an-down" : undefined}><Icon name="trend" size={14} width={2.4} /></span> {n > 0 ? "+" : ""}{n}%</>);
  const tone = (n: number | null) => (n !== null && n < 0 ? "down" : "up");
  const rangeLabel = custom ? `${dayName(from)} – ${dayName(to)}` : PRESETS.find(([k]) => k === range)![1];

  // Removing asks first: she sees the risk and confirms (owner, 28 Oct 2026).
  const [ask, setAsk] = useState<string | null>(null);
  const remove = (id: string) => setAsk(id);
  const confirmRemove = () => {
    if (!ask) return;
    setRemoved((r) => [...r, ask]);
    toast(`Removed from your showcase: ${product(ask).name}`);
    setAsk(null);
  };
  const isDone = (a: (typeof ACTIONS)[number]) => ticked.includes(a.id) || (!!a.remove && removed.includes(a.remove));
  const doneCount = ACTIONS.filter(isDone).length;
  const watching = WATCH.filter((w) => !removed.includes(w.productId));
  // Rezekii's own risk level (owner, 28 Oct 2026), read from real data only: showcase ratings and her cancelled orders.
  // TikTok doesn't share its account health score with apps, so we never show one.
  const under3 = FLAGGED.filter((p) => p.rating < 3 && !removed.includes(p.id)).length;
  const under4 = FLAGGED.filter((p) => p.rating >= 3).length;
  const risk = under3 >= 3 || cancelAt === "high" ? "High" : under3 > 0 || cancelAt === "watch" ? "Watch" : "Low";

  const flipRows = <T,>(rows: T[]) => (srcDir === "asc" ? [...rows].reverse() : rows);
  const channelRows = flipRows((["Videos", "LIVE", "Showcase"] as const).map((label, i) => ({ label, value: dd.channel[i], display: `${dd.channel[i]}%` })).sort((a, b) => b.value - a.value));
  // By product (owner, 1 Nov 2026): ranked most to least, Top 5 (or Top 10 when opened), each name opening its product, then
  // everything below them as Others. Opening Top 10 moves products 6–10 out of Others, so its share gets smaller.
  const others = dd.other + ranked.slice(topN).reduce((a, b) => a + b.commission, 0);
  const productRows = [
    ...flipRows(ranked.slice(0, topN).map((b, i) => ({ label: `${i + 1}. ${product(b.productId).name}`, value: pct(b.commission, dd.est), display: `${pct(b.commission, dd.est)}%`, href: productHref(b.productId) }))),
    ...(others > 0 ? [{ label: `Others · #${topN + 1} and below`, value: pct(others, dd.est), display: `${pct(others, dd.est)}%`, tone: "blue" as const }] : []),
  ];

  return (
    <div className="v2-stack v2-in an-page" style={{ gap: 22 }}>
      <Title title="Analytics" sub={updated}>
        <CalendarPicker
          compact
          label={rangeLabel}
          sub={`${dayName(from)} – ${dayName(to)} · ${between(from, to)} days`}
          today={today}
          first={joined}
          from={from}
          to={to}
          onRange={(a, b) => {
            const n = between(a, b);
            setShared({ preset: RANGES.reduce((best, r) => (Math.abs(DAYS_IN[r] - n) < Math.abs(DAYS_IN[best] - n) ? r : best), RANGES[0]), custom: [a, b] });
          }}
          presets={PRESETS}
          preset={custom ? null : range}
          onPreset={(k) => setShared({ preset: k as RangeKey, custom: null })}
        />
      </Title>
      {live && <Updated at={real?.syncedAt} />}

      <Lock what="your sales and commission">
        <div className="v2-stack" style={{ gap: 10 }}>
          <p className="an-range"><b>{rangeLabel}</b>{range !== "Lifetime" && <span>vs the {custom ? `${between(from, to)} days` : range} before</span>}</p>
          {failed && <p className="an-failed"><Icon name="alert" size={16} /> Couldn&apos;t load these days. <button type="button" className="v2-link" onClick={retry}>Try again</button></p>}
          <div className="cr2-stats">
            <Stat label="GMV" value={wait(<Count key={`g${range}${from}${to}`} value={dd.gmv} format={(n) => rm(n, 0)} />)} note={d ? change(dd.gmvChange) : undefined} tone={tone(dd.gmvChange)} />
            <Stat label="Orders" value={wait(<Count key={`o${range}${from}${to}`} value={dd.orders} />)} note={d ? change(dd.ordersChange) : undefined} tone={tone(dd.ordersChange)} />
            <Stat label={<>Est. commission <Tip label="About commission" text="Your income from TikTok Shop, not the product's profit. It stays estimated until TikTok settles each order." /></>} value={wait(<Count key={`c${range}${from}${to}`} value={dd.est} format={(n) => rm(n)} />)} note={d ? `Paid ${rm(dd.paid)}` : undefined} />
            <div className="v2-stat">
              <small>Cancel rate <Tip label="About cancel rate" text={CANCEL_TIP} /></small>
              {d ? <b className={cancelAt === "high" ? "cr2-red" : cancelAt === "watch" ? "cr2-orange-v" : cancelAt === "ok" ? "cr2-green-v" : undefined}>{cancelAt && <i className={`an-dot ${cancelAt === "high" ? "bad" : cancelAt}`} aria-hidden="true" />}{dd.cancel.toFixed(1)}%</b> : <b>{wait(null)}</b>}
              {d && dd.items !== undefined && <em className="cr-items">{dd.cancelItems ?? 0} of {dd.items} item{dd.items === 1 ? "" : "s"}{judged ? "" : " · too few to judge"}</em>}
            </div>
          </div>
        </div>
      </Lock>

      {/* Right under the range's numbers (owner, 29 Oct 2026), so she sees where the commission came from. */}
      <section className="v2-card an-src">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission Sources</h2>
        </div>
        <div className="sb-bar">
          <Seg value={split} options={["By channel", "By product"] as const} onChange={setSplit} />
          <DirToggle dir={srcDir} onFlip={flipSrc} />
        </div>
        <Lock what="where your commission comes from">
          <div style={{ paddingTop: 4 }}>
            {!d ? <p className="v2-muted an-loading">{failed ? "Couldn't load these days." : "Loading…"}</p> : split === "By channel" ? <Bars key="ch" rows={channelRows} /> : (
              <>
                <Bars key={`pr${topN}${srcDir}`} rows={productRows} />
                {ranked.length > 5 && (
                  <div className="an-topn">
                    <button type="button" className="v2-link" onClick={() => setTopN((n) => (n === 5 ? 10 : 5))}>{topN === 5 ? `Show Top ${Math.min(10, ranked.length)}` : "Show Top 5"}</button>
                    <small>{topN === 5 ? "Others is every product ranked 6th and below." : `Others is now every product ranked ${Math.min(10, ranked.length) + 1}th and below, so its share is smaller.`}</small>
                  </div>
                )}
              </>
            )}
          </div>
        </Lock>
      </section>

      <section className="v2-card an-chart">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission <Tip label="About this chart" text={`Estimated, by the ${chart?.unit ?? "day"} the order was placed. The latest ${chart?.unit ?? "day"} is still in progress.`} /></h2>
        </div>
        <Lock what="your commission over time">
          {chart ? <CommissionChart key={`${range}${custom ? custom.join() : ""}`} points={chart.points} unit={chart.unit} range={rangeLabel.toLowerCase()} /> : <p className="v2-muted an-loading">{failed ? "Couldn't load these days." : "Loading…"}</p>}
        </Lock>
      </section>

      {/* Signed in (owner, 31 Oct 2026): the AI cards read her own ratings, videos, orders and connections. */}
      {live ? <LiveAiSummary sig={sig} span={span} cancel={dd.cancel} lead={ranked.length >= 2 ? <li><Icon name="trend" size={18} width={2.2} /><span><b>{pct(top2, dd.est)}%</b> from {nameOf(ranked[0].productId)} + {nameOf(ranked[1].productId)}</span></li> : null} /> : (
      <section className="v2-aicard cr2-aisum" aria-label="AI summary">
        <AiHead title="AI Summary" sub={`From your TikTok Shop sales, ${span}`} />
        <ul className="an-lines">
          {ranked.length >= 2 && <li><Icon name="trend" size={18} width={2.2} /><span><b>{pct(top2, dd.est)}%</b> from {nameOf(ranked[0].productId)} + {nameOf(ranked[1].productId)}</span></li>}
          <li><Icon name="clock" size={18} /><span><b>{bestTime[0]}</b> best time to post</span></li>
          <li className={watching.length ? "warn" : undefined}><Icon name={watching.length ? "alert" : "check"} size={18} /><span>{watching.length ? <><b>{watching.length} product{watching.length === 1 ? "" : "s"}</b> to avoid</> : <b>No products to avoid</b>}</span></li>
        </ul>

        <div className="cr2-watch">
          <div className="cr2-watch-h">
            <span>
              <b><Icon name="alert" size={17} /> {watching.length ? `Avoid ${watching.length === 1 ? "this product" : `these ${watching.length}`}` : "No low-rated products"} <Tip label="Why avoid" text="Low ratings and many cancels can hurt your TikTok account." /></b>
            </span>
            <span className={`cr2-risk ${risk.toLowerCase()}`} title="Rezekii's risk level, from your product ratings and cancelled orders">
              <small>Risk level</small>
              <span className="cr2-risk-bar" aria-hidden="true">{["Low", "Watch", "High"].map((l) => <i key={l} className={l === risk ? "on" : ""} />)}</span>
              <b>{risk} <Tip label="About risk level" text={`Rezekii's own check: ${under3} product${under3 === 1 ? "" : "s"} under 3★, ${under4} under 4★, ${dd.items !== undefined ? `${dd.cancelItems ?? 0} of ${dd.items} items` : `${dd.cancel}%`} cancelled. TikTok's own account health is in your TikTok Shop app.`} /></b>
            </span>
          </div>
          {WATCH.map((w) => {
            const p = product(w.productId);
            const gone = removed.includes(w.productId);
            return (
              <div key={w.productId} className={`cr2-watch-row ${gone ? "gone" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
                <span>
                  <strong><Link href={productHref(p.id)} className="pv-open">{p.name}</Link></strong>
                  <span className="cr2-flags">
                    <i>{w.cancel}% cancelled</i>
                    <i>{w.rating.toFixed(1)} ★</i>
                  </span>
                </span>
                {gone ? (
                  <span className="badge badge-gray"><Icon name="check" size={12} width={3} /> Removed</span>
                ) : (
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => remove(w.productId)}>Remove from showcase</button>
                )}
              </div>
            );
          })}
          <Link href="/app/data/risk" className="v2-link" style={{ fontSize: 13.5, padding: "4px 2px 0" }}>See all ratings →</Link>
        </div>
      </section>
      )}



      {/* An AI feature (owner, 29 Oct 2026): worked out from her own posts, so everyone's best time is different. */}
      {live ? <LiveBestTime sig={sig} /> : (
      <section className="v2-card v2-aicard an-time an-split">
        <AiHead title="Best Time to Post" sub={<span className="an-hv">High virality · {bestTime[0]}</span>} tip={<Tip label="About best time" text="Rezekii AI looks at your own videos from the last 30 days and the average views in each time slot. Everyone's best time is different." />} />
        <Bars rows={POST_TIMES.map(([label, v]) => ({ label, value: v, display: `${short(v)} views`, tone: v < avgViews ? ("blue" as const) : undefined }))} />
      </section>
      )}

      <section className="v2-card an-top">
        <div className="v2-card-h">
          <h2 className="v2-h2">Top Earning Products</h2>
          <Link href="/app/data/performance#product">All products</Link>
        </div>
        <div className="v2-divide">
          {ranked.slice(0, 3).map((b, i) => {
            const p = product(b.productId);
            return (
              <div key={b.productId} className="v2-prow">
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
                <span>
                  <strong><Link href={productHref(p.id)} className="pv-open">{live ? shortName(p.name) : p.name}</Link></strong>
                  <small>#{i + 1} · {b.orders} orders · {pct(b.commission, dd.est)}% of commission</small>
                </span>
                <span className="v2-acts"><b className="v2-num">{rm(b.commission)}</b></span>
              </div>
            );
          })}
        </div>
      </section>

      {live ? <LiveActionPlan sig={sig} cancel={real?.ranges["30 days"]?.cancel ?? dd.cancel} /> : (
      <section className="v2-card cr2-plan" aria-label="Your action plan">
        <div className="v2-card-h">
          <h2 className="v2-h2">Your Action Plan</h2>
          <span className="v2-small">{doneCount} of {ACTIONS.length} done</span>
        </div>
        <Progress value={doneCount} max={ACTIONS.length} />
        {/* A short checklist (owner, 28 Oct 2026: option B): the top 3 to do, a few words each, one colour. */}
        <ol className="an-plan">
          {(allPlan ? PLAN : PLAN.slice(0, 3)).map((a, n) => {
            const done = isDone(a);
            return (
              <li key={a.id} className={done ? "done" : undefined}>
                <button type="button" role="checkbox" aria-checked={done} aria-label={`Mark done: ${a.title}`} className="an-num" onClick={() => setTicked((t) => (t.includes(a.id) ? t.filter((x) => x !== a.id) : [...t, a.id]))}>
                  {done ? <Icon name="check" size={14} width={3.2} /> : n + 1}
                </button>
                <span className="an-plan-t">{a.short} <Tip label={`Why: ${a.short}`} text={a.why} /></span>
                {a.remove ? (
                  <button type="button" className="an-go" disabled={removed.includes(a.remove)} onClick={() => remove(a.remove!)}>{removed.includes(a.remove) ? "Removed" : "Remove"}</button>
                ) : (
                  <Link href={a.href!} className="an-go">Go <Icon name="arrow" size={14} /></Link>
                )}
              </li>
            );
          })}
        </ol>
        {PLAN.length > 3 && <button type="button" className="v2-link an-more" onClick={() => setAllPlan((x) => !x)}>{allPlan ? "Show less" : `+${PLAN.length - 3} more`}</button>}
      </section>
      )}
      {ask && <RemoveWarn items={[{ id: ask, name: product(ask).name, img: product(ask).img }]} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
    </div>
  );
}
