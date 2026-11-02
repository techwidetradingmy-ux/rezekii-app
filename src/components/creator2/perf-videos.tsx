"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Lock } from "@/components/ui";
import { CancelChip, CancelRate, SortBar, cancelFlag, useSortPref } from "@/components/sort-bar";
import { VideoSheet } from "@/components/creator2/view-sheets";
import { product, rm, short } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { VIDEOS, type VideoRow } from "@/lib/mock-creator2";
import { perfProduct, shortName, useLivePerf } from "@/lib/live-perf";
import { rich, useOptions } from "@/components/creator2/bits";
import { useT } from "@/lib/i18n/client";
import "@/app/creator2.css";

// Short sort names so the switch fits one row on a phone (owner, 28 Oct 2026); GMV first and by default (owner, 30 Oct 2026).
const SORTS = ["GMV", "Commission", "Cancels"] as const;
type Sort = (typeof SORTS)[number];
const TOP: Record<Sort, string> = { GMV: "Top GMV", Commission: "Top Earner", Cancels: "Most Cancelled" };

const per1k = (v: VideoRow) => (v.views ? (v.commission / v.views) * 1000 : null);

/** Performance by video: what each one sold, earned and how many orders were cancelled. */
export function VideoList() {
  const t = useT();
  const sorts = useOptions(SORTS);
  // Highest or lowest first, remembered (owner, 1 Nov 2026).
  const [sort, setSort, dir, flip] = useSortPref<Sort>("perf-videos", SORTS, "GMV");
  const [video, setVideo] = useState<VideoRow | null>(null);
  // Signed in (owner, 31 Oct 2026): her real videos from her orders in the days picked.
  const perf = useLivePerf(true);
  const real = perf && perf !== "wait" && perf !== "error" ? perf : null;
  const rows = useMemo(() => {
    const val = (v: VideoRow) => (sort === "GMV" ? v.gmv : sort === "Commission" ? v.commission : v.cancel);
    return [...(real ? real.videos : VIDEOS)].sort((a, b) => (dir === "desc" ? val(b) - val(a) : val(a) - val(b)));
  }, [sort, dir, real]);
  if (perf === "wait") return <p className="v2-muted"><span className="cr1-spin xs" aria-hidden="true" /> {t("Loading your videos…")}</p>;
  if (perf === "error") return <p className="v2-muted">{t("Couldn't load your videos. Please refresh.")}</p>;

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <SortBar value={sorts.label(sort)} options={sorts.labels} onChange={(l) => setSort(sorts.pick(l))} dir={dir} onFlip={flip} />

      <Lock what={t("what each video earned")}>
        <div className="cr2-list">
          {rows.length === 0 && <p className="v2-muted" style={{ margin: 0 }}>{t("No sales from videos in these days.")}</p>}
          {rows.map((v, i) => {
            const p = real ? perfProduct(real, v.productId) : product(v.productId);
            const k = per1k(v);
            // Rezekii's standard (owner, 1 Nov 2026), from 5 items sold.
            const flag = cancelFlag(v.cancel, v.items);
            const isTop = i === 0 && dir === "desc";
            const hidden = v.views === null && !real;
            // Tidy cards (owner, 3 Nov 2026): the video's own cover, its title on one line (in full in the video), one line for
            // when and what it sold, then the numbers. Tap a card to watch it here, in TikTok's player.
            return (
              <article key={v.id} className="v2-card cr2-vcard" style={{ gap: 14 }}>
                <div className="cr2-vhead">
                  <span className="cr2-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.cover ?? p.img} alt="" />
                    <i><Icon name="video" size={14} /></i>
                  </span>
                  <span>
                    <strong>{v.title}</strong>
                    <small>{rich(t("Posted {date} · {product}", { date: v.date }), { product: <Link href={productHref(p.id)} className="pv-open">{real ? shortName(p.name) : p.name}</Link> })}</small>
                    {(isTop || hidden || flag) && (
                      <span className="cr2-tags">
                        {isTop && <span className="badge">{t(TOP[sort])}</span>}
                        {hidden && <span className="badge badge-gray">{t("Private Video")}</span>}
                        <CancelChip pct={v.cancel} items={v.items} />
                      </span>
                    )}
                  </span>
                </div>
                <div className="cr2-mini six">
                  <span><small>{t("Views")}</small><b>{v.views === null ? "—" : short(v.views)}</b></span>
                  <span><small>{t("Orders")}</small><b>{v.orders}</b></span>
                  <span><small>GMV</small><b>{rm(v.gmv, 0)}</b></span>
                  <span><small>{t("Commission")}</small><b className="cr2-green">{rm(v.commission)}</b></span>
                  <span><small>{t("Cancel Rate")}</small><CancelRate pct={v.cancel} items={v.items} bad={v.cancelItems} /></span>
                  <span><small>{t("Per 1K Views")}</small><b>{k === null ? "—" : rm(k)}</b></span>
                </div>
                {flag === "high" && <Link href="/app/data/risk" className="btn-outline v2-btn-sm cr2-vrisk">{t("See Risk Check")}</Link>}
                {/* Last, so it covers the cover's icon too; the product name and Risk Check sit above it. */}
                <button type="button" className="pv-hit" aria-label={t("Watch {title}", { title: v.title })} onClick={() => setVideo(v)} />
              </article>
            );
          })}
        </div>
      </Lock>

      {video && <VideoSheet video={video} onClose={() => setVideo(null)} />}
    </div>
  );
}
