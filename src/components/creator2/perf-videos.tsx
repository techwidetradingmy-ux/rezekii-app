"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg } from "@/components/ui";
import { product, rm, short } from "@/lib/mock";
import { VIDEOS, type VideoRow } from "@/lib/mock-creator2";
import "@/app/creator2.css";

// Short sort names so the switch fits one row on a phone (owner, 28 Oct 2026).
const SORTS = ["Orders", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];
const TOP: Record<Sort, string> = { Orders: "Most orders", Commission: "Top earner", Cancels: "Most cancelled" };

const per1k = (v: VideoRow) => (v.views ? (v.commission / v.views) * 1000 : null);

/** Performance by video: what each one sold, earned and how many orders were cancelled. */
export function VideoList() {
  const [sort, setSort] = useState<Sort>("Orders");
  const rows = useMemo(() => {
    const list = [...VIDEOS];
    if (sort === "Orders") list.sort((a, b) => b.orders - a.orders);
    if (sort === "Commission") list.sort((a, b) => b.commission - a.commission);
    if (sort === "Cancels") list.sort((a, b) => b.cancel - a.cancel);
    return list;
  }, [sort]);

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <div className="cr2-segfit"><span className="cr2-sortlbl">Sort by</span><Seg value={sort} options={SORTS} onChange={setSort} /></div>

      <Lock what="what each video earned">
        <div className="cr2-list">
          {rows.map((v, i) => {
            const p = product(v.productId);
            const k = per1k(v);
            const high = v.cancel > 15;
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
                    <small>Posted {v.date} · {p.name}</small>
                    <span className="cr2-tags">
                      {i === 0 && <span className="badge">{TOP[sort]}</span>}
                      {high && <span className="badge badge-red">High risk · {v.cancel}% cancelled</span>}
                      {v.views === null && <span className="badge badge-gray">Private video</span>}
                    </span>
                  </span>
                  {high ? (
                    <Link href="/app/data/risk" className="btn-outline v2-btn-sm">See risk check</Link>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="cr2-mini six">
                  <span><small>Views</small><b>{v.views === null ? "—" : short(v.views)}</b></span>
                  <span><small>Orders</small><b>{v.orders}</b></span>
                  <span><small>GMV</small><b>{rm(v.gmv, 0)}</b></span>
                  <span><small>Commission</small><b className="cr2-green">{rm(v.commission)}</b></span>
                  <span><small>Cancel rate</small><b className={high ? "cr2-red" : undefined}>{v.cancel}%</b></span>
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
