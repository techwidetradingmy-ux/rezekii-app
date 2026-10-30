"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg, Tip } from "@/components/ui";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/product-view";
import { product, rm } from "@/lib/mock";
import { LIVES } from "@/lib/mock-creator2";
import { perfProduct, useLivePerf } from "@/lib/live-perf";
import "@/app/creator2.css";

const SORTS = ["GMV", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];

/** Performance by LIVE (owner, 28 Oct 2026): what each LIVE sold, from her orders tagged LIVE, sorted like By video. */
export function LiveList() {
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("GMV");
  const key = (g: number, c: number, x: number) => (sort === "GMV" ? g : sort === "Commission" ? c : x);
  // Signed in (owner, 31 Oct 2026): her real LIVEs from her orders tagged LIVE in the last 30 days.
  const perf = useLivePerf();
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  const info = (id: string) => (real ? { ...perfProduct(real, id), price: 0 } : product(id));
  // A product's sales in the LIVE: what TikTok counted for real; in the sample, orders times price.
  const gmvOf = (t: readonly [string, number, number, number, number?]) => (real ? t[4] ?? 0 : t[2] * product(t[0]).price);
  const rows = [...(real ? real.lives : LIVES)].sort((a, b) => key(b.gmv, b.commission, b.cancel) - key(a.gmv, a.commission, a.cancel));
  const top = rows[0]?.id;
  const total = rows.reduce((a, l) => a + l.commission, 0);
  if (perf === "wait") return <p className="v2-muted">Loading your LIVEs…</p>;
  if (perf === "error") return <p className="v2-muted">Couldn&apos;t load your LIVEs. Please refresh.</p>;
  return (
    <div className="v2-stack" style={{ gap: 14 }}>
      <p className="an-range">
        <b>{rows.length} LIVEs</b><span>{rm(total, 0)} commission</span>
        <Tip text="Found from your orders tagged LIVE. TikTok doesn't share viewers or watch time with creators." />
      </p>
      <div className="cr2-segfit"><span className="cr2-sortlbl">Sort by</span><Seg value={sort} options={SORTS} onChange={setSort} /></div>
      <Lock what="what each LIVE sold">
        <div className="cr2-list">
          {rows.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>No sales from LIVEs in the last 30 days.</p>}
          {rows.map((l) => (
            <article key={l.id} className={`pl-row${openId === l.id ? " open" : ""}`}>
              <button type="button" className="pl-head" aria-expanded={openId === l.id} onClick={() => setOpenId(openId === l.id ? null : l.id)}>
                <span className="lv-mark" aria-hidden="true">LIVE</span>
                <span className="pl-main">
                  <strong>{l.date} · {l.time}</strong>
                  <span className="pl-tags">
                    <span className="lv-thumbs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.products.slice(0, 3).map(([id]) => <img key={id} src={info(id).img} alt="" />)}
                    </span>
                    {sort !== "Cancels" && l.id === top && <span className="badge">{sort === "GMV" ? "Top GMV" : "Top earner"}</span>}
                    {l.cancel > 10 && <span className="badge badge-red">High cancels</span>}
                  </span>
                </span>
                <b className={`v2-num${sort === "Cancels" && l.cancel > 10 ? " cr2-red" : ""}`}>{sort === "GMV" ? rm(l.gmv, 0) : sort === "Commission" ? rm(l.commission, 0) : `${l.cancel}%`}</b>
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
                    {/* A product's GMV in the LIVE is its orders times its price. */}
                    {[...l.products].sort((a, b) => key(gmvOf(b), b[1], b[3]) - key(gmvOf(a), a[1], a[3])).map((t) => { const [id, c, , x] = t; return (
                      <button key={id} type="button" onClick={() => router.push(productHref(id))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={info(id).img} alt="" />
                        <span>{info(id).name}</span>
                        <b className={sort === "Cancels" && x > 10 ? "cr2-red" : undefined}>{sort === "GMV" ? rm(gmvOf(t), 0) : sort === "Commission" ? rm(c, 0) : `${x}%`}</b>
                      </button>
                    ); })}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </Lock>
    </div>
  );
}
