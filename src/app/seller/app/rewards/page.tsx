"use client";

import { useEffect, useState } from "react";
import { MissionsBoard, type ClaimResult, type Mission } from "@/components/missions-board";
import type { IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { claimMission, loadBoard, mergeMissions, type LiveBoard } from "@/lib/live-rewards";
import { SELLER } from "@/lib/mock";
import { SELLER_CREDITS, SELLER_MISSIONS, SELLER_STREAK } from "@/lib/mock-seller";
import { Loading } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** Daily missions for sellers: general actions in the seller app, reset at midnight. English; the board shows them in her language. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: tx("Check in"), reward: 5, cta: tx("Check in"), state: "ready" },
  { id: "d2", icon: "video", title: tx("Post a video for your shop"), reward: 20, cta: tx("Post"), href: "/seller/app/publish", state: "done", counts: tx("Posts from Rezekii or your phone") },
  { id: "d3", icon: "chart", title: tx("Check today's results"), reward: 5, cta: tx("Claim"), href: "/seller/app/results", state: "ready", counts: tx("Results opened today") },
  { id: "d4", icon: "box", title: tx("Submit or register a product"), reward: 20, cta: tx("Register"), href: "/seller/app/submit", state: "todo", counts: tx("Counts at our review") },
  { id: "d5", icon: "share", title: tx("Share a proud moment"), reward: 5, cta: tx("Share"), share: true, state: "todo", counts: tx("Counts when shared") },
];
/** Where each seller mission is done. */
const HREFS: Record<string, string> = { sm1: "/seller/app/account", sm2: "/seller/app/account", sm3: "/seller/app/submit", sm4: "/seller/app/progress", sm5: "/seller/app/account" };
const ICONS: Record<string, IconName> = { sm1: "link", sm2: "user", sm3: "box", sm4: "check", sm5: "share", sm6: "users", sm7: "box", sm8: "users", sm9: "shield" };
/**
 * The seller's setup steps and milestones, as missions with one button each. Their titles (from the sample list) show in her
 * language on the board; their Malay and Chinese are in the Missions word lists.
 */
const toMission = (m: (typeof SELLER_MISSIONS)[number]): Mission => ({
  id: m.id, icon: ICONS[m.id] ?? "gift", title: m.title, reward: m.reward,
  state: m.done && m.claimed ? "done" : m.done ? "ready" : "todo",
  cta: m.done ? tx("Claim") : tx("Go"), href: m.href ?? HREFS[m.id], progress: m.goal > 1 ? [m.progress, m.goal] : undefined,
});

const STARTER = SELLER_MISSIONS.filter((m) => m.kind === "newbie").map(toMission);
const MILESTONES = SELLER_MISSIONS.filter((m) => m.kind === "milestone").map(toMission);
/** A real board in the screen's shape. */
const lists = (b: LiveBoard) => ({ daily: mergeMissions(DAILY, b.daily), starter: mergeMissions(STARTER, b.starter), milestones: mergeMissions(MILESTONES, b.milestones) });
const claimed = async (m: Mission): Promise<ClaimResult> => {
  const r = await claimMission("seller", m.id);
  return { lists: lists(r.board), credits: r.board.credits, streak: r.board.streak, countedToday: r.board.countedToday, week: r.board.week, gained: r.gained, chest: r.chest, tier: r.tier };
};

/** Seller missions: the same board as creators, with the shop's own missions. Credits are rewards, not cash. */
export default function SellerMissions() {
  const { live, me } = useDemo();
  const t = useT();
  const [board, setBoard] = useState<LiveBoard | null | "error">(null);
  useEffect(() => {
    if (live) loadBoard("seller").then(setBoard).catch(() => setBoard("error"));
  }, [live]);
  if (live && board === null) return <div className="v2-stack v2-in"><Loading text={t("Loading your missions…")} /></div>;
  if (live && board === "error") return <div className="v2-stack v2-in"><p className="v2-muted">{t("Couldn't load your missions. Please refresh.")}</p></div>;
  const b = live && board && board !== "error" ? board : null;
  const l = b ? lists(b) : null;
  return (
    <MissionsBoard
      key={b ? "live" : "sample"}
      daily={l?.daily ?? DAILY}
      starter={l?.starter ?? STARTER}
      milestones={l?.milestones ?? MILESTONES}
      credits={b?.credits ?? SELLER_CREDITS}
      streak={b?.streak ?? SELLER_STREAK}
      week={b?.week}
      countedToday={b?.countedToday}
      onClaim={b ? claimed : undefined}
      walletHref="/seller/app/rewards/wallet"
      sub={t("Earn credits to post to many apps at once. Credits are not cash.")}
      starterNote={b ? (b.starterLeft === 1 ? t("{n} day left", { n: b.starterLeft }) : t("{n} days left", { n: b.starterLeft })) : t("{n} days left", { n: 5 })}
      handle={b ? me?.sellerShop ?? undefined : SELLER.shop}
    />
  );
}
