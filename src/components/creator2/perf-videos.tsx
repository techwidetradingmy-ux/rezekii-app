"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { Lock } from "@/components/ui";
import { CancelRate, SortBar, cancelFlag, useSortPref } from "@/components/sort-bar";
import { product, rm, short } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { VIDEOS, type VideoRow } from "@/lib/mock-creator2";
import { perfProduct, useLivePerf } from "@/lib/live-perf";
import "@/app/creator2.css";

// Short sort names so the switch fits one row on a phone (owner, 28 Oct 2026); GMV first and by default (owner, 30 Oct 2026).
const SORTS = ["GMV", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];
const TOP: Record<Sort, string> = { GMV: "Top GMV", Commission: "Top Earner", Cancels: "Most Cancelled" };

const per1k = (v: VideoRow) => (v.views ? (v.commission / v.views) * 1000 : null);

/** Performance by video: what each one sold, earned and how many orders were cancelled. */
export function VideoList() {
  // Highest or lowest first, remembered (owner, 1 Nov 2026).
  const [sort, setSort, dir, flip] = useSortPref<Sort>("perf-videos", SORTS, "GMV");
  // Signed in (owner, 31 Oct 2026): her real videos from her orders in the days picked.
  const perf = useLivePerf(true);
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  const rows = useMemo(() => {
    const val = (v: VideoRow) => (sort === "GMV" ? v.gmv : sort === "Commission" ? v.commission : v.cancel);
    return [...(real ? real.videos : VIDEOS)].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));
  }, [sort, dir, real]);
  if (perf === "wait") return <p className="v2-muted"><span className="cr1-spin xs" aria-hidden="true" /> Loading your videos…</p>;
  if (perf === "error") return <p className="v2-muted">Couldn&apos;t load your videos. Please refresh.</p>;

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <SortBar value={sort} options={SORTS} onChange={setSort} dir={dir} onFlip={flip} />

      <Lock what="what each video earned">
        <div className="cr2-list">
          {rows.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>No sales from videos in these days.</p>}
          {rows.map((v, i) => {
            const p = real ? perfProduct(real, v.productId) : product(v.productId);
            const k = per1k(v);
            // Rezekii's standard (owner, 1 Nov 2026), from 5 items sold.
            const flag = cancelFlag(v.cancel, v.items);
            const high = flag === "high";
            return (
              <article key={v.id} className="v2-card" style={{ gap: 14 }}>
                <div className="cr2-vhead">
                  <span className="cr2-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <i><Icon name="video" size={14} /></i>
                  </span>
                  <span>
                    <strong>{v.title}</strong>
                    <small>Posted {v.date} · <Link href={productHref(p.id)} className="pv-open">{p.name}</Link></small>
                    <span className="cr2-tags">
                      {i === 0 && dir === "desc" && <span className="badge">{TOP[sort]}</span>}
                      {flag && <span className={`badge ${high ? "badge-red" : "badge-amber"}`}>{high ? "High Cancels" : "Watch Cancels"} · {v.cancel}%</span>}
                      {v.views === null && !real && <span className="badge badge-gray">Private Video</span>}
                    </span>
                  </span>
                  {high ? (
                    <Link href="/app/data/risk" className="btn-outline v2-btn-sm">See Risk Check</Link>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="cr2-mini six">
                  <span><small>Views</small><b>{v.views === null ? "—" : short(v.views)}</b></span>
                  <span><small>Orders</small><b>{v.orders}</b></span>
                  <span><small>GMV</small><b>{rm(v.gmv, 0)}</b></span>
                  <span><small>Commission</small><b className="cr2-green">{rm(v.commission)}</b></span>
                  <span><small>Cancel rate</small><CancelRate pct={v.cancel} items={v.items} bad={v.cancelItems} /></span>
                  <span><small>Per 1K views</small><b>{k === null ? "—" : rm(k)}</b></span>
                </div>
              </article>
            );
          })}
        </div>
      </Lock>

    </div>
  );
}
