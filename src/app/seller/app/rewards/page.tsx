"use client";

import { MissionsBoard, type Mission } from "@/components/missions-board";
import type { IconName } from "@/components/icons";
import { SELLER } from "@/lib/mock";
import { SELLER_CREDITS, SELLER_MISSIONS, SELLER_STREAK } from "@/lib/mock-seller";

/** Daily missions for sellers: general actions in the seller app, reset at midnight. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: "Check in", reward: 5, cta: "Check in", state: "ready" },
  { id: "d2", icon: "video", title: "Post a video for your shop", reward: 20, cta: "Post", href: "/seller/app/publish", state: "done", counts: "Posts from Rezekii or your phone" },
  { id: "d3", icon: "chart", title: "Check today's results", reward: 5, cta: "Claim", state: "ready", counts: "Results opened today" },
  { id: "d4", icon: "box", title: "Submit or register a product", reward: 20, cta: "Submit", href: "/seller/app/submit", state: "todo", counts: "Counts at our review" },
  { id: "d5", icon: "share", title: "Share a proud moment", reward: 5, cta: "Share", share: true, state: "todo", counts: "Counts when shared" },
];
const ICONS: Record<string, IconName> = { sm1: "link", sm2: "user", sm3: "box", sm4: "check", sm5: "share", sm6: "users", sm7: "box", sm8: "users", sm9: "shield" };
/** The seller's setup steps and milestones, as missions with one button each. */
const toMission = (m: (typeof SELLER_MISSIONS)[number]): Mission => ({
  id: m.id, icon: ICONS[m.id] ?? "gift", title: m.title, reward: m.reward,
  state: m.done && m.claimed ? "done" : m.done ? "ready" : "todo",
  cta: m.done ? "Claim" : "Go", href: m.href, progress: m.goal > 1 ? [m.progress, m.goal] : undefined,
});

/** Seller missions: the same board as creators, with the shop's own missions. Credits are rewards, not cash. */
export default function SellerMissions() {
  return (
    <MissionsBoard
      daily={DAILY}
      starter={SELLER_MISSIONS.filter((m) => m.kind === "newbie").map(toMission)}
      milestones={SELLER_MISSIONS.filter((m) => m.kind === "milestone").map(toMission)}
      credits={SELLER_CREDITS}
      streak={SELLER_STREAK}
      walletHref="/seller/app/rewards/wallet"
      sub="Earn credits to post to many apps at once. Credits are not cash."
      starterNote="5 days left"
      handle={SELLER.shop}
    />
  );
}
