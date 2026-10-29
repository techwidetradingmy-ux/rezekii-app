"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarPicker, between, dayName, iso } from "@/components/calendar-picker";
import { useDemo } from "@/components/demo";
import { AiMark, Bars, Count, Lock, Progress, RemoveWarn, Seg, Stat, Tip, Title } from "@/components/ui";
import { product, rm, short } from "@/lib/mock";
import { ACTIONS, CHARTS, POST_TIMES, RANGES, RANGE_DATA, SHORT, WATCH, type RangeKey } from "@/lib/mock-creator2";
import { FLAGGED } from "@/components/creator1/rating-scan";
import { CommissionChart } from "@/components/creator2/commission-chart";
import "@/app/creator2.css";

const pct = (n: number, of: number) => Math.round((n / of) * 100);
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
  const { toast } = useDemo();
  const [range, setRange] = useState<RangeKey>("30 days");
  // Own dates from the calendar; this preview shows the sample data of the closest preset.
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [from, to] = custom ?? SPAN[range];
  const [split, setSplit] = useState<"By channel" | "By product">("By channel");
  const [removed, setRemoved] = useState<string[]>([]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [allPlan, setAllPlan] = useState(false);
  const d = RANGE_DATA[range];
  const chart = CHARTS[range];
  const span = range === "Lifetime" ? "since March 2026" : `last ${range}`;

  const ranked = [...d.byProduct].sort((a, b) => b.commission - a.commission);
  const top2 = ranked[0].commission + ranked[1].commission;
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
    ...ranked.map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: pct(b.commission, d.est), display: `${pct(b.commission, d.est)}%` })),
    { label: "Other products", value: pct(d.other, d.est), display: `${pct(d.other, d.est)}%`, tone: "blue" as const },
  ];

  return (
    <div className="v2-stack v2-in an-page" style={{ gap: 22 }}>
      <Title title="Analytics" sub="Updated today 09:12">
        <CalendarPicker
          compact
          label={rangeLabel}
          sub={`${dayName(from)} – ${dayName(to)} · ${between(from, to)} days`}
          today={TODAY}
          first={JOINED}
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

      <section className="v2-card an-chart">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission <Tip label="About this chart" text={`Estimated, by the ${chart.unit} the order was placed. The latest ${chart.unit} is still in progress.`} /></h2>
        </div>
        <Lock what="your commission over time">
          <CommissionChart key={range} points={chart.points} unit={chart.unit} range={rangeLabel.toLowerCase()} />
        </Lock>
      </section>

      <section className="v2-aicard cr2-aisum" aria-label="AI summary">
        <div className="cr2-aisum-h">
          <AiMark size={44} />
          <span>
            <span className="v2-ailabel">AI summary · {span}</span>
            <small>Based on your TikTok Shop sales</small>
          </span>
        </div>
        <ul className="an-lines">
          <li><Icon name="trend" size={18} width={2.2} /><span><b>{pct(top2, d.est)}%</b> from {SHORT[ranked[0].productId]} + {SHORT[ranked[1].productId]}</span></li>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span>
                  <strong>{p.name}</strong>
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



      <div className="v2-grid2 an-split">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Where Your Commission Comes from</h2>
          </div>
          <Seg value={split} options={["By channel", "By product"] as const} onChange={setSplit} />
          <Lock what="where your commission comes from">
            <div style={{ paddingTop: 4 }}>
              {split === "By channel" ? <Bars key="ch" rows={channelRows} /> : <Bars key="pr" rows={productRows} />}
            </div>
          </Lock>
        </section>

        <section className="v2-card an-time">
          <div className="v2-card-h">
            <h2 className="v2-h2">Best Time to Post <Tip label="About best time" text="Average views per video you posted in each time slot, last 30 days." /></h2>
            <span className="an-hv">High virality · {bestTime[0]}</span>
          </div>
          <Bars rows={POST_TIMES.map(([label, v]) => ({ label, value: v, display: `${short(v)} views`, tone: v < avgViews ? ("blue" as const) : undefined }))} />
        </section>
      </div>

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span>
                  <strong>{p.name}</strong>
                  <small>#{i + 1} · {b.orders} orders · {pct(b.commission, d.est)}% of commission</small>
                </span>
                <span className="v2-acts"><b className="v2-num">{rm(b.commission)}</b></span>
              </div>
            );
          })}
        </div>
      </section>

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
      {ask && <RemoveWarn items={[{ id: ask, name: product(ask).name, img: product(ask).img }]} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
    </div>
  );
}
