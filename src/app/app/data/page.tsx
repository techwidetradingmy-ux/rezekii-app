"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarPicker, between, dayName, iso } from "@/components/calendar-picker";
import { useDemo } from "@/components/demo";
import { AiMark, Bars, Count, Lock, Progress, Seg, Stat, Title } from "@/components/ui";
import { product, rm } from "@/lib/mock";
import { ACTIONS, CHARTS, HEALTH, POST_TIMES, RANGES, RANGE_DATA, SHORT, WATCH, type RangeKey } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const pct = (n: number, of: number) => Math.round((n / of) * 100);
const TAG = { "Shoot today": "green", "Fix now": "red", "This week": "amber", Grow: "violet" } as const;
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
  const d = RANGE_DATA[range];
  const chart = CHARTS[range];
  const span = range === "Lifetime" ? "since March 2026" : `last ${range}`;

  const ranked = [...d.byProduct].sort((a, b) => b.commission - a.commission);
  const top2 = ranked[0].commission + ranked[1].commission;
  const highCancel = d.cancel > 10;
  const change = (n: number | null) => (n === null ? "Since you joined in March" : `Up ${n}% on the ${range} before`);

  const remove = (id: string) => {
    setRemoved((r) => [...r, id]);
    toast(`Removed from your showcase: ${product(id).name}`);
  };
  const isDone = (a: (typeof ACTIONS)[number]) => ticked.includes(a.id) || (!!a.remove && removed.includes(a.remove));
  const doneCount = ACTIONS.filter(isDone).length;
  const watching = WATCH.filter((w) => !removed.includes(w.productId));

  const channelRows = (["Videos", "LIVE", "Showcase"] as const).map((label, i) => ({ label, value: d.channel[i], display: `${d.channel[i]}%` }));
  const productRows = [
    ...ranked.map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: pct(b.commission, d.est), display: `${pct(b.commission, d.est)}%` })),
    { label: "Other products", value: pct(d.other, d.est), display: `${pct(d.other, d.est)}%`, tone: "blue" as const },
  ];
  const max = Math.max(...chart.points.map(([, v]) => v));
  const every = Math.ceil(chart.points.length / 6);
  const gap = chart.points.length > 14 ? 3 : 6;

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <Title title="Analytics" sub={<>Updated today 09:12 · from your TikTok Shop orders</>}>
        <CalendarPicker
          label={custom ? `${dayName(from)} – ${dayName(to)}` : PRESETS.find(([k]) => k === range)![1]}
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
          <div className="cr2-stats">
            <Stat label="GMV" value={<Count key={`g${range}`} value={d.gmv} format={(n) => rm(n, 0)} />} note={change(d.gmvChange)} tone="up" />
            <Stat label="Orders" value={<Count key={`o${range}`} value={d.orders} />} note={change(d.ordersChange)} tone="up" />
            <Stat label="Commission (estimated)" value={<Count key={`c${range}`} value={d.est} format={(n) => rm(n)} />} note={`Paid ${rm(d.paid)}`} />
            <div className="v2-stat">
              <small>Cancel rate</small>
              <b className={highCancel ? "cr2-red" : undefined}>{d.cancel.toFixed(1)}%</b>
              <em className={highCancel ? "down" : "up"}>{highCancel ? "High: above 10%" : "Healthy: under 10%"}</em>
            </div>
          </div>
          <p className="cr2-note">
            <Icon name="wallet" size={15} />
            <span>Commission is your income from TikTok Shop, not the product&apos;s profit. It stays estimated until TikTok settles each order.</span>
          </p>
        </div>
      </Lock>

      <section className="v2-aicard cr2-aisum" aria-label="AI summary">
        <div className="cr2-aisum-h">
          <AiMark size={44} />
          <span>
            <span className="v2-ailabel">AI summary · {span}</span>
            <small>Written only from your real numbers. It doesn&apos;t predict what you will earn.</small>
          </span>
        </div>
        <div className="cr2-aisum-text">
          <p>
            {pct(top2, d.est)}% of your commission came from 2 products: the {SHORT[ranked[0].productId].toLowerCase()} and the {SHORT[ranked[1].productId].toLowerCase()}.
          </p>
          <p>{d.note}</p>
        </div>

        <div className="cr2-watch">
          <div className="cr2-watch-h">
            <span>
              <b><Icon name="alert" size={17} /> {watching.length ? `Avoid promoting ${watching.length === 1 ? "this product" : `these ${watching.length} products`}` : "No low-rated products"}</b>
              <small>They&apos;re lowering your account health</small>
            </span>
            <span className="cr2-health" title="Account health from TikTok, out of 100">
              <small>Account health</small>
              <b>{HEALTH.score}</b>
              <em><Icon name="arrow" size={11} width={3} /> {Math.abs(HEALTH.change)} in 30 days</em>
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
                    <i>{w.complaints} complaints</i>
                  </span>
                  <small>{w.issue}</small>
                </span>
                {gone ? (
                  <span className="badge badge-gray"><Icon name="check" size={12} width={3} /> Removed</span>
                ) : (
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => remove(w.productId)}>Remove from showcase</button>
                )}
              </div>
            );
          })}
          <Link href="/app/ratings" className="v2-link" style={{ fontSize: 13.5, padding: "4px 2px 0" }}>Check every product&apos;s rating →</Link>
          <p className="cr2-watch-why">
            Cancels, complaints and low ratings cost you account health. When it drops, TikTok can limit your traffic, and your GMV drops with it. Removing a
            product doesn&apos;t touch commission you&apos;ve already earned.
          </p>
        </div>
      </section>

      <section className="v2-card cr2-plan" aria-label="Your action plan">
        <div className="v2-card-h">
          <h2 className="v2-h2">Your action plan</h2>
          <span className="v2-small">{doneCount} of {ACTIONS.length} done</span>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>What to do next, worked out from your numbers above. Most urgent first.</p>
        <Progress value={doneCount} max={ACTIONS.length} />
        <ol className="cr2-plan-list">
          {ACTIONS.map((a) => {
            const done = isDone(a);
            return (
              <li key={a.id} className={done ? "done" : undefined}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`Mark done: ${a.title}`}
                  className="cr2-check"
                  onClick={() => setTicked((t) => (t.includes(a.id) ? t.filter((x) => x !== a.id) : [...t, a.id]))}
                >
                  {done && <Icon name="check" size={14} width={3.2} />}
                </button>
                <span className="cr2-plan-main">
                  <span className={`cr2-tag ${TAG[a.tag]}`}>{a.tag}</span>
                  <b>{a.title}</b>
                  <small>{a.why}</small>
                </span>
                {a.remove ? (
                  <button type="button" className="btn-outline v2-btn-sm" disabled={removed.includes(a.remove)} onClick={() => remove(a.remove!)}>
                    {removed.includes(a.remove) ? "Removed" : a.cta}
                  </button>
                ) : (
                  <Link href={a.href!} className={a.tag === "Fix now" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"}>{a.cta}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission per {chart.unit}</h2>
          <span className="v2-small">{range === "Lifetime" ? "Since March 2026" : `Last ${range}`} · {rm(d.est)}</span>
        </div>
        <Lock what="your commission over time">
          <div>
            <div className="cr2-cols" style={{ gap }} role="img" aria-label={`Commission per ${chart.unit}, ${span}`} key={range}>
              {chart.points.map(([l, v], i) => {
                const last = i === chart.points.length - 1;
                return (
                  <span key={l} className={last ? undefined : "soft"} style={{ height: `${(v / max) * 100}%`, animationDelay: `${Math.min(i, 20) * 25}ms` }} title={`${l}: ${rm(v)}`}>
                    {last && <em>{rm(v, 0)}</em>}
                  </span>
                );
              })}
            </div>
            <div className="cr2-axis" style={{ gap }} aria-hidden="true">
              {chart.points.map(([l], i) => {
                const last = i === chart.points.length - 1;
                return <span key={l}>{last ? (chart.unit === "day" ? "Today" : chart.unit === "week" ? "This week" : l) : i % every === 0 ? l : ""}</span>;
              })}
            </div>
          </div>
        </Lock>
        <p className="v2-small" style={{ margin: 0 }}>Estimated commission by the {chart.unit} the order was placed. The latest {chart.unit} is still in progress.</p>
      </section>

      <div className="v2-grid2">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Where your commission comes from</h2>
          </div>
          <Seg value={split} options={["By channel", "By product"] as const} onChange={setSplit} />
          <Lock what="where your commission comes from">
            <div style={{ paddingTop: 4 }}>
              {split === "By channel" ? <Bars key="ch" rows={channelRows} /> : <Bars key="pr" rows={productRows} />}
            </div>
          </Lock>
          <p className="v2-small" style={{ margin: 0 }}>
            {split === "By channel"
              ? `Videos bring ${d.channel[0]}% of your commission. LIVE brings ${d.channel[1]}%.`
              : `Share of your ${rm(d.est)} estimated commission, ${span}.`}
          </p>
        </section>

        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Best time to post</h2>
            <span className="v2-small">Views against your average</span>
          </div>
          <Bars rows={POST_TIMES.map(([label, x]) => ({ label, value: x, display: `${x}×`, tone: x < 1 ? ("blue" as const) : undefined }))} />
          <p className="v2-small" style={{ margin: 0 }}>Your videos posted 8 to 10 pm get the most views. From your last 30 days of videos.</p>
        </section>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Top earning products</h2>
          <Link href="/app/data/products">All products</Link>
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
    </div>
  );
}
