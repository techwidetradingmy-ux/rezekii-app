"use client";

import { useEffect, useState } from "react";
import { MissionsBoard, type ClaimResult, type Mission } from "@/components/missions-board";
import { useDemo } from "@/components/demo";
import { CREATOR } from "@/lib/mock";
import { claimMission, loadBoard, mergeMissions, type LiveBoard } from "@/lib/live-rewards";

/** Daily missions: general actions anywhere in Rezekii, reset at midnight. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: "Check in", reward: 5, cta: "Check in", state: "ready" },
  { id: "d2", icon: "video", title: "Post a video", reward: 20, cta: "Post", href: "/app/publish", state: "done", counts: "Posts from Rezekii or your phone" },
  { id: "d3", icon: "video", title: "Post 3 videos", reward: 30, cta: "Post", href: "/app/publish", progress: [2, 3], state: "todo", counts: "Posts from Rezekii or your phone" },
  { id: "d4", icon: "scan", title: "Run a scan", reward: 10, cta: "Claim", href: "/app", state: "ready", counts: "Scan finished today" },
  { id: "d5", icon: "gift", title: "Request a free sample", reward: 15, cta: "Find one", href: "/app/market", state: "todo", counts: "Counts when sent" },
  { id: "d6", icon: "share", title: "Share a proud moment", reward: 5, cta: "Share", share: true, state: "todo", counts: "Counts when shared" },
];
/** Starter missions: once only, for the first 7 days after joining. */
const STARTER: Mission[] = [
  { id: "s1", icon: "user", title: "Fill in your profile", reward: 50, cta: "Fill in", href: "/app/account#profile", state: "done" },
  { id: "s2", icon: "link", title: "Link TikTok Shop", reward: 100, cta: "Link", href: "/app/account#connections", state: "done" },
  { id: "s3", icon: "video", title: "Link your TikTok account", reward: 50, cta: "Link", href: "/app/account#connections", state: "done" },
  { id: "s4", icon: "share", title: "Connect Facebook, Instagram or Threads", reward: 30, cta: "Claim", href: "/app/account#connections", state: "ready" },
  { id: "s5", icon: "whatsapp", title: "Verify your WhatsApp", reward: 30, cta: "Verify", href: "/app/account#profile", state: "todo" },
  { id: "s6", icon: "scan", title: "Run your first scan", reward: 50, cta: "Scan", href: "/app", state: "todo" },
  { id: "s7", icon: "trophy", title: "Finish your first collaboration", reward: 120, cta: "Find a sample", href: "/app/market", state: "todo" },
];
/** Coming later: brands pay for content. Examples so creators know it's on the way. */
const BRANDED = [
  { brand: "Seri Living MY", bg: "linear-gradient(135deg,#ffb35c,#f05a00)", title: "Kitchen hacks week", reward: "RM 50 a video", ends: "Opens Dec" },
  { brand: "Urban Basics MY", bg: "linear-gradient(135deg,#8b7dff,#5b4ee0)", title: "OOTD try-on challenge", reward: "RM 120 for 3 videos", ends: "Opens Dec" },
  { brand: "Bersih Pro", bg: "linear-gradient(135deg,#25f4ee,#00a8a0)", title: "Honest before & after", reward: "RM 30 at 20 sales", ends: "Opens Jan" },
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
  const [board, setBoard] = useState<LiveBoard | null | "error">(null);
  useEffect(() => {
    if (live) loadBoard("creator").then(setBoard).catch(() => setBoard("error"));
  }, [live]);
  if (live && board === null) return <div className="v2-stack v2-in"><p className="v2-muted">Loading your missions…</p></div>;
  if (live && board === "error") return <div className="v2-stack v2-in"><p className="v2-muted">Couldn&apos;t load your missions. Please refresh.</p></div>;
  const b = live && board && board !== "error" ? board : null;
  const l = b ? lists(b) : null;
  return (
    <MissionsBoard
      key={b ? "live" : "sample"}
      daily={l?.daily ?? DAILY}
      starter={l?.starter ?? STARTER}
      credits={b?.credits ?? CREATOR.credits}
      streak={b?.streak ?? CREATOR.streak}
      week={b?.week}
      countedToday={b?.countedToday}
      onClaim={b ? claimed : undefined}
      walletHref="/app/account#wallet"
      sub="Earn credits. Use them to post to many apps at once."
      starterNote={b ? `${b.starterLeft} day${b.starterLeft === 1 ? "" : "s"} left` : "5 days left"}
      handle={me?.handle ? `@${me.handle}` : undefined}
    >
      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Branded Missions</h2>
          <span className="badge badge-amber">Coming soon</span>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Brands pay you for videos, on top of your commission.</p>
        <div className="mx-brands">
          {BRANDED.map((b) => (
            <span key={b.title} className="mx-brand">
              <i style={{ background: b.bg }}>{b.brand.slice(0, 1)}</i>
              <span><b>{b.title}</b><small>{b.brand} · {b.ends}</small></span>
              <em>{b.reward}</em>
            </span>
          ))}
        </div>
      </section>
    </MissionsBoard>
  );
}
