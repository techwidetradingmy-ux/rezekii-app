"use client";

import { useEffect, useState } from "react";
import { shortCount, type AccountStats } from "@/integrations/tiktok/stats.ts";

/** Followers, likes and videos for the connected TikTok account, loaded after the page shows. */
export function TikTokStats() {
  const [s, setS] = useState<AccountStats | null>(null);
  useEffect(() => {
    fetch("/api/tiktok/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { account?: AccountStats | null }) => setS(d.account ?? null))
      .catch(() => {});
  }, []);
  if (!s) return null;
  return (
    <p className="app-ttstats">
      <span><b>{shortCount(s.follower_count)}</b> followers</span>
      <span><b>{shortCount(s.likes_count)}</b> likes</span>
      <span><b>{shortCount(s.video_count)}</b> videos</span>
    </p>
  );
}
