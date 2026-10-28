"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg, Tip } from "@/components/ui";
import { ProductSheet } from "@/components/creator2/view-sheets";
import { product, rm } from "@/lib/mock";
import { LIVES } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const SORTS = ["Orders", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];

/** Performance by LIVE (owner, 28 Oct 2026): what each LIVE sold, from her orders tagged LIVE, sorted like By video. */
export function LiveList() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("Orders");
  const key = (o: number, c: number, x: number) => (sort === "Orders" ? o : sort === "Commission" ? c : x);
  const rows = [...LIVES].sort((a, b) => key(b.orders, b.commission, b.cancel) - key(a.orders, a.commission, a.cancel));
  const top = rows[0]?.id;
  const total = rows.reduce((a, l) => a + l.commission, 0);
  return (
    <div className="v2-stack" style={{ gap: 14 }}>
      <p className="an-range">
        <b>{rows.length} LIVEs</b><span>{rm(total, 0)} commission</span>
        <Tip text="Found from your orders tagged LIVE. TikTok doesn't share viewers or watch time with creators." />
      </p>
      <div className="cr2-segfit"><span className="cr2-sortlbl">Sort by</span><Seg value={sort} options={SORTS} onChange={setSort} /></div>
      <Lock what="what each LIVE sold">
        <div className="cr2-list">
          {rows.map((l) => (
            <article key={l.id} className={`pl-row${openId === l.id ? " open" : ""}`}>
              <button type="button" className="pl-head" aria-expanded={openId === l.id} onClick={() => setOpenId(openId === l.id ? null : l.id)}>
                <span className="lv-mark" aria-hidden="true">LIVE</span>
                <span className="pl-main">
                  <strong>{l.date} · {l.time}</strong>
                  <span className="pl-tags">
                    <span className="lv-thumbs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.products.slice(0, 3).map(([id]) => <img key={id} src={product(id).img} alt="" />)}
                    </span>
                    {sort !== "Cancels" && l.id === top && <span className="badge">{sort === "Orders" ? "Most orders" : "Top earner"}</span>}
                    {l.cancel > 10 && <span className="badge badge-red">High cancels</span>}
                  </span>
                </span>
                <b className={`v2-num${sort === "Cancels" && l.cancel > 10 ? " cr2-red" : ""}`}>{sort === "Orders" ? `${l.orders} orders` : sort === "Commission" ? rm(l.commission, 0) : `${l.cancel}%`}</b>
                <Icon name="arrow" size={16} />
              </button>
              {openId === l.id && (
                <div className="pl-body">
                  <div className="cr2-mini">
                    <span><small>Orders</small><b>{l.orders}</b></span>
                    <span><small>Sales</small><b>{rm(l.gmv, 0)}</b></span>
                    <span><small>Cancel rate</small><b className={l.cancel > 10 ? "cr2-red" : undefined}>{l.cancel}%</b></span>
                  </div>
                  <div className="lv-prods">
                    {[...l.products].sort((a, b) => key(b[2], b[1], b[3]) - key(a[2], a[1], a[3])).map(([id, c, o, x]) => (
                      <button key={id} type="button" onClick={() => setPick(id)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product(id).img} alt="" />
                        <span>{product(id).name}</span>
                        <b className={sort === "Cancels" && x > 10 ? "cr2-red" : undefined}>{sort === "Orders" ? `${o} orders` : sort === "Commission" ? rm(c, 0) : `${x}%`}</b>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </Lock>
      {pick && <ProductSheet productId={pick} onClose={() => setPick(null)} />}
    </div>
  );
}
