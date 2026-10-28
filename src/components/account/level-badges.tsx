"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Emblem, type Level } from "@/components/emblems";
import { Portal, Progress, ShareSheet, type MomentKind, Sheet } from "@/components/ui";
import { Honour } from "@/components/creator2/bits";
import { BADGES, CREATOR } from "@/lib/mock";
import { BADGE_INFO, LEVELS, TIERS } from "@/lib/mock-creator2";
import "@/app/rewards.css";

/** Each badge's sticker: icon, colours, and how far along a locked one is. */
const STICKER: Record<string, { icon: IconName; from: string; to: string; progress?: [number, number] }> = {
  "First scan": { icon: "scan", from: "#25f4ee", to: "#00a8a0" },
  "Link master": { icon: "link", from: "#8b7dff", to: "#5b4ee0" },
  "7-day streak": { icon: "flame", from: "#ffb35c", to: "#f05a00" },
  "Sample star": { icon: "gift", from: "#ff7aa8", to: "#e8005a" },
  "Highly active": { icon: "star", from: "#ffe08a", to: "#e09a1a", progress: [CREATOR.streak, 30] },
  "First RM 1,000": { icon: "wallet", from: "#22dc95", to: "#00804f" },
  Silver: { icon: "medal", from: "#e9ecff", to: "#9097c4" },
  Gold: { icon: "trophy", from: "#ffe08a", to: "#c98510" },
};
const SPARK = ["#ffd34d", "#25f4ee", "#ff5ca8", "#22dc95", "#8b7dff", "#ffffff"];

/** A pointy-top hexagon path around (cx, cy). */
const hex = (cx: number, cy: number, rad: number) =>
  `M${[-90, -30, 30, 90, 150, 210].map((a) => `${(cx + rad * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(cy + rad * Math.sin((a * Math.PI) / 180)).toFixed(2)}`).join("L")}Z`;

/** A badge as an honour emblem (owner, 28 Oct 2026): a metal-rimmed hexagon in the badge's colours, its icon in the middle, and a shine. Grey and locked until earned. */
function BadgeEmblem({ name, got, size = 76 }: { name: string; got: boolean; size?: number }) {
  const s = STICKER[name];
  const id = `lb-${name.replace(/[^a-z0-9]/gi, "")}`;
  const [c1, c2] = got ? [s.from, s.to] : ["#eef2f5", "#b4bec9"];
  return (
    <span className={`lb-em ${got ? "got" : "off"}`} style={{ width: size, height: size * 1.08 }}>
      <svg viewBox="0 0 100 108" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity={got ? 0.9 : 0.6} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
          <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <path d={hex(50, 54, 48)} fill={`url(#${id}-r)`} />
        <path d={hex(50, 54, 40)} fill={`url(#${id}-f)`} />
        <path d={hex(50, 54, 40)} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M18 34 50 16l32 18" fill="none" stroke="#ffffff" strokeOpacity={got ? 0.45 : 0.3} strokeWidth="3" strokeLinecap="round" />
        {got && <path d="M84 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M16 84l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#ffffff" />}
      </svg>
      <span className="lb-em-ico"><Icon name={got ? s.icon : "lock"} size={Math.round(size * 0.34)} width={2.2} /></span>
      {got && <span className="lb-em-shine" aria-hidden="true" />}
    </span>
  );
}
const KEY: Record<string, Level> = { Bronze: "bronze", Silver: "silver", Gold: "gold" };

type Share = { big: string; label: string; lines: string[]; level?: Level; kicker?: string; moment: MomentKind };

/**
 * Level & badges (in My account): a collectible creator card that tilts and sparkles, the Bronze → Silver → Gold path with V1's
 * emblems, the Highly active honour, and a sticker wall of badges. Everything can be shared as a card.
 */
export function LevelBadges() {
  const card = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(0);
  const [pick, setPick] = useState(LEVELS.findIndex((l) => l.name === CREATOR.level));
  const [badge, setBadge] = useState<(typeof BADGES)[number] | null>(null);
  const [unlock, setUnlock] = useState(false);
  const [lit, setLit] = useState(false);
  const [share, setShare] = useState<Share | null>(null);
  const got = BADGES.filter((b) => b.got).length;
  const levelAt = LEVELS.findIndex((l) => l.name === CREATOR.level);
  const tierAt = TIERS.findIndex((t) => t.name === CREATOR.activity);
  const mine = KEY[CREATOR.level];

  useEffect(() => {
    if (!unlock) return;
    setLit(false);
    const t = window.setTimeout(() => setLit(true), 650);
    return () => window.clearTimeout(t);
  }, [unlock]);

  /** The card leans toward the pointer and the holographic sheen follows it. */
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 16}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const rest = () => {
    const el = card.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <section className="lb-hero">
        <div className="lb-stage">
          <div
            ref={card}
            className={`lb-card ${mine}`}
            onPointerMove={tilt}
            onPointerLeave={rest}
            onClick={() => setBurst((b) => b + 1)}
            role="img"
            aria-label={`Creator card: ${CREATOR.handle}, ${CREATOR.level}, TikTok Shop Lv.${CREATOR.tiktokLevel}, ${got} badges`}
          >
            <span className="lb-holo" aria-hidden="true" />
            <span className="lb-glare" aria-hidden="true" />
            <span className="lb-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/master-logo-transparent.png" alt="" />
              <b>REZEKII CREATOR</b>
              <em>No. 0428</em>
            </span>
            <Emblem level={mine} size={132} animate />
            <span className="lb-tier">{CREATOR.level.toUpperCase()}</span>
            <strong className="lb-name">{CREATOR.handle}</strong>
            <span className="lb-stats">
              <span><b>Lv.{CREATOR.tiktokLevel}</b>TikTok Shop</span>
              <span><b>{CREATOR.streak}</b>day streak</span>
              <span><b>{got}</b>badges</span>
            </span>
            <span className="lb-foot">Since Mar 2026 · rezekii.com/c/aisyah.glow</span>
            <span className="lb-burst" key={burst} aria-hidden="true">
              {burst > 0 && Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ "--a": `${i * 20}deg`, "--d": `${70 + (i % 4) * 22}px`, background: SPARK[i % SPARK.length] } as React.CSSProperties} />
              ))}
            </span>
          </div>
          <span className="v2-small">Tap the card</span>
        </div>

        <div className="lb-side">
          <span className="lb-kicker">Your level</span>
          <h2 className="lb-h">You&apos;re {CREATOR.level}</h2>
          <p className="v2-muted" style={{ margin: 0 }}>Your level sets your commission rates.</p>
          <div className="lb-path" role="group" aria-label="Levels">
            {LEVELS.map((l, i) => (
              <button key={l.name} type="button" className={`lb-stop ${i === pick ? "on" : ""} ${i <= levelAt ? "got" : ""}`} aria-pressed={i === pick} onClick={() => setPick(i)}>
                <Emblem level={KEY[l.name]} size={i === levelAt ? 74 : 60} animate={i === levelAt} dim={i > levelAt} />
                <b>{l.name}</b>
                {i === levelAt && <span className="badge">You</span>}
              </button>
            ))}
          </div>
          <div className="lb-perks" key={pick}>
            <small>{LEVELS[pick].how}</small>
            <ul>
              {LEVELS[pick].gives.map((g) => <li key={g}><Icon name="check" size={15} width={2.8} />{g}</li>)}
            </ul>
          </div>
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm" onClick={() => setShare({ big: `${CREATOR.level} creator`, label: "My creator level on Rezekii", lines: [`TikTok Shop Lv.${CREATOR.tiktokLevel}`, `${got} badges earned`], level: mine, kicker: "Level up", moment: "level" })}>
              <Icon name="share" size={16} /> Share my card
            </button>
          </div>
        </div>
      </section>

      <section className="v2-card lb-honour">
        <Honour state="off" size={92} />
        <span className="lb-honour-main">
          <span className="v2-row" style={{ gap: 8 }}>
            <b>Highly active</b>
            <span className="badge badge-amber">Honour badge</span>
          </span>
          <span className="v2-small">{TIERS[tierAt].name} now · day {CREATOR.streak} of 30. Post daily, deliver every sample.</span>
          <Progress value={CREATOR.streak} max={30} />
        </span>
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlock(true)}><Icon name="eye" size={15} /> Preview</button>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Badges</h2>
          <span className="badge">{got} of {BADGES.length} collected</span>
        </div>
        <div className="lb-badges">
          {BADGES.map((b) => {
            const s = STICKER[b.name];
            return (
              <button key={b.name} type="button" className={`lb-badge ${b.got ? "got" : ""}`} onClick={() => setBadge(b)}>
                <BadgeEmblem name={b.name} got={b.got} />
                <b>{b.name}</b>
                <small>{b.got ? "Collected" : s.progress ? `${s.progress[0]} / ${s.progress[1]} days` : "Locked"}</small>
              </button>
            );
          })}
        </div>
      </section>

      {badge && (
        <Sheet title={badge.name} onClose={() => setBadge(null)}>
          <div className="lb-bigsticker">
            <BadgeEmblem name={badge.name} got={badge.got} size={132} />
          </div>
          <p style={{ margin: 0, textAlign: "center", lineHeight: 1.5 }}>{BADGE_INFO[badge.name]}</p>
          <span className={`badge ${badge.got ? "" : "badge-gray"}`} style={{ alignSelf: "center" }}>{badge.got ? "Collected" : "Not yet"}</span>
          {badge.got ? (
            <button type="button" className="np-btn" onClick={() => { setBadge(null); setShare({ big: badge.name, label: "New badge on Rezekii", lines: [`${CREATOR.level} creator`, `${got} badges so far`], kicker: "New badge", moment: "badge" }); }}>
              <Icon name="share" size={18} /> Share this badge
            </button>
          ) : (
            <button type="button" className="btn-outline" style={{ height: 46 }} onClick={() => setBadge(null)}>Got it</button>
          )}
        </Sheet>
      )}

      {unlock && (
        <Portal>
          <div className="v2-celebrate cr2-unlock" onClick={() => setUnlock(false)}>
            <div className="v2-cele-card" role="dialog" aria-modal="true" aria-label="Highly active unlocked" onClick={(e) => e.stopPropagation()}>
              {lit && (
                <div className="v2-confetti" aria-hidden="true">
                  {Array.from({ length: 32 }, (_, i) => (
                    <i key={i} style={{ left: `${(i * 31) % 100}%`, background: SPARK[i % SPARK.length], animationDelay: `${(i % 8) * 80}ms`, transform: `rotate(${i * 27}deg)` }} />
                  ))}
                </div>
              )}
              <span className="badge badge-gray">Preview · day 30</span>
              <div className="cr2-unlock-stage"><Honour state={lit ? "lit" : "off"} size={124} /></div>
              <h2>{lit ? "Highly active!" : "Day 30…"}</h2>
              <p style={{ fontWeight: 800, color: "var(--gink)" }}>30 days in a row · every sample delivered</p>
              <p>Every free sample is open to you now.</p>
              <div className="v2-stack" style={{ width: "100%", marginTop: 6 }}>
                <button type="button" className="np-btn" onClick={() => { setUnlock(false); setShare({ big: `Day ${CREATOR.streak} of 30`, label: "On my way to Highly active", lines: ["Posting every day", `${CREATOR.level} creator on Rezekii`], kicker: "Streak", moment: "streak" }); }}>
                  <Icon name="share" size={18} /> Share this moment
                </button>
                <button type="button" className="btn-outline" onClick={() => setUnlock(false)}>Continue</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} level={share.level} kicker={share.kicker} moment={share.moment} />}
    </div>
  );
}
