"use client";

import { useState } from "react";
import { PlatformIcon } from "@/components/creator2/bits";
import "@/app/publish.css";

type Icon = "TikTok" | "Facebook" | "Instagram" | "Threads" | "Shopee";

/**
 * A connected account's profile picture, with its app's icon in the corner (owner, 22 Nov 2026: Facebook, Instagram, Threads
 * and TikTok pictures were missing). Initials in the account's colour when it has no picture or the picture won't load (Meta's
 * and TikTok's picture links expire; the timer refreshes them).
 */
export function AccountFace({ icon, photo, initials, color, badge = true, size }: { icon: Icon; photo?: string | null; initials: string; color: string; badge?: boolean; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const style = size ? { width: size, height: size } : undefined;
  return (
    <span className="pb-face" style={style}>
      {photo && photo !== failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(photo)} />
      ) : (
        <span className="pb-ini" style={{ background: color }}>{initials}</span>
      )}
      {badge && <span className="badge-pi"><PlatformIcon name={icon} size={12} /></span>}
    </span>
  );
}
