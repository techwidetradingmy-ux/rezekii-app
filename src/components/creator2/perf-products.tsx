"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg } from "@/components/ui";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { productHref } from "@/lib/product-view";
import { ANALYTICS, product, rm } from "@/lib/mock";
import { LIVES, PREV_ORDERS, SHORT, VIDEOS, channelSplit, type VideoRow } from "@/lib/mock-creator2";
import { perfProduct, shortName, useLivePerf } from "@/lib/live-perf";
import { CancelRate, SortBar, cancelFlag, useSortPref } from "@/components/sort-bar";

const SORTS = ["Commission", "Orders", "Cancels"] as const;
type Sort = (typeof SORTS)[number];

const COLORS = ["#00c073", "#2f80ed", "#f5a623", "#e8005a", "#8b7dff"];
import "@/app/creator2.css";

type Source = "All" | "Video" | "LIVE";

/**
 * Performance by product: a donut of where her commission comes from, then what each product earned, its trend and best video.
 * The All / Video / LIVE switch (owner, 28 Oct 2026) shows what sells in videos and what sells on LIVE: some products only do well
 * in one of them.
 */
export function ProductList() {
  const router = useRouter();
  const [source, setSource] = useState<Source>("All");
  // Signed in (owner, 31 Oct 2026): what each of her products earned in the days picked, and from videos or LIVE.
  const perf = useLivePerf(true);
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  // The list sorts highest or lowest first, remembered (owner, 1 Nov 2026); the donut always shows the top earners.
  const [sort, setSort, dir, flip] = useSortPref<Sort>("perf-products", SORTS, "Commission");
  type Row = { productId: string; commission: number; orders: number; cancel: number; items?: number; cancelItems?: number; prevOrders?: number; split?: { video: number; live: number; other: number } };
  const base: Row[] = real ? real.products : ANALYTICS.byProduct;
  const splitOf = (b: Row) => b.split ?? channelSplit(b.productId, b.commission);
  const videoTotal = real ? base.reduce((a, b) => a + splitOf(b).video, 0) : Math.round(ANALYTICS.commissionEst * (ANALYTICS.byChannel.find((c) => c.label === "Videos")?.share ?? 0)) / 100;
  const liveTotal = real ? base.reduce((a, b) => a + splitOf(b).live, 0) : LIVES.reduce((a, l) => a + l.commission, 0);
  const total = source === "All" ? (real ? base.reduce((a, b) => a + b.commission, 0) : ANALYTICS.commissionEst) : source === "Video" ? videoTotal : liveTotal;
  const valueOf = (b: Row) => {
    if (source === "All") return b.commission;
    const s = splitOf(b);
    return source === "Video" ? s.video : s.live;
  };
  const info = (id: string) => (real ? { ...perfProduct(real, id), rating: 0 } : product(id));
  const [video, setVideo] = useState<VideoRow | null>(null);
  // A compact list (owner, 28 Oct 2026: long lists were hard to scroll): one row per product, tap to open its details.
  const [openId, setOpenId] = useState<string | null>(null);
  const ranked = base.map((b) => ({ ...b, value: valueOf(b) })).filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
  const rows = ranked.slice(0, real ? 20 : undefined);
  const sortVal = (b: (typeof ranked)[number]) => (sort === "Commission" ? b.value : sort === "Orders" ? b.orders : b.cancel);
  const list = [...ranked].sort((a, b) => (dir === "desc" ? sortVal(b) - sortVal(a) : sortVal(a) - sortVal(b))).slice(0, real ? 20 : undefined);
  const top = rows[0];
  const topShare = top && total ? Math.round((top.value / total) * 100) : 0;
  // Real listing titles are long: drop "[10.10 BUY 1 FREE 1 …]" style tags and keep the first words.
  const name = (id: string) => (real ? shortName(info(id).name) : SHORT[id] ?? product(id).name);
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
  if (perf === "wait") return <p className="v2-muted"><span className="cr1-spin xs" aria-hidden="true" /> Loading your products…</p>;
  if (perf === "error") return <p className="v2-muted">Couldn&apos;t load your products. Please refresh.</p>;
  if (!top || !total) {
    return (
      <div className="v2-stack" style={{ gap: 20 }}>
        <div className="pl-source"><Seg value={source} options={["All", "Video", "LIVE"] as const} onChange={(s) => { setSource(s); setOpenId(null); setSel(null); }} /></div>
        <p className="v2-muted" style={{ margin: 0 }}>No sales {source === "All" ? "" : `from ${source === "Video" ? "videos" : "LIVEs"} `}in these days.</p>
      </div>
    );
  }

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

      <SortBar value={sort} options={SORTS} onChange={setSort} dir={dir} onFlip={flip} />
      <Lock what="what each product earned">
        <div className="cr2-list">
          {list.map((b) => {
            const p = info(b.productId);
            const prev = real ? b.prevOrders ?? 0 : PREV_ORDERS[b.productId] ?? b.orders;
            const change = prev ? Math.round(((b.orders - prev) / prev) * 100) : 0;
            const dropping = change <= -20;
            const lowRated = !real && p.rating < 3;
            // Rezekii's standard (owner, 1 Nov 2026), from 5 items sold.
            const cflag = cancelFlag(b.cancel, b.items);
            const highCancel = cflag === "high";
            const vids = (real ? real.videos : VIDEOS).filter((v) => v.productId === b.productId).sort((x, y) => y.orders - x.orders);
            return (
              <article key={b.productId} id={`pd-${b.productId}`} className={`pl-row${openId === b.productId ? " open" : ""}`}>
                {/* The photo and name open the product; the rest of the row shows its details here. */}
                <div className="pl-head">
                  <button type="button" className="pv-hit" aria-expanded={openId === b.productId} aria-label={`${p.name} details`} onClick={() => setOpenId(openId === b.productId ? null : b.productId)} />
                  {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                  <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
                  <span className="pl-main">
                    <strong><Link href={productHref(p.id)} className="pv-open">{p.name}</Link></strong>
                    <span className="pl-tags">
                      {b.productId === top.productId && <span className="badge">Top Earner</span>}
                      {dropping && <span className="badge badge-amber">Dropping {change}%</span>}
                      {!dropping && change > 0 && <span className="badge badge-gray">Up {change}%</span>}
                      {lowRated ? <span className="badge badge-red">Low Rating</span> : cflag && <span className={`badge ${highCancel ? "badge-red" : "badge-amber"}`}>{highCancel ? "High Cancels" : "Watch Cancels"}</span>}
                    </span>
                  </span>
                  <b className="v2-num">{sort === "Orders" ? `${b.orders} orders` : sort === "Cancels" ? `${b.cancel}%` : rm(b.value, 0)}</b>
                  <Icon name="arrow" size={16} />
                </div>
                {openId === b.productId && <div className="pl-body">
                <Split commission={b.commission} split={splitOf(b)} />
                <div className="cr2-mini">
                  <span><small>Orders</small><b>{b.orders}</b></span>
                  <span><small>Cancel rate</small><CancelRate pct={b.cancel} items={b.items} bad={b.cancelItems} /></span>
                  {!real && <span><small>Rating</small><b className={lowRated ? "cr2-red" : undefined}>{p.rating.toFixed(1)} / 5</b></span>}
                </div>

                {/* Top video as a button (owner, 28 Oct 2026: less text); it opens here, on Rezekii. */}
                {vids[0] && <button type="button" className="pd-vid" onClick={() => setVideo(vids[0])}><Icon name="video" size={16} /> Top Video</button>}
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
function Split({ commission, split: s }: { commission: number; split: { video: number; live: number; other: number } }) {
  const parts = [["Video", s.video, "v"], ["LIVE", s.live, "l"], ["Other", s.other, "o"]] as const;
  const pct = (v: number) => Math.round((v / commission) * 100);
  return (
    <div className="pl-split" role="img" aria-label={parts.map(([l, v]) => `${l} ${pct(v)}%`).join(", ")}>
      <span className="pl-bar">{parts.map(([l, v, c]) => v > 0 && <i key={l} className={c} style={{ width: `${pct(v)}%` }} />)}</span>
      <span className="pl-keys">{parts.map(([l, v, c]) => <span key={l}><i className={c} />{l} <b>{pct(v)}%</b></span>)}</span>
    </div>
  );
}
