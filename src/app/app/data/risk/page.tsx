"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Bars, Lock, Seg, Stat, Title } from "@/components/ui";
import { RatingScan } from "@/components/creator1/rating-scan";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { SHORT, VIDEOS } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const cancelled = (orders: number, rate: number) => Math.round((orders * rate) / 100);
const tone = (rate: number) => (rate > 15 ? "red" : rate > 10 ? "amber" : undefined);

/**
 * Risk check (owner, 28 Oct 2026): the rating check and returns & risk in one place. Low-rated products in the showcase, then
 * cancellations and refunds: which videos and products they come from, and what to do next.
 */
export default function DataRisk() {
  const [by, setBy] = useState<"By video" | "By product">("By video");

  const vids = VIDEOS.map((v) => ({ ...v, cancelled: cancelled(v.orders, v.cancel) }));
  const prods = ANALYTICS.byProduct.map((b) => ({ ...b, cancelled: cancelled(b.orders, b.cancel) }));
  const totalCancelled = cancelled(ANALYTICS.orders, ANALYTICS.cancelRate);
  const refunds = vids.reduce((s, v) => s + v.refunds, 0);

  const worst = [...prods].sort((a, b) => b.cancelled - a.cancelled)[0];
  const worstP = product(worst.productId);
  const worstVid = [...vids].filter((v) => v.productId === worst.productId).sort((a, b) => b.cancelled - a.cancelled)[0];

  const highRisk = vids.filter((v) => v.cancel > 15).sort((a, b) => b.cancel - a.cancel);

  const ADVICE: Record<string, string[]> = {
    v4: ["Next time, show each colour in daylight so it matches what arrives.", "Low-rated product (2.8★): pick a 4★ one for new videos."],
    v2: ["Next time, show the result after a few days, not just the first wipe.", "Low-rated product (2.9★): pick a 4★ one for new videos."],
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Risk check" sub="Low ratings, cancellations and returns that could hurt your account · updated today 09:12" />
      <RatingScan />
      <h2 className="v2-h2" style={{ marginTop: 8 }}>Cancellations and returns · last 30 days</h2>

      <Lock what="your cancellations and refunds">
        <div className="cr2-stats">
          <Stat label="Cancelled orders" value={<span className="v2-num">{totalCancelled}</span>} note={`of ${ANALYTICS.orders} orders`} />
          <Stat label="Refunds and returns" value={<span className="v2-num">{refunds}</span>} note="After delivery" />
          <Stat label="Cancel rate" value={`${ANALYTICS.cancelRate}%`} note="Under 10% is healthy" tone="up" />
          <Stat label="Commission clawed back" value={rm(51.5)} note="After cancels and returns" tone="down" />
        </div>
      </Lock>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Most cancellations</h2>
          <span className="badge badge-red">{worst.cancelled} cancelled</span>
        </div>
        <div className="cr2-spot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={worstP.img} alt="" />
          <span>
            <strong>{worstP.name}</strong>
            <small>
              {worst.cancelled} of its {worst.orders} orders were cancelled ({worst.cancel}%).{" "}
              {worstVid && <><b>{worstVid.cancelled}</b> of them came from your {worstVid.date} video &ldquo;{worstVid.title}&rdquo;.</>}
            </small>
          </span>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>So the problem is mostly that one video, not every video of this product.</p>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Cancel rate</h2>
          <Seg value={by} options={["By video", "By product"] as const} onChange={setBy} />
        </div>
        <Lock what="cancel rates">
          {by === "By video" ? (
            <Bars key="v" rows={[...vids].sort((a, b) => b.cancel - a.cancel).map((v) => ({ label: v.title, value: v.cancel, display: `${v.cancel}%`, tone: tone(v.cancel) }))} />
          ) : (
            <Bars key="p" rows={[...prods].sort((a, b) => b.cancel - a.cancel).map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: b.cancel, display: `${b.cancel}%`, tone: tone(b.cancel) }))} />
          )}
        </Lock>
        <div className="v2-tablewrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>{by === "By video" ? "Video" : "Product"}</th>
                <th>Orders</th>
                <th>Cancelled</th>
                {by === "By video" && <th>Refunds</th>}
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {by === "By video"
                ? vids.map((v) => (
                    <tr key={v.id}>
                      <td style={{ minWidth: 180 }}>{v.title}<br /><span className="v2-small">{v.date}</span></td>
                      <td className="v2-num">{v.orders}</td>
                      <td className="v2-num">{v.cancelled}</td>
                      <td className="v2-num">{v.refunds}</td>
                      <td className={v.cancel > 15 ? "cr2-red" : undefined} style={{ fontWeight: 800 }}>{v.cancel}%</td>
                    </tr>
                  ))
                : prods.map((b) => (
                    <tr key={b.productId}>
                      <td style={{ minWidth: 180 }}>{product(b.productId).name}</td>
                      <td className="v2-num">{b.orders}</td>
                      <td className="v2-num">{b.cancelled}</td>
                      <td className={b.cancel > 15 ? "cr2-red" : undefined} style={{ fontWeight: 800 }}>{b.cancel}%</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>

        <section className="v2-card cr2-attn">
          <h2 className="v2-h2"><Icon name="video" size={20} /> High-risk videos</h2>
          <p className="v2-small" style={{ margin: 0 }}>Over 15% of orders cancelled. Your average is {ANALYTICS.cancelRate}%.</p>
          {highRisk.map((v) => (
            <div key={v.id} className="v2-stack" style={{ gap: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <div className="v2-row" style={{ justifyContent: "space-between" }}>
                <strong style={{ minWidth: 0 }}>{v.title}</strong>
                <span className="badge badge-red">{v.cancel}%</span>
              </div>
              <span className="v2-small">{v.date} · {v.cancelled} cancelled, {v.refunds} refunded</span>
              <ul className="cr2-do">{(ADVICE[v.id] ?? []).map((a) => <li key={a}>{a}</li>)}</ul>
              <Link href="/app/data/performance" className="btn-outline v2-btn-sm" style={{ alignSelf: "flex-start" }}>See video</Link>
            </div>
          ))}
        </section>

    </div>
  );
}
