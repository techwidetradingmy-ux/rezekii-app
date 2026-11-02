"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Stat, Title, Loading } from "@/components/ui";
import { Ava } from "@/components/seller/seller-ui";
import { sellerProductHref } from "@/lib/product-pages";
import { shortName } from "@/lib/live-perf";
import { labelCase } from "@/lib/label-case";
import { useT } from "@/lib/i18n/client";

type Sample = { handle: string; productId: string; product: string; stage: number; videos: number; lives: number };
const STEP: Record<number, [string, string]> = {
  [-1]: ["Not approved", "badge-red"], 1: ["Asked", "badge-amber"], 2: ["Approved", "badge-amber"], 3: ["Shipped", "badge-amber"], 4: ["Received", ""], 5: ["Done", ""],
};
const FILTERS = ["All", "With a video", "No video yet"] as const;

/**
 * Where Samples Went on real data (owner, 31 Oct 2026): every creator who asked TikTok for a free sample of her TAP products,
 * the sample's step and the videos and LIVEs they've made. TikTok gives no due dates here, so nothing is marked overdue.
 */
export function LiveSamples() {
  const t = useT();
  const [list, setList] = useState<Sample[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  useEffect(() => {
    fetch("/api/v2/seller/results", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { samples?: Sample[] } | null) => (d ? setList(d.samples ?? []) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (!list) {
    return (
      <div className="v2-stack v2-in">
        <Title title={t("Where Samples Went")} />
        {failed ? <p className="v2-muted">{t("Couldn't reach TikTok Shop. Please try again.")}</p> : <Loading text={t("Loading where your samples went, from TikTok…")} />}
      </div>
    );
  }
  const got = list.filter((s) => s.stage >= 3);
  const withVideo = list.filter((s) => s.videos > 0);
  const shown = list.filter((s) => filter === "All" || (filter === "With a video" ? s.videos > 0 : s.videos === 0));
  const videos = list.reduce((a, s) => a + s.videos, 0);
  const lives = list.reduce((a, s) => a + s.lives, 0);
  return (
    <div className="v2-stack v2-in">
      <Title title={t("Where Samples Went")} sub={t("Creators who asked for a free sample of your TAP products, from TikTok")} />

      <section className="v2-grid4">
        <Stat label={t("Samples Asked")} value={<Count value={list.length} />} />
        <Stat label={t("Shipped or Received")} value={<Count value={got.length} />} />
        <Stat label={t("With a Video")} value={<Count value={withVideo.length} />} tone={withVideo.length ? "up" : undefined} />
        <Stat label={t("Videos Posted")} value={<Count value={videos} />} note={lives ? (lives === 1 ? t("+ {n} LIVE", { n: lives }) : t("+ {n} LIVEs", { n: lives })) : undefined} />
      </section>

      <div className="sl-chipline" role="group" aria-label={t("Filter")}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {t(labelCase(f))} <small>{f === "All" ? list.length : f === "With a video" ? withVideo.length : list.length - withVideo.length}</small>
          </button>
        ))}
      </div>

      <section className="v2-card">
        {!list.length && <p className="v2-muted" style={{ margin: 0 }}>{t("No sample requests yet. Creators ask for samples from your products in the Rezekii Marketplace.")}</p>}
        <div>
          {shown.map((d) => (
            <div key={`${d.handle}-${d.productId}`} className="sl-dest">
              <Ava name={`@${d.handle}`} lg />
              <span>
                <b>@{d.handle}</b>
                <small><Link href={sellerProductHref(d.productId)} className="pv-open">{shortName(d.product)}</Link></small>
                <span className="v2-row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
                  {d.videos === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: d.videos })}
                  {d.lives > 0 && <span className="badge badge-blue">{d.lives === 1 ? t("+ {n} LIVE", { n: 1 }) : t("+ {n} LIVEs", { n: d.lives })}</span>}
                </span>
              </span>
              <span className="sl-pside">
                <span className={`badge ${STEP[d.stage]?.[1] ?? ""}`}>{t(labelCase(STEP[d.stage]?.[0] ?? "Asked"))}</span>
                {d.videos > 0 && <a className="v2-link" style={{ fontSize: 13.5 }} href={`https://www.tiktok.com/@${d.handle}`} target="_blank" rel="noreferrer">{t("Watch Videos")}</a>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="shield" size={16} /> {t("Techwide approves every sample. 1 sample = at least 1 video by the due date; creators with none get frozen or banned. Sent samples can't be taken back.")}
      </p>
    </div>
  );
}
