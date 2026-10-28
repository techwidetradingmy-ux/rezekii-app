"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock } from "@/components/ui";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { PREV_ORDERS, SHORT, VIDEOS, type VideoRow } from "@/lib/mock-creator2";

const COLORS = ["#00c073", "#2f80ed", "#f5a623", "#e8005a", "#8b7dff"];
import "@/app/creator2.css";

/** Performance by product: a donut of where her commission comes from, then what each product earned, its trend and best video. */
export function ProductList() {
  const total = ANALYTICS.commissionEst;
  const [video, setVideo] = useState<VideoRow | null>(null);
  const rows = [...ANALYTICS.byProduct].sort((a, b) => b.commission - a.commission);
  const top = rows[0];
  const topShare = Math.round((top.commission / total) * 100);
  const name = (id: string) => SHORT[id] ?? product(id).name;
  // Share of income as a donut (owner, 28 Oct 2026: a pie reads better than a sentence). "Other" is everything else she sold.
  const other = Math.max(0, total - rows.reduce((a, b) => a + b.commission, 0));
  const slices = [
    ...rows.map((b, i) => ({ id: b.productId, label: name(b.productId), value: b.commission, color: COLORS[i % COLORS.length] })),
    ...(other > 0 ? [{ id: "other", label: "Other", value: other, color: "#c9d3ce" }] : []),
  ];
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((a, x) => a + (x.value / total) * 100, 0));

  return (
    <div className="v2-stack" style={{ gap: 20 }}>

      <Lock what="where your commission comes from">
        <section className="v2-card pd-card" aria-label="Where your commission comes from">
          <div className="pd-ring" role="img" aria-label={slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
            <svg viewBox="0 0 42 42" aria-hidden="true">
              <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--line)" strokeWidth="6" />
              {slices.map((s, i) => {
                const pct = (s.value / total) * 100;
                return <circle key={s.id} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="6" strokeDasharray={`${Math.max(0, pct - 0.6)} ${100 - Math.max(0, pct - 0.6)}`} strokeDashoffset={25 - starts[i]} />;
              })}
            </svg>
            <span className="pd-mid"><b>{topShare}%</b><small>{name(top.productId)}</small></span>
          </div>
          <ul className="pd-legend">
            {slices.map((s) => {
              const row = <><i style={{ background: s.color }} /><span>{s.label}</span><b>{Math.round((s.value / total) * 100)}%</b></>;
              // Tap a product to jump to its card here (owner, 28 Oct 2026: see it on Rezekii, not TikTok).
              return <li key={s.id}>{s.id === "other" ? <span className="pd-row">{row}</span> : <a className="pd-row" href={`#pd-${s.id}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(`pd-${s.id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.remove("pd-flash"); void el?.offsetWidth; el?.classList.add("pd-flash"); }}>{row}<Icon name="arrow" size={14} /></a>}</li>;
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
              <article key={b.productId} id={`pd-${b.productId}`} className="v2-card" style={{ gap: 14 }}>
                <div className="cr2-vhead">
                  <span className="cr2-thumb sq">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <span className="cr2-tags">
                      {i === 0 && <span className="badge">Top earner</span>}
                      {dropping && <span className="badge badge-amber">Sales dropping · {change}% orders</span>}
                      {!dropping && change > 0 && <span className="badge badge-gray">Orders up {change}%</span>}
                      {lowRated && <span className="badge badge-red">Low rating</span>}
                      {highCancel && <span className="badge badge-red">High cancel rate</span>}
                    </span>
                  </span>
                  <span className="v2-num" style={{ fontWeight: 900, fontSize: 18 }}>{rm(b.commission)}</span>
                </div>

                <div className="cr2-mini">
                  <span><small>Orders</small><b>{b.orders}</b></span>
                  <span><small>Cancel rate</small><b className={highCancel ? "cr2-red" : undefined}>{b.cancel}%</b></span>
                  <span><small>Rating</small><b className={lowRated ? "cr2-red" : undefined}>{p.rating.toFixed(1)} / 5</b></span>
                </div>

                {/* Top video as a button (owner, 28 Oct 2026: less text); it opens here, on Rezekii. */}
                {vids[0] && <button type="button" className="pd-vid" onClick={() => setVideo(vids[0])}><Icon name="video" size={16} /> Top video</button>}
                {dropping && <p className="cr2-note"><Icon name="alert" size={15} /><span>Was {prev} orders, now {b.orders}. Try a fresh video.</span></p>}

              </article>
            );
          })}
        </div>
      </Lock>

      {video && <VideoSheet video={video} onClose={() => setVideo(null)} />}
    </div>
  );
}
