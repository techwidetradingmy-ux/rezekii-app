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
 * One of her videos, opened on Rezekii (owner, 28 Oct 2026: never send her back to TikTok just to look). A real video plays here
 * in TikTok's own player, its cover showing while it loads, with Open in TikTok below in case it won't (owner, 2 Nov 2026).
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
          <iframe src={`https://www.tiktok.com/player/v1/${video.id}?autoplay=1&rel=0`} title={video.title} allow="autoplay; fullscreen" allowFullScreen />
        ) : (
          <span className="pd-play" aria-hidden="true"><Icon name="video" size={26} /></span>
        )}
      </div>
      {video.url && <a className="btn-outline v2-btn-sm pd-open" href={video.url} target="_blank" rel="noreferrer">{t("Open in TikTok")}</a>}
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
