"use client";

import { Icon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { product, rm, short } from "@/lib/mock";
import type { VideoRow } from "@/lib/mock-creator2";

/** One of her videos, opened on Rezekii (owner, 28 Oct 2026: never send her back to TikTok just to look). */
export function VideoSheet({ video, onClose }: { video: VideoRow; onClose: () => void }) {
  return (
    <Sheet title="Video" onClose={onClose}>
      <div className="pd-player">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product(video.productId).img} alt="" />
        <span className="pd-play" aria-hidden="true"><Icon name="video" size={26} /></span>
      </div>
      <b style={{ fontSize: 16 }}>{video.title}</b>
      <div className="cr2-mini">
        <span><small>Views</small><b>{video.views === null ? "—" : short(video.views)}</b></span>
        <span><small>Orders</small><b>{video.orders}</b></span>
        <span><small>Commission</small><b>{rm(video.commission, 0)}</b></span>
        <span><small>Cancel rate</small><b className={video.cancel > 15 ? "cr2-red" : undefined}>{video.cancel}%</b></span>
      </div>
    </Sheet>
  );
}

/** A product, opened on Rezekii: photo, price, rates and rating. */
export function ProductSheet({ productId, onClose }: { productId: string; onClose: () => void }) {
  const p = product(productId);
  return (
    <Sheet title="Product" onClose={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ps-img" src={p.img} alt="" />
      <b style={{ fontSize: 16 }}>{p.name}</b>
      <div className="cr2-mini">
        <span><small>Price</small><b>{rm(p.price)}</b></span>
        <span><small>Rating</small><b className={p.rating < 3 ? "cr2-red" : undefined}>{p.rating.toFixed(1)} ★</b></span>
        <span><small>Open plan</small><b>{p.publicRate}%</b></span>
        <span><small>Rezekii</small><b className="cr2-green">{p.tapRate}%</b></span>
      </div>
    </Sheet>
  );
}
