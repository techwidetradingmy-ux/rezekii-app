"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg } from "@/components/ui";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { LIVES, PREV_ORDERS, SHORT, VIDEOS, channelSplit, type VideoRow } from "@/lib/mock-creator2";

const COLORS = ["#00c073", "#2f80ed", "#f5a623", "#e8005a", "#8b7dff"];
import "@/app/creator2.css";

type Source = "All" | "Video" | "LIVE";

/**
 * Performance by product: a donut of where her commission comes from, then what each product earned, its trend and best video.
 * The All / Video / LIVE switch (owner, 28 Oct 2026) shows what sells in videos and what sells on LIVE: some products only do well
 * in one of them.
 */
export function ProductList() {
  const [source, setSource] = useState<Source>("All");
  const videoTotal = Math.round(ANALYTICS.commissionEst * (ANALYTICS.byChannel.find((c) => c.label === "Videos")?.share ?? 0)) / 100;
  const liveTotal = LIVES.reduce((a, l) => a + l.commission, 0);
  const total = source === "All" ? ANALYTICS.commissionEst : source === "Video" ? videoTotal : liveTotal;
  const valueOf = (b: { productId: string; commission: number }) => {
    if (source === "All") return b.commission;
    const s = channelSplit(b.productId, b.commission);
    return source === "Video" ? s.video : s.live;
  };
  const [video, setVideo] = useState<VideoRow | null>(null);
  // A compact list (owner, 28 Oct 2026: long lists were hard to scroll): one row per product, tap to open its details.
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = ANALYTICS.byProduct.map((b) => ({ ...b, value: valueOf(b) })).filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
  const top = rows[0];
  const topShare = Math.round((top.value / total) * 100);
  const name = (id: string) => SHORT[id] ?? product(id).name;
  // Share of income as a donut (owner, 28 Oct 2026: a pie reads better than a sentence). "Other" is everything else she sold.
  const other = Math.max(0, total - rows.reduce((a, b) => a + b.value, 0));
  const slices = [
    ...rows.map((b, i) => ({ id: b.productId, label: name(b.productId), value: b.value, color: COLORS[i % COLORS.length] })),
    ...(other > 0 ? [{ id: "other", label: "Other", value: other, color: "#c9d3ce" }] : []),
  ];
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((a, x) => a + (x.value / total) * 100, 0));
  // The slice shown in the middle: the top earner until she taps another.
  const [sel, setSel] = useState<string | null>(null);
  const shown = slices.find((s) => s.id === sel) ?? slices[0];

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <div className="pl-source"><Seg value={source} options={["All", "Video", "LIVE"] as const} onChange={(s) => { setSource(s); setOpenId(null); setSel(null); }} /></div>

      <Lock what="where your commission comes from">
        <section className="v2-card pd-card" aria-label="Where your commission comes from">
          <div className="pd-ring" role="group" aria-label="Share of commission by product">
            <svg viewBox="0 0 42 42">
              {slices.map((s, i) => {
                const pct = (s.value / total) * 100;
                const len = Math.max(0.4, pct - 2.2);
                return (
                  <circle key={s.id} className={`pd-slice${shown.id === s.id ? " on" : ""}`} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="6"
                    strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - starts[i] - 1.1} pointerEvents="stroke"
                    role="button" tabIndex={0} aria-label={`${s.label} ${Math.round(pct)}%`} aria-pressed={shown.id === s.id}
                    onClick={() => setSel(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(s.id); } }} />
                );
              })}
            </svg>
            <span className="pd-mid" aria-live="polite"><b>{Math.round((shown.value / total) * 100)}%</b><small>{shown.label}</small><em>{rm(shown.value, 0)}</em></span>
          </div>
          <ul className="pd-legend">
            {slices.map((s) => {
              const row = <><i style={{ background: s.color }} /><span className={shown.id === s.id ? "pd-on" : undefined}>{s.label}</span><b>{Math.round((s.value / total) * 100)}%</b></>;
              // Tap a product to jump to its card here (owner, 28 Oct 2026: see it on Rezekii, not TikTok).
              return <li key={s.id}>{s.id === "other" ? <span className="pd-row">{row}</span> : <a className="pd-row" href={`#pd-${s.id}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(`pd-${s.id}`); setOpenId(s.id); setSel(s.id); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.remove("pd-flash"); void el?.offsetWidth; el?.classList.add("pd-flash"); }}>{row}<Icon name="arrow" size={14} /></a>}</li>;
            })}
          </ul>
          {topShare >= 35 && <Link href="/app/data/ai-picks" className="pd-tip">Too much from one product? See AI Picks <Icon name="arrow" size={14} /></Link>}
        </section>
      </Lock>

      <Lock what="what each product earned">
        <div className="cr2-list">
          {rows.map((b, i) => {
            const p = product(b.productId);
            const prev = PREV_ORDERS[b.productId] ?? b.orders;
            const change = Math.round(((b.orders - prev) / prev) * 100);
            const dropping = change <= -20;
            const lowRated = p.rating < 3;
            const highCancel = b.cancel > 15;
            const vids = VIDEOS.filter((v) => v.productId === b.productId).sort((x, y) => y.orders - x.orders);
            return (
              <article key={b.productId} id={`pd-${b.productId}`} className={`pl-row${openId === b.productId ? " open" : ""}`}>
                <button type="button" className="pl-head" aria-expanded={openId === b.productId} onClick={() => setOpenId(openId === b.productId ? null : b.productId)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <span className="pl-main">
                    <strong>{p.name}</strong>
                    <span className="pl-tags">
                      {i === 0 && <span className="badge">Top earner</span>}
                      {dropping && <span className="badge badge-amber">Dropping {change}%</span>}
                      {!dropping && change > 0 && <span className="badge badge-gray">Up {change}%</span>}
                      {(lowRated || highCancel) && <span className="badge badge-red">{lowRated ? "Low rating" : "High cancels"}</span>}
                    </span>
                  </span>
                  <b className="v2-num">{rm(b.value, 0)}</b>
                  <Icon name="arrow" size={16} />
                </button>
                {openId === b.productId && <div className="pl-body">
                <Split productId={b.productId} commission={b.commission} />
                <div className="cr2-mini">
                  <span><small>Orders</small><b>{b.orders}</b></span>
                  <span><small>Cancel rate</small><b className={highCancel ? "cr2-red" : undefined}>{b.cancel}%</b></span>
                  <span><small>Rating</small><b className={lowRated ? "cr2-red" : undefined}>{p.rating.toFixed(1)} / 5</b></span>
                </div>

                {/* Top video as a button (owner, 28 Oct 2026: less text); it opens here, on Rezekii. */}
                {vids[0] && <button type="button" className="pd-vid" onClick={() => setVideo(vids[0])}><Icon name="video" size={16} /> Top video</button>}
                {dropping && <p className="cr2-note"><Icon name="alert" size={15} /><span>Was {prev} orders, now {b.orders}. Try a fresh video.</span></p>}
                </div>}
              </article>
            );
          })}
        </div>
      </Lock>

      {video && <VideoSheet video={video} onClose={() => setVideo(null)} />}
    </div>
  );
}

/** One product's commission split into video, LIVE and the rest, as a thin bar. */
function Split({ productId, commission }: { productId: string; commission: number }) {
  const s = channelSplit(productId, commission);
  const parts = [["Video", s.video, "v"], ["LIVE", s.live, "l"], ["Other", s.other, "o"]] as const;
  const pct = (v: number) => Math.round((v / commission) * 100);
  return (
    <div className="pl-split" role="img" aria-label={parts.map(([l, v]) => `${l} ${pct(v)}%`).join(", ")}>
      <span className="pl-bar">{parts.map(([l, v, c]) => v > 0 && <i key={l} className={c} style={{ width: `${pct(v)}%` }} />)}</span>
      <span className="pl-keys">{parts.map(([l, v, c]) => <span key={l}><i className={c} />{l} <b>{pct(v)}%</b></span>)}</span>
    </div>
  );
}
