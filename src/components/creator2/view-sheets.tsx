"use client";

import { Icon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { useCancelText } from "@/components/creator2/bits";
import { PRODUCTS, product, rm, short } from "@/lib/mock";
import { NO_PHOTO } from "@/lib/live-perf";
import { CANCEL_MIN_ITEMS } from "@/lib/cancel";
import { useT } from "@/lib/i18n/client";
import type { VideoRow } from "@/lib/mock-creator2";

/**
 * One of her videos, opened on Rezekii: its cover and numbers, and Watch on TikTok to play it there (owner, 3 Nov 2026). TikTok's
 * embedded players stopped sending the video itself (they get an empty video address), so it opens in TikTok instead.
 */
export function VideoSheet({ video, onClose }: { video: VideoRow; onClose: () => void }) {
  const t = useT();
  const cancelText = useCancelText();
  return (
    <Sheet title={t("Video")} onClose={onClose}>
      <div className="pd-player">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.cover ?? (PRODUCTS.some((p) => p.id === video.productId) ? product(video.productId).img : NO_PHOTO)} alt="" />
        {video.url ? (
          <a className="pd-play" href={video.url} target="_blank" rel="noreferrer" aria-label={t("Watch on TikTok")}><Icon name="video" size={26} /></a>
        ) : (
          <span className="pd-play" aria-hidden="true"><Icon name="video" size={26} /></span>
        )}
      </div>
      {video.url && <a className="np-btn pd-open" href={video.url} target="_blank" rel="noreferrer"><Icon name="video" size={18} /> {t("Watch on TikTok")}</a>}
      <b style={{ fontSize: 16 }}>{video.title}</b>
      <div className="cr2-mini">
        <span><small>{t("Views")}</small><b>{video.views === null ? "—" : short(video.views)}</b></span>
        <span><small>{t("Orders")}</small><b>{video.orders}</b></span>
        <span><small>{t("Commission")}</small><b>{rm(video.commission, 0)}</b></span>
        <span><small>{t("Cancel rate")}</small><b className={video.cancel > 15 && (video.items ?? CANCEL_MIN_ITEMS) >= CANCEL_MIN_ITEMS ? "cr2-red" : undefined}>{cancelText(video.cancel, video.items, video.cancelItems)}</b></span>
      </div>
    </Sheet>
  );
}
