"use client";

import Link from "next/link";
import { DataNote } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarPicker, between, dayName, iso } from "@/components/calendar-picker";
import { useDemo } from "@/components/demo";
import { AiHead, Bars, Count, Lock, Progress, RemoveWarn, Seg, Stat, Tip, Title } from "@/components/ui";
import { product, rm, short } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { loadAnalytics, loadAnalyticsRange, type LiveAnalytics } from "@/lib/live";
import { ACTIONS, CHARTS, POST_TIMES, RANGES, RANGE_DATA, SHORT, WATCH, type RangeKey } from "@/lib/mock-creator2";
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

/** Analytics overview: the numbers for any range, an AI summary with low-rated products to avoid, an action plan, and where the money comes from. */
export default function DataOverview() {
  const router = useRouter();
  const { toast, live } = useDemo();
  const [range, setRange] = useKept<RangeKey>("data-range", "30 days");
  // Signed in (owner, 30 Oct 2026): her real orders replace the sample numbers.
  const [real, setReal] = useState<LiveAnalytics | null>(null);
  useEffect(() => {
    if (live) loadAnalytics().then(setReal);
  }, [live]);
  const sig = useAnalyticsSignals(live);
  // Signed in: today and her first order in Malaysia time bound the calendar (owner, 31 Oct 2026).
  const myt = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
  const today = live ? myt(Date.now()) : TODAY;
  const joined = live ? (real?.first ? myt(Date.parse(real.first)) : today) : JOINED;
  const liveSpan = (r: RangeKey): [string, string] => (r === "Lifetime" ? [joined, today] : [myt(Date.now() - (DAYS_IN[r] - 1) * 86_400_000), today]);
  // Own dates from the calendar; this preview shows the sample data of the closest preset.
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [from, to] = custom ?? (live ? liveSpan(range) : SPAN[range]);
  // Signed in, her own dates show exactly those days (owner, 31 Oct 2026); the sample preview uses the closest preset.
  const [picked, setPicked] = useState<Awaited<ReturnType<typeof loadAnalyticsRange>>>(null);
  useEffect(() => {
    setPicked(null);
    if (live && custom) loadAnalyticsRange(custom[0], custom[1]).then(setPicked);
  }, [live, custom]);
  const [split, setSplit] = useKept<"By channel" | "By product">("data-split", "By channel");
  const [removed, setRemoved] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [allPlan, setAllPlan] = useState(false);
  const d = (custom && picked?.range) || (real?.ranges[range] ?? RANGE_DATA[range]);
  const chart = (custom && picked?.chart) || (real?.charts[range] ?? CHARTS[range]);
  const since = live ? (real?.first ? new Date(real.first).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null) : "March 2026";
  const span = live && custom ? `${dayName(from)} – ${dayName(to)}` : range === "Lifetime" ? (since ? `since ${since}` : "all time") : `last ${range}`;
  const synced = real?.syncedAt ? new Date(real.syncedAt) : null;
  const updated = !live ? "Updated today 09:12" : !real ? "Loading your orders…" : synced
    ? `Updated ${myt(synced.getTime()) === today ? "today" : synced.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })} ${synced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}`
    : "No orders yet";

  const ranked = [...d.byProduct].sort((a, b) => b.commission - a.commission);
  const top2 = (ranked[0]?.commission ?? 0) + (ranked[1]?.commission ?? 0);
  const nameOf = (id: string) => SHORT[id] ?? (live ? shortName(product(id).name) : product(id).name);
  const highCancel = d.cancel > 10;
  const bestTime = POST_TIMES.reduce((a, b) => (b[1] > a[1] ? b : a));
  const avgViews = POST_TIMES.reduce((a, [, v]) => a + v, 0) / POST_TIMES.length;
  const change = (n: number | null) => (n === null ? "New" : <><Icon name="trend" size={14} width={2.4} /> {n}%</>);
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
  const risk = under3 >= 3 || d.cancel > 15 ? "High" : under3 > 0 || d.cancel > 10 ? "Watch" : "Low";

  const channelRows = (["Videos", "LIVE", "Showcase"] as const).map((label, i) => ({ label, value: d.channel[i], display: `${d.channel[i]}%` }));
  const productRows = [
    ...ranked.map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: pct(b.commission, d.est), display: `${pct(b.commission, d.est)}%`, href: productHref(b.productId) })),
    { label: "Other products", value: pct(d.other, d.est), display: `${pct(d.other, d.est)}%`, tone: "blue" as const },
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
            setRange(RANGES.reduce((best, r) => (Math.abs(DAYS_IN[r] - n) < Math.abs(DAYS_IN[best] - n) ? r : best), RANGES[0]));
            setCustom([a, b]);
          }}
          presets={PRESETS}
          preset={custom ? null : range}
          onPreset={(k) => { setRange(k as RangeKey); setCustom(null); }}
        />
      </Title>
      {live && <DataNote latest={real?.syncedAt} what="Orders up to" every="Orders update daily at 1:00 am, and again when you open this page" />}

      <Lock what="your sales and commission">
        <div className="v2-stack" style={{ gap: 10 }}>
          <p className="an-range"><b>{rangeLabel}</b>{range !== "Lifetime" && <span>vs the {custom ? `${between(from, to)} days` : range} before</span>}</p>
          <div className="cr2-stats">
            <Stat label="GMV" value={<Count key={`g${range}`} value={d.gmv} format={(n) => rm(n, 0)} />} note={change(d.gmvChange)} tone="up" />
            <Stat label="Orders" value={<Count key={`o${range}`} value={d.orders} />} note={change(d.ordersChange)} tone="up" />
            <Stat label={<>Est. commission <Tip label="About commission" text="Your income from TikTok Shop, not the product's profit. It stays estimated until TikTok settles each order." /></>} value={<Count key={`c${range}`} value={d.est} format={(n) => rm(n)} />} note={`Paid ${rm(d.paid)}`} />
            <div className="v2-stat">
              <small>Cancel rate <Tip label="About cancel rate" text="Green is under 10%. Red means too many cancelled orders." /></small>
              <b className={highCancel ? "cr2-red" : "cr2-green-v"}><i className={`an-dot ${highCancel ? "bad" : "ok"}`} aria-hidden="true" />{d.cancel.toFixed(1)}%</b>
            </div>
          </div>
        </div>
      </Lock>

      {/* Right under the range's numbers (owner, 29 Oct 2026), so she sees where the commission came from. */}
      <section className="v2-card an-src">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission Sources</h2>
        </div>
        <Seg value={split} options={["By channel", "By product"] as const} onChange={setSplit} />
        <Lock what="where your commission comes from">
          <div style={{ paddingTop: 4 }}>
            {split === "By channel" ? <Bars key="ch" rows={channelRows} /> : <Bars key="pr" rows={productRows} />}
          </div>
        </Lock>
      </section>

      <section className="v2-card an-chart">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission <Tip label="About this chart" text={`Estimated, by the ${chart.unit} the order was placed. The latest ${chart.unit} is still in progress.`} /></h2>
        </div>
        <Lock what="your commission over time">
          <CommissionChart key={`${range}${custom ? custom.join() : ""}${picked ? "r" : ""}`} points={chart.points} unit={chart.unit} range={rangeLabel.toLowerCase()} />
        </Lock>
      </section>

      {/* Signed in (owner, 31 Oct 2026): the AI cards read her own ratings, videos, orders and connections. */}
      {live ? <LiveAiSummary sig={sig} span={span} cancel={d.cancel} lead={ranked.length >= 2 ? <li><Icon name="trend" size={18} width={2.2} /><span><b>{pct(top2, d.est)}%</b> from {nameOf(ranked[0].productId)} + {nameOf(ranked[1].productId)}</span></li> : null} /> : (
      <section className="v2-aicard cr2-aisum" aria-label="AI summary">
        <AiHead title="AI Summary" sub={`From your TikTok Shop sales, ${span}`} />
        <ul className="an-lines">
          {ranked.length >= 2 && <li><Icon name="trend" size={18} width={2.2} /><span><b>{pct(top2, d.est)}%</b> from {nameOf(ranked[0].productId)} + {nameOf(ranked[1].productId)}</span></li>}
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
              <b>{risk} <Tip label="About risk level" text={`Rezekii's own check: ${under3} product${under3 === 1 ? "" : "s"} under 3★, ${under4} under 4★, ${d.cancel}% of orders cancelled. TikTok's own account health is in your TikTok Shop app.`} /></b>
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
                  <small>#{i + 1} · {b.orders} orders · {pct(b.commission, d.est)}% of commission</small>
                </span>
                <span className="v2-acts"><b className="v2-num">{rm(b.commission)}</b></span>
              </div>
            );
          })}
        </div>
      </section>

      {live ? <LiveActionPlan sig={sig} cancel={real?.ranges["30 days"]?.cancel ?? d.cancel} /> : (
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
