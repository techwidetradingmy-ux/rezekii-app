"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Bars, Lock, Seg, Stat, Title } from "@/components/ui";
import { RatingScan } from "@/components/creator1/rating-scan";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { SHORT, VIDEOS, type VideoRow } from "@/lib/mock-creator2";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { productHref } from "@/lib/product-view";
import "@/app/creator2.css";

const cancelled = (orders: number, rate: number) => Math.round((orders * rate) / 100);
const tone = (rate: number) => (rate > 15 ? "red" : rate > 10 ? "amber" : undefined);

/**
 * Risk check (owner, 28 Oct 2026): the rating check and returns & risk in one place. Low-rated products in the showcase, then
 * cancellations and refunds: which videos and products they come from, and what to do next.
 */
export default function DataRisk() {
  const router = useRouter();
  const [by, setBy] = useState<"By video" | "By product">("By video");
  const [openVideo, setOpenVideo] = useState<VideoRow | null>(null);

  const vids = VIDEOS.map((v) => ({ ...v, cancelled: cancelled(v.orders, v.cancel) }));
  const prods = ANALYTICS.byProduct.map((b) => ({ ...b, cancelled: cancelled(b.orders, b.cancel) }));
  const totalCancelled = cancelled(ANALYTICS.orders, ANALYTICS.cancelRate);
  const refunds = vids.reduce((s, v) => s + v.refunds, 0);

  const worst = [...prods].sort((a, b) => b.cancelled - a.cancelled)[0];
  const worstP = product(worst.productId);
  const worstVid = [...vids].filter((v) => v.productId === worst.productId).sort((a, b) => b.cancelled - a.cancelled)[0];

  const highRisk = vids.filter((v) => v.cancel > 15).sort((a, b) => b.cancel - a.cancel);

  const ADVICE: Record<string, string[]> = {
    v4: ["Show each colour in daylight next time.", "Low rating (2.8★). Pick a 4★ product next."],
    v2: ["Show the result after a few days next time.", "Low rating (2.9★). Pick a 4★ product next."],
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Risk Check" sub="Ratings, cancels and returns · updated today 09:12" />
      <RatingScan />
      <h2 className="v2-h2" style={{ marginTop: 8 }}>Cancellations and Returns · Last 30 Days</h2>

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
          <h2 className="v2-h2">Most Cancellations</h2>
          <span className="badge badge-red">{worst.cancelled} cancelled</span>
        </div>
        <div className="cr2-spot">
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <img className="pv-open" src={worstP.img} alt="" onClick={() => router.push(productHref(worstP.id))} />
          <span>
            <strong><Link href={productHref(worstP.id)} className="pv-open">{worstP.name}</Link></strong>
            <small>
              {worst.cancelled} of {worst.orders} orders cancelled ({worst.cancel}%).{" "}
              {worstVid && <><b>{worstVid.cancelled}</b> from your {worstVid.date} video &ldquo;{worstVid.title}&rdquo;.</>}
            </small>
          </span>
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Cancel Rate</h2>
          <Seg value={by} options={["By video", "By product"] as const} onChange={setBy} />
        </div>
        <Lock what="cancel rates">
          {by === "By video" ? (
            <Bars key="v" rows={[...vids].sort((a, b) => b.cancel - a.cancel).map((v) => ({ label: v.title, value: v.cancel, display: `${v.cancel}%`, tone: tone(v.cancel), onPick: () => setOpenVideo(VIDEOS.find((x) => x.id === v.id) ?? null) }))} />
          ) : (
            <Bars key="p" rows={[...prods].sort((a, b) => b.cancel - a.cancel).map((b) => ({ label: SHORT[b.productId] ?? product(b.productId).name, value: b.cancel, display: `${b.cancel}%`, tone: tone(b.cancel), href: productHref(b.productId) }))} />
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
                      <td style={{ minWidth: 180 }}><Link href={productHref(b.productId)} className="pv-open">{product(b.productId).name}</Link></td>
                      <td className="v2-num">{b.orders}</td>
                      <td className="v2-num">{b.cancelled}</td>
                      <td className={b.cancel > 15 ? "cr2-red" : undefined} style={{ fontWeight: 800 }}>{b.cancel}%</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>


      {openVideo && <VideoSheet video={openVideo} onClose={() => setOpenVideo(null)} />}
    </div>
  );
}
