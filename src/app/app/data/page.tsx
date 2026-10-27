"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Count, Lock, Seg, Stat, Title } from "@/components/ui";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { RANGES, RANGE_DATA, SHORT, WEEKLY_COMMISSION, WEEK_LABELS, type RangeKey } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const pct = (n: number, of: number) => Math.round((n / of) * 100);

/** My data overview: the numbers, one plain AI summary, where the money comes from, what needs attention. */
export default function DataOverview() {
  const { toast } = useDemo();
  const [range, setRange] = useState<RangeKey>("30 days");
  const [split, setSplit] = useState<"By channel" | "By product">("By channel");
  const [removed, setRemoved] = useState(false);
  const d = RANGE_DATA[range];

  const ranked = [...d.byProduct].sort((a, b) => b.commission - a.commission);
  const top2 = ranked[0].commission + ranked[1].commission;
  const highCancel = d.cancel > 10;

  const riskVideo = ANALYTICS.videos.find((v) => v.id === "v2")!;
  const lowRated = product("p17");

  const channelRows = (["Videos", "LIVE", "Showcase"] as const).map((label, i) => ({ label, value: d.channel[i], display: `${d.channel[i]}%` }));
  const productRows = [
    ...ranked.map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: pct(b.commission, d.est), display: `${pct(b.commission, d.est)}%` })),
    { label: "Other products", value: pct(d.other, d.est), display: `${pct(d.other, d.est)}%`, tone: "blue" as const },
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <Title title="My data" sub={<>Updated today 09:12 · from your TikTok Shop orders</>}>
        <Seg value={range} options={RANGES} onChange={setRange} />
      </Title>

      <Lock what="your sales and commission">
        <div className="v2-stack" style={{ gap: 10 }}>
          <div className="cr2-stats">
            <Stat label="GMV" value={<Count key={`g${range}`} value={d.gmv} format={(n) => rm(n, 0)} />} note={`Up ${d.gmvChange}% on the ${range} before`} tone="up" />
            <Stat label="Orders" value={<Count key={`o${range}`} value={d.orders} />} note={`Up ${d.ordersChange}% on the ${range} before`} tone="up" />
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

      <section className="cr2-ai" aria-label="AI summary">
        <span className="cr2-ai-ico"><Icon name="spark" size={20} width={2.2} /></span>
        <div>
          <small>AI summary · last {range}</small>
          <p>
            {pct(top2, d.est)}% of your commission came from 2 products: the {SHORT[ranked[0].productId].toLowerCase()} and the {SHORT[ranked[1].productId].toLowerCase()}.
          </p>
          <p>{d.note}</p>
          <span className="v2-small">Written only from your real numbers. It doesn&apos;t predict what you will earn.</span>
        </div>
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
              : `Share of your ${rm(d.est)} estimated commission, last ${range}.`}
          </p>
        </section>

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

      <section className="v2-card cr2-attn" aria-label="Needs attention">
        <div className="v2-card-h">
          <h2 className="v2-h2"><Icon name="alert" size={20} /> Needs attention</h2>
          <Link href="/app/data/risk" style={{ color: "var(--red)" }}>Returns & risk</Link>
        </div>
        <div>
          <div className="cr2-attn-row">
            <span className="cr2-attn-ico"><Icon name="video" /></span>
            <span>
              <strong>High-risk video: {riskVideo.cancel}% cancelled</strong>
              <small>&ldquo;{riskVideo.title}&rdquo; · {riskVideo.date}. Your average is {ANALYTICS.cancelRate}%.</small>
            </span>
            <Link href="/app/data/videos" className="np-btn v2-btn-sm">See video</Link>
          </div>
          <div className="cr2-attn-row">
            <span className="cr2-attn-ico"><Icon name="star" /></span>
            <span>
              <strong>Low-rated product: {lowRated.rating.toFixed(1)} stars</strong>
              <small>{lowRated.name} is rated below 3.0. Low ratings can make buyers trust your videos less.</small>
            </span>
            {removed ? (
              <span className="badge badge-gray">Removed</span>
            ) : (
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setRemoved(true); toast("Removed from your showcase. You can add it back any time."); }}>
                Remove from showcase
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Commission per week</h2>
          <span className="v2-small">Last 12 weeks · last {range} in green</span>
        </div>
        <Lock what="your weekly commission">
          <div>
            <div className="cr2-cols" role="img" aria-label="Weekly commission, last 12 weeks">
              {WEEKLY_COMMISSION.map((v, i) => {
                const inRange = i >= WEEKLY_COMMISSION.length - d.weeks;
                const max = Math.max(...WEEKLY_COMMISSION);
                return (
                  <span key={i} className={inRange ? undefined : "dim"} style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 40}ms` }} title={`${WEEK_LABELS[i]}: ${rm(v, 0)}`}>
                    {i === WEEKLY_COMMISSION.length - 1 && <em>{rm(v, 0)}</em>}
                  </span>
                );
              })}
            </div>
            <div className="cr2-axis" aria-hidden="true">
              {WEEK_LABELS.map((l, i) => (
                <span key={l}>{i % 4 === 0 ? l : i === WEEK_LABELS.length - 1 ? "Now" : ""}</span>
              ))}
            </div>
          </div>
        </Lock>
        <p className="v2-small" style={{ margin: 0 }}>Estimated commission by the week the order was placed. This week is still in progress.</p>
      </section>
    </div>
  );
}
