"use client";

import Link from "next/link";
import { Updated } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Bars, Lock, Seg, Stat, Title } from "@/components/ui";
import { RatingScan } from "@/components/creator1/rating-scan";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { SHORT, VIDEOS, type VideoRow } from "@/lib/mock-creator2";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { productHref } from "@/lib/product-view";
import { perfProduct, useLivePerf, shortName } from "@/lib/live-perf";
import { useDemo } from "@/components/demo";
import { SortHead, cancelFlag, useSortPref } from "@/components/sort-bar";
import { CANCEL_TIP } from "@/lib/cancel";
import "@/app/creator2.css";

const cancelled = (orders: number, rate: number) => Math.round((orders * rate) / 100);
/** Rezekii's standard (owner, 1 Nov 2026): red from 20%, orange from 10%, judged from 5 items sold. */
const tone = (rate: number, items?: number) => { const f = cancelFlag(rate, items); return f === "high" ? "red" : f === "watch" ? "amber" : undefined; };
const COLS = ["Items", "Cancelled", "Rate"] as const;
type Col = (typeof COLS)[number];

/**
 * Risk check (owner, 28 Oct 2026): the rating check and returns & risk in one place. Low-rated products in the showcase, then
 * cancellations and refunds: which videos and products they come from, and what to do next.
 */
export default function DataRisk() {
  const router = useRouter();
  const [by, setBy] = useState<"By video" | "By product">("By video");
  const [openVideo, setOpenVideo] = useState<VideoRow | null>(null);

  // Signed in (owner, 31 Oct 2026): her real cancellations and returns from the last 30 days of orders.
  const { live } = useDemo();
  const perf = useLivePerf();
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  const info = (id: string) => (real ? perfProduct(real, id) : product(id));
  const nameOf = (id: string) => (real ? shortName(info(id).name) : SHORT[id] ?? product(id).name);
  // Counted by items (owner, 1 Nov 2026): items sold and items cancelled or returned.
  const vids = (real ? real.videos : VIDEOS).map((v) => ({ ...v, items: real ? v.items ?? v.orders : v.orders, cancelled: real ? v.cancelItems ?? 0 : cancelled(v.orders, v.cancel) }));
  type PRow = { productId: string; orders: number; cancel: number; items: number; cancelled: number };
  const prods: PRow[] = real
    ? real.products.map((x) => ({ productId: x.productId, orders: x.orders, cancel: x.cancel, items: x.items ?? x.orders, cancelled: x.cancelItems ?? 0 }))
    : ANALYTICS.byProduct.map((x) => ({ productId: x.productId, orders: x.orders, cancel: x.cancel, items: x.orders, cancelled: cancelled(x.orders, x.cancel) }));
  const items = real ? real.totals.items ?? real.totals.orders : ANALYTICS.orders;
  const rate = real ? real.totals.cancelRate : ANALYTICS.cancelRate;
  const totalCancelled = real ? real.totals.cancelItems ?? real.totals.cancelled : cancelled(ANALYTICS.orders, ANALYTICS.cancelRate);
  // The table sorts by any column, highest or lowest first, remembered (owner, 1 Nov 2026).
  const [col, , dir, , setSort] = useSortPref<Col>("risk-table", COLS, "Cancelled");
  const colVal = (r: { items: number; cancelled: number; cancel: number }) => (col === "Items" ? r.items : col === "Cancelled" ? r.cancelled : r.cancel);
  const sorted = <T extends { items: number; cancelled: number; cancel: number }>(rows: T[]) => [...rows].sort((a, b) => (dir === "desc" ? colVal(b) - colVal(a) : colVal(a) - colVal(b)));
  const refunds = real ? real.totals.returns : vids.reduce((s, v) => s + v.refunds, 0);
  const clawback = real ? real.totals.clawback : 51.5;

  const worst = [...prods].sort((a, b) => b.cancelled - a.cancelled)[0];
  const worstP = worst ? info(worst.productId) : null;
  const worstVid = worst ? [...vids].filter((v) => v.productId === worst.productId).sort((a, b) => b.cancelled - a.cancelled)[0] : undefined;
  const allVideos = real ? real.videos : VIDEOS;


  const ADVICE: Record<string, string[]> = {
    v4: ["Show each colour in daylight next time.", "Low rating (2.8★). Pick a 4★ product next."],
    v2: ["Show the result after a few days next time.", "Low rating (2.9★). Pick a 4★ product next."],
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Risk Check" sub={live ? "Ratings, cancels and returns" : "Ratings, cancels and returns · updated today 09:12"} />
      {live && <Updated at={perf && typeof perf === "object" ? perf.updated : null} />}
      <RatingScan />
      <h2 className="v2-h2" style={{ marginTop: 8 }}>Cancellations and Returns · Last 30 Days</h2>

      <Lock what="your cancellations and refunds">
        <div className="cr2-stats">
          <Stat label="Cancelled items" value={<span className="v2-num">{totalCancelled}</span>} note={`of ${items} items sold`} />
          <Stat label="Refunds and returns" value={<span className="v2-num">{refunds}</span>} note="After delivery" />
          <Stat label="Cancel rate" value={`${rate}%`} note={items < 5 ? "Too few items to judge" : rate < 10 ? "Normal · under 10%" : rate < 20 ? "Watch · 10–20%" : "High · 20% and over"} tone={items < 5 ? undefined : rate < 10 ? "up" : "down"} />
          <Stat label="Commission clawed back" value={rm(clawback)} note="After cancels and returns" tone="down" />
        </div>
      </Lock>

      {worst && worstP && worst.cancelled > 0 && (
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
              {worst.cancelled} of {worst.items} items cancelled ({worst.cancel}%).{" "}
              {worstVid && worstVid.cancelled > 0 && <><b>{worstVid.cancelled}</b> from your {worstVid.date} video{real ? "" : <> &ldquo;{worstVid.title}&rdquo;</>}.</>}
            </small>
          </span>
        </div>
      </section>
      )}

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Cancel Rate <span title={CANCEL_TIP} className="v2-small">ⓘ</span></h2>
          <Seg value={by} options={["By video", "By product"] as const} onChange={setBy} />
        </div>
        <Lock what="cancel rates">
          {by === "By video" ? (
            <Bars key="v" rows={[...vids].sort((a, b) => (real ? b.cancelled - a.cancelled : 0) || b.cancel - a.cancel).slice(0, 12).map((v) => ({ label: real ? `${v.date} · ${nameOf(v.productId)}` : v.title, value: v.cancel, display: `${v.cancel}%`, tone: tone(v.cancel, v.items), onPick: () => setOpenVideo(allVideos.find((x) => x.id === v.id) ?? null) }))} />
          ) : (
            <Bars key="p" rows={[...prods].sort((a, b) => (real ? b.cancelled - a.cancelled : 0) || b.cancel - a.cancel).slice(0, 12).map((b) => ({ label: nameOf(b.productId), value: b.cancel, display: `${b.cancel}%`, tone: tone(b.cancel, b.items), href: productHref(b.productId) }))} />
          )}
        </Lock>
        <div className="v2-tablewrap">
          <table className="v2-table">
            <thead>
              <tr>
                <th>{by === "By video" ? "Video" : "Product"}</th>
                {COLS.map((c) => <th key={c}><SortHead label={c} k={c} value={col} dir={dir} onSort={setSort} /></th>)}
              </tr>
            </thead>
            <tbody>
              {by === "By video"
                ? sorted(vids).map((v) => (
                    <tr key={v.id}>
                      {/* Tap a video to watch it here (owner, 30 Oct 2026). */}
                      <td style={{ minWidth: 180 }}><button type="button" className="rk-vopen" onClick={() => setOpenVideo(allVideos.find((x) => x.id === v.id) ?? null)}><Icon name="video" size={15} width={2.4} />{real ? nameOf(v.productId) : v.title}</button><br /><span className="v2-small">{v.date}</span></td>
                      <td className="v2-num">{v.items}</td>
                      <td className="v2-num">{v.cancelled}</td>
                      <td className={tone(v.cancel, v.items) === "red" ? "cr2-red" : tone(v.cancel, v.items) === "amber" ? "cr2-orange-v" : undefined} style={{ fontWeight: 800 }}>{v.cancel}%</td>
                    </tr>
                  ))
                : sorted(prods).map((b) => (
                    <tr key={b.productId}>
                      <td style={{ minWidth: 180 }}><Link href={productHref(b.productId)} className="pv-open">{info(b.productId).name}</Link></td>
                      <td className="v2-num">{b.items}</td>
                      <td className="v2-num">{b.cancelled}</td>
                      <td className={tone(b.cancel, b.items) === "red" ? "cr2-red" : tone(b.cancel, b.items) === "amber" ? "cr2-orange-v" : undefined} style={{ fontWeight: 800 }}>{b.cancel}%</td>
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
