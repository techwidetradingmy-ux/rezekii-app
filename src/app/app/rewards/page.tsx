"use client";

import { MissionsBoard, type Mission } from "@/components/missions-board";
import { CREATOR } from "@/lib/mock";

/** Daily missions: general actions anywhere in Rezekii, reset at midnight. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: "Check in", reward: 5, cta: "Check in", state: "ready" },
  { id: "d2", icon: "video", title: "Post a video", reward: 20, cta: "Post", href: "/app/publish", state: "done" },
  { id: "d3", icon: "video", title: "Post 3 videos", reward: 30, cta: "Post", href: "/app/publish", progress: [2, 3], state: "todo" },
  { id: "d4", icon: "scan", title: "Run a scan", reward: 10, cta: "Claim", state: "ready" },
  { id: "d5", icon: "gift", title: "Request a free sample", reward: 15, cta: "Find one", href: "/app/market", state: "todo" },
  { id: "d6", icon: "share", title: "Share a proud moment", reward: 5, cta: "Share", share: true, state: "todo" },
];
/** Starter missions: once only, for the first 7 days after joining. */
const STARTER: Mission[] = [
  { id: "s1", icon: "user", title: "Fill in your profile", reward: 50, cta: "", state: "done" },
  { id: "s2", icon: "link", title: "Link TikTok Shop", reward: 100, cta: "", state: "done" },
  { id: "s3", icon: "video", title: "Link your TikTok account", reward: 50, cta: "", state: "done" },
  { id: "s4", icon: "share", title: "Connect Facebook, Instagram or Threads", reward: 30, cta: "Claim", state: "ready" },
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

/** Creator missions: the shared board, plus branded missions coming soon. */
export default function Missions() {
  return (
    <MissionsBoard daily={DAILY} starter={STARTER} credits={CREATOR.credits} streak={CREATOR.streak} walletHref="/app/account#wallet" sub="Earn credits. Spend them on AI tools." starterNote="5 days left">
      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Branded missions</h2>
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
