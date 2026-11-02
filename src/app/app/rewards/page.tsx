"use client";

import { useEffect, useState } from "react";
import { MissionsBoard, type ClaimResult, type Mission } from "@/components/missions-board";
import { useDemo } from "@/components/demo";
import { CREATOR } from "@/lib/mock";
import { claimMission, loadBoard, mergeMissions, type LiveBoard } from "@/lib/live-rewards";
import { Loading } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** Daily missions: general actions anywhere in Rezekii, reset at midnight. Words in English; the board shows them in her language. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: tx("Check in"), reward: 5, cta: tx("Check in"), state: "ready" },
  { id: "d2", icon: "video", title: tx("Post a video"), reward: 20, cta: tx("Post"), href: "/app/publish", state: "done", counts: tx("Posts from Rezekii or your phone") },
  { id: "d3", icon: "video", title: tx("Post 3 videos"), reward: 30, cta: tx("Post"), href: "/app/publish", progress: [2, 3], state: "todo", counts: tx("Posts from Rezekii or your phone") },
  { id: "d4", icon: "scan", title: tx("Run a scan"), reward: 10, cta: tx("Claim"), href: "/app", state: "ready", counts: tx("Scan finished today") },
  { id: "d5", icon: "gift", title: tx("Request a free sample"), reward: 15, cta: tx("Find one"), href: "/app/market", state: "todo", counts: tx("Counts when sent") },
  { id: "d6", icon: "share", title: tx("Share a proud moment"), reward: 5, cta: tx("Share"), share: true, state: "todo", counts: tx("Counts when shared") },
];
/** Starter missions: once only, for the first 7 days after joining. */
const STARTER: Mission[] = [
  { id: "s1", icon: "user", title: tx("Fill in your profile"), reward: 50, cta: tx("Fill in"), href: "/app/account#profile", state: "done" },
  { id: "s2", icon: "link", title: tx("Link TikTok Shop"), reward: 100, cta: tx("Link"), href: "/app/account#connections", state: "done" },
  { id: "s3", icon: "video", title: tx("Link your TikTok account"), reward: 50, cta: tx("Link"), href: "/app/account#connections", state: "done" },
  { id: "s4", icon: "share", title: tx("Connect Facebook, Instagram or Threads"), reward: 30, cta: tx("Claim"), href: "/app/account#connections", state: "ready" },
  { id: "s5", icon: "whatsapp", title: tx("Verify your WhatsApp"), reward: 30, cta: tx("Verify"), href: "/app/account#profile", state: "todo" },
  { id: "s6", icon: "scan", title: tx("Run your first scan"), reward: 50, cta: tx("Scan"), href: "/app", state: "todo" },
  { id: "s7", icon: "trophy", title: tx("Finish your first collaboration"), reward: 120, cta: tx("Find a sample"), href: "/app/market", state: "todo" },
];
/**
 * Coming later: brands pay for content. Examples so creators know it's on the way. The campaign titles are the brands' own
 * (sample), so they stay as written; the reward and opening words show in her language.
 */
const BRANDED = [
  { brand: "Seri Living MY", bg: "linear-gradient(135deg,#ffb35c,#f05a00)", title: "Kitchen hacks week", reward: tx("RM 50 a video"), ends: tx("Opens Dec") },
  { brand: "Urban Basics MY", bg: "linear-gradient(135deg,#8b7dff,#5b4ee0)", title: "OOTD try-on challenge", reward: tx("RM 120 for 3 videos"), ends: tx("Opens Dec") },
  { brand: "Bersih Pro", bg: "linear-gradient(135deg,#25f4ee,#00a8a0)", title: "Honest before & after", reward: tx("RM 30 at 20 sales"), ends: tx("Opens Jan") },
];

/** A real board in the screen's shape. */
const lists = (b: LiveBoard) => ({ daily: mergeMissions(DAILY, b.daily), starter: mergeMissions(STARTER, b.starter), milestones: [] as Mission[] });
const claimed = async (m: Mission): Promise<ClaimResult> => {
  const r = await claimMission("creator", m.id);
  return { lists: lists(r.board), credits: r.board.credits, streak: r.board.streak, countedToday: r.board.countedToday, week: r.board.week, gained: r.gained, chest: r.chest, tier: r.tier };
};

/** Creator missions: the shared board, plus branded missions coming soon. Signed in, every mission counts real actions. */
export default function Missions() {
  const { live, me } = useDemo();
  const t = useT();
  const [board, setBoard] = useState<LiveBoard | null | "error">(null);
  useEffect(() => {
    if (live) loadBoard("creator").then(setBoard).catch(() => setBoard("error"));
  }, [live]);
  if (live && board === null) return <div className="v2-stack v2-in"><Loading text={t("Loading your missions…")} /></div>;
  if (live && board === "error") return <div className="v2-stack v2-in"><p className="v2-muted">{t("Couldn't load your missions. Please refresh.")}</p></div>;
  const b = live && board && board !== "error" ? board : null;
  const l = b ? lists(b) : null;
  return (
    <MissionsBoard
      key={b ? "live" : "sample"}
      streakHref="/app/account#streak"
      daily={l?.daily ?? DAILY}
      starter={l?.starter ?? STARTER}
      credits={b?.credits ?? CREATOR.credits}
      streak={b?.streak ?? CREATOR.streak}
      week={b?.week}
      countedToday={b?.countedToday}
      onClaim={b ? claimed : undefined}
      walletHref="/app/account#wallet"
      sub={t("Earn credits. Use them to post to many apps at once.")}
      starterNote={b ? (b.starterLeft === 1 ? t("{n} day left", { n: b.starterLeft }) : t("{n} days left", { n: b.starterLeft })) : t("{n} days left", { n: 5 })}
      handle={me?.handle ? `@${me.handle}` : undefined}
    >
      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("Branded Missions")}</h2>
          <span className="badge badge-amber">{t("Coming Soon")}</span>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>{t("Brands pay you for videos, on top of your commission.")}</p>
        <div className="mx-brands">
          {BRANDED.map((b) => (
            <span key={b.title} className="mx-brand">
              <i style={{ background: b.bg }}>{b.brand.slice(0, 1)}</i>
              <span><b>{b.title}</b><small>{b.brand} · {t(b.ends)}</small></span>
              <em>{t(b.reward)}</em>
            </span>
          ))}
        </div>
      </section>
    </MissionsBoard>
  );
}
