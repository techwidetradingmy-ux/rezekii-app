"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Tip } from "@/components/ui";
import { useRouter } from "next/navigation";
import { productHref } from "@/lib/product-view";
import { product, rm } from "@/lib/mock";
import { LIVES } from "@/lib/mock-creator2";
import { perfProduct, useLivePerf } from "@/lib/live-perf";
import { CancelChip, CancelRate, SortBar, cancelFlag, useSortPref } from "@/components/sort-bar";
import "@/app/creator2.css";

/** How long a LIVE ran, in seconds, once TikTok has sent its times (owner, 3 Nov 2026). */
const span = (l: object) => { const { start, end } = l as { start?: number; end?: number }; return start && end && end > start ? end - start : null; };
const hm = (s: number) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };

const SORTS = ["GMV", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];
type Item = readonly [string, number, number, number, number?, number?, number?];

/** Performance by LIVE (owner, 28 Oct 2026): what each LIVE sold, from her orders tagged LIVE, sorted like By video. */
export function LiveList() {
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  // Highest or lowest first, remembered (owner, 1 Nov 2026).
  const [sort, setSort, dir, flip] = useSortPref<Sort>("perf-lives", SORTS, "GMV");
  const key = (g: number, c: number, x: number) => (sort === "GMV" ? g : sort === "Commission" ? c : x);
  const order = (a: number, b: number) => (dir === "desc" ? b - a : a - b);
  // Signed in (owner, 31 Oct 2026): her real LIVEs from her orders tagged LIVE in the days picked.
  const perf = useLivePerf(true);
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  const info = (id: string) => (real ? { ...perfProduct(real, id), price: 0 } : product(id));
  // A product's sales in the LIVE: what TikTok counted for real; in the sample, orders times price.
  const gmvOf = (t: Item) => (real ? t[4] ?? 0 : t[2] * product(t[0]).price);
  const rows = [...(real ? real.lives : LIVES)].sort((a, b) => order(key(a.gmv, a.commission, a.cancel), key(b.gmv, b.commission, b.cancel)));
  const top = rows[0]?.id;
  const total = rows.reduce((a, l) => a + l.commission, 0);
  if (perf === "wait") return <p className="v2-muted"><span className="cr1-spin xs" aria-hidden="true" /> Loading your LIVEs…</p>;
  if (perf === "error") return <p className="v2-muted">Couldn&apos;t load your LIVEs. Please refresh.</p>;
  return (
    <div className="v2-stack" style={{ gap: 14 }}>
      <p className="an-range">
        <b>{rows.length} LIVEs</b><span>{rm(total, 0)} commission</span>
        <Tip text="Found from your orders tagged LIVE. LIVE length and sales per hour show once TikTok sends the LIVE's times (it can take a day)." />
      </p>
      <SortBar value={sort} options={SORTS} onChange={setSort} dir={dir} onFlip={flip} />
      <Lock what="what each LIVE sold">
        <div className="cr2-list">
          {rows.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>No sales from LIVEs in these days.</p>}
          {rows.map((l) => {
            const items = "items" in l ? l.items : undefined;
            const flag = cancelFlag(l.cancel, items);
            return (
            <article key={l.id} className={`pl-row${openId === l.id ? " open" : ""}`}>
              {/* The row opens its details; the Cancels ⓘ sits above it (owner, 3 Nov 2026). */}
              <div className="pl-head pl-live">
                <button type="button" className="pv-hit" aria-expanded={openId === l.id} aria-label={`LIVE ${l.date} ${l.time} details`} onClick={() => setOpenId(openId === l.id ? null : l.id)} />
                <span className="lv-mark" aria-hidden="true">LIVE</span>
                <strong>{l.date} · {l.time}</strong>
                <b className={`v2-num${sort === "Cancels" && flag === "high" ? " cr2-red" : ""}`}>{sort === "GMV" ? rm(l.gmv, 0) : sort === "Commission" ? rm(l.commission, 0) : `${l.cancel}%`}</b>
                <Icon name="arrow" size={16} />
                <span className="pl-tags">
                  <span className="lv-thumbs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {l.products.slice(0, 3).map(([id]) => <img key={id} src={info(id).img} alt="" />)}
                  </span>
                  {sort !== "Cancels" && dir === "desc" && l.id === top && <span className="badge">{sort === "GMV" ? "Top GMV" : "Top Earner"}</span>}
                  <CancelChip pct={l.cancel} items={items} />
                </span>
              </div>
              {openId === l.id && (
                <div className="pl-body">
                  <div className="cr2-mini">
                    {span(l) && <span><small>LIVE Length</small><b>{hm(span(l)!)}</b></span>}
                    {span(l) && <span><small>Sales per Hour</small><b>{rm(l.gmv / Math.max(span(l)! / 3600, 0.25), 0)}</b></span>}
                    <span><small>Orders</small><b>{l.orders}</b></span>
                    <span><small>Sales</small><b>{rm(l.gmv, 0)}</b></span>
                    <span><small>Cancel Rate</small><CancelRate pct={l.cancel} items={items} bad={"cancelItems" in l ? l.cancelItems : undefined} /></span>
                  </div>
                  <div className="lv-prods">
                    {[...l.products as Item[]].sort((a, b) => order(key(gmvOf(a), a[1], a[3]), key(gmvOf(b), b[1], b[3]))).map((t) => { const [id, c, , x, , items] = t; const f = cancelFlag(x, items); return (
                      <button key={id} type="button" onClick={() => router.push(productHref(id))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={info(id).img} alt="" />
                        <span>{info(id).name}</span>
                        <b className={sort === "Cancels" && f === "high" ? "cr2-red" : undefined}>{sort === "GMV" ? rm(gmvOf(t), 0) : sort === "Commission" ? rm(c, 0) : `${x}%`}</b>
                      </button>
                    ); })}
                  </div>
                </div>
              )}
            </article>
            );
          })}
        </div>
      </Lock>
    </div>
  );
}
