"use client";

import Link from "next/link";
import { useDemo, useWho } from "@/components/demo";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Emblem, type Level } from "@/components/emblems";
import { Emblem as StreakEmblem, TIERS as STREAK_TIERS, tierOf } from "@/components/missions-board";
import { Progress, ShareSheet, type MomentKind, Sheet } from "@/components/ui";
import { BADGES, CREATOR } from "@/lib/mock";
import { BADGE_INFO, LEVELS } from "@/lib/mock-creator2";
import { addDays, chestsFor, dayOf } from "@/modules/rewards/rules.ts";
import "@/app/rewards.css";

/** Each badge's sticker: icon and colours. */
const STICKER: Record<string, { icon: IconName; from: string; to: string }> = {
  "First Scan": { icon: "scan", from: "#25f4ee", to: "#00a8a0" },
  "Link Master": { icon: "link", from: "#8b7dff", to: "#5b4ee0" },
  "7-Day Streak": { icon: "flame", from: "#ffb35c", to: "#f05a00" },
  "Sample Star": { icon: "gift", from: "#ff7aa8", to: "#e8005a" },
  "First RM 1,000": { icon: "wallet", from: "#22dc95", to: "#00804f" },
  Silver: { icon: "medal", from: "#e9ecff", to: "#9097c4" },
  Gold: { icon: "trophy", from: "#ffe08a", to: "#c98510" },
};
const SPARK = ["#ffd34d", "#25f4ee", "#ff5ca8", "#22dc95", "#8b7dff", "#ffffff"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** A pointy-top hexagon path around (cx, cy). */
const hex = (cx: number, cy: number, rad: number) =>
  `M${[-90, -30, 30, 90, 150, 210].map((a) => `${(cx + rad * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(cy + rad * Math.sin((a * Math.PI) / 180)).toFixed(2)}`).join("L")}Z`;

/** A badge as an honour emblem (owner, 28 Oct 2026): a metal-rimmed hexagon in the badge's colours, its icon in the middle, and a shine. Grey and locked until earned. */
function BadgeEmblem({ name, got, size = 76 }: { name: string; got: boolean; size?: number }) {
  const s = STICKER[name] ?? { icon: "star" as IconName, from: "#ffe08a", to: "#e09a1a" };
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
type Real = {
  level: string; ttLevel: number | null; streak: number; best: number; countedToday: boolean; days: string[]; tiers: number[];
  since: string | null; levels: { name: string; how: string; gives: string[] }[]; badges: { name: string; got: boolean; progress?: [number, number] }[];
};

const monthOf = (day: string) => day.slice(0, 7);
const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthName = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The streak, inside Level, Streak & Badges (owner, 1 Nov 2026): current and best streak from her real check-in history, a month
 * calendar of counted days, what counts, the tier rewards and bonus chests, and how far the 7-Day Streak badge is.
 */
function StreakSection({ streak, best, countedToday, days, tiers, since, badgeGot }: { streak: number; best: number; countedToday: boolean; days: Set<string>; tiers: Set<number>; since: string | null; badgeGot: boolean }) {
  const today = dayOf(Date.now());
  const [month, setMonth] = useState(monthOf(today));
  const first = since ? monthOf(since) : [...days].sort()[0] ? monthOf([...days].sort()[0]) : month;
  const tier = tierOf(streak);
  const next = STREAK_TIERS.find((t) => t.days > streak) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
  const prev = tier?.days ?? 0;
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const inMonth = cells.filter((d) => days.has(d)).length;
  const chests = chestsFor(3);
  return (
    <section id="streak" className="v2-card lb-streak" aria-label="Your streak">
      <div className="v2-card-h">
        <h2 className="v2-h2">Streak</h2>
        <span className={`badge ${countedToday ? "" : "badge-amber"}`}>{countedToday ? "Today Counted" : "Not Counted Today"}</span>
      </div>
      <div className="mx-streak" style={{ ["--c1" as string]: tier?.c1 ?? "#f8c39b", ["--c2" as string]: tier?.c2 ?? "#b8642f" }}>
        <div className="mx-streak-top">
          <span className="mx-big-emblem">{tier ? <StreakEmblem tier={tier} size={74} /> : <StreakEmblem tier={STREAK_TIERS[0]} size={74} locked />}<b>{streak}</b></span>
          <span className="mx-streak-txt">
            <span className="mx-tiername">{tier ? `${tier.name} · ${tier.metal}` : "No Tier Yet"}</span>
            <strong>{streak}-day streak</strong>
            <small>Best: {best} day{best === 1 ? "" : "s"}</small>
          </span>
        </div>
        <div className="mx-next">
          <span><b>{Math.max(0, next.days - streak)} days</b> to {next.name} <em>+{next.bonus} bonus credits</em></span>
          <span className="mx-bar"><i style={{ width: `${Math.min(100, ((streak - prev) / Math.max(1, next.days - prev)) * 100)}%` }} /></span>
        </div>
      </div>

      <div className="lb-cal">
        <div className="lb-cal-h">
          <button type="button" className="v2-iconbtn" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="back" size={16} /></button>
          <span><b>{monthName(month)}</b><small>{inMonth} day{inMonth === 1 ? "" : "s"} counted</small></span>
          <button type="button" className="v2-iconbtn" aria-label="Next month" disabled={month >= monthOf(today)} onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="arrow" size={16} /></button>
        </div>
        <div className="lb-cal-grid" role="grid" aria-label={`Counted days in ${monthName(month)}`}>
          {WEEKDAYS.map((d, i) => <span key={`h${i}`} className="lb-cal-wd" aria-hidden="true">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} aria-hidden="true" />)}
          {cells.map((d) => {
            const on = days.has(d);
            const cls = on ? "on" : d === today ? "today" : d > today || (since && d < since) ? "off" : "miss";
            return (
              <span key={d} role="gridcell" className={`lb-cal-d ${cls}${d === today ? " is-today" : ""}`} aria-label={`${d}: ${on ? "counted" : d > today ? "still to come" : "not counted"}`}>
                {on ? <Icon name="flame" size={13} width={2.4} /> : Number(d.slice(8))}
              </span>
            );
          })}
        </div>
      </div>

      <div className="lb-st-grid">
        <div className="lb-st-box">
          <b>What Counts</b>
          <ul>
            <li><Icon name="check" size={14} width={3} />Check in on Missions, or finish any daily mission.</li>
            <li><Icon name="clock" size={14} />Before midnight, Malaysia time.</li>
            <li><Icon name="refresh" size={14} />A missed day starts the streak again.</li>
          </ul>
        </div>
        <div className="lb-st-box">
          <b>Bonus Chests</b>
          <p className="v2-small" style={{ margin: 0 }}>Finish a third, two thirds and all of a day&apos;s daily missions for +{chests[0].bonus}, +{chests[1].bonus} and +{chests[2].bonus} credits.</p>
          <Link href="/app/rewards" className="btn-outline v2-btn-sm" style={{ alignSelf: "flex-start" }}>Go to Missions <Icon name="arrow" size={14} /></Link>
        </div>
      </div>

      <div className="lb-st-box">
        <b>Streak Rewards</b>
        <span className="v2-small">Bonus credits the first time you reach each one.</span>
        <ol className="mx-tiers lb-tiers" aria-label="Streak tiers">
          {STREAK_TIERS.map((t) => {
            const got = tiers.has(t.days);
            return (
              <li key={t.days} className={got ? (tier?.days === t.days ? "now" : "got") : ""}>
                <StreakEmblem tier={t} size={30} locked={!got} />
                <b>{t.days}d</b>
                <small>+{t.bonus}</small>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="lb-st-box lb-st-badge">
        <BadgeEmblem name="7-Day Streak" got={badgeGot} size={52} />
        <span>
          <b>7-Day Streak Badge</b>
          <span className="v2-small">{badgeGot ? "Collected." : `Day ${Math.min(streak, 7)} of 7.`}</span>
          {!badgeGot && <Progress value={Math.min(streak, 7)} max={7} />}
        </span>
      </div>
    </section>
  );
}

/**
 * Level, Streak & Badges (in My account): a collectible creator card that tilts and sparkles, the Bronze → Silver → Gold path with
 * V1's emblems, her streak, and a sticker wall of badges. Everything can be shared as a card.
 */
export function LevelBadges() {
  const you = useWho();
  const card = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(0);
  const [pick, setPick] = useState(LEVELS.findIndex((l) => l.name === CREATOR.level));
  const [badge, setBadge] = useState<{ name: string; got: boolean } | null>(null);
  const [share, setShare] = useState<Share | null>(null);
  // Signed in (owner, 31 Oct 2026): her real level, TikTok Shop level, streak and badges.
  const { live } = useDemo();
  const [real, setReal] = useState<Real | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (live) fetch("/api/v2/badges", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => (d ? setReal(d) : setFailed(true))).catch(() => setFailed(true));
  }, [live]);
  const lvName = real ? real.level.charAt(0).toUpperCase() + real.level.slice(1) : CREATOR.level;
  const ttl = real ? real.ttLevel ?? "–" : CREATOR.tiktokLevel;
  const streakN = real ? real.streak : CREATOR.streak;
  const badges: { name: string; got: boolean; progress?: [number, number] }[] = real ? real.badges : BADGES;
  // Each level's real rule and benefits (set by Techwide in Admin) once signed in.
  const levels = real?.levels?.length ? real.levels : LEVELS;
  const since = real?.since ? new Date(real.since).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null;
  useEffect(() => { if (real) setPick(LEVELS.findIndex((l) => l.name === lvName)); }, [real]); // eslint-disable-line react-hooks/exhaustive-deps
  const got = badges.filter((b) => b.got).length;
  const levelAt = LEVELS.findIndex((l) => l.name === lvName);
  const mine = KEY[lvName];
  // The sample account's streak: the last days up to yesterday, so today still needs a check-in.
  const today = dayOf(Date.now());
  const sampleDays = Array.from({ length: CREATOR.streak }, (_, i) => addDays(today, -1 - i));

  // Opened from the Streak tile, the panel's 🔥 or Missions (#streak): scroll to the streak once it's on the page.
  useEffect(() => {
    if (live && !real) return;
    const toStreak = () => { if (window.location.hash === "#streak") requestAnimationFrame(() => document.getElementById("streak")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
    toStreak();
    window.addEventListener("hashchange", toStreak);
    return () => window.removeEventListener("hashchange", toStreak);
  }, [live, real]);

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

  if (live && !real) return <p className="v2-muted">{failed ? "Couldn't load your level, streak and badges. Please refresh." : "Loading your level, streak and badges…"}</p>;
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
            aria-label={`Creator card: ${you.handle}, ${lvName}, TikTok Shop Lv.${ttl}, ${got} badges`}
          >
            <span className="lb-holo" aria-hidden="true" />
            <span className="lb-glare" aria-hidden="true" />
            <span className="lb-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/master-logo-transparent.png" alt="" />
              <b>REZEKII CREATOR</b>
              {!real && <em>No. 0428</em>}
            </span>
            <Emblem level={mine} size={132} animate />
            <span className="lb-tier">{lvName.toUpperCase()}</span>
            <strong className="lb-name">{you.handle}</strong>
            <span className="lb-stats">
              <span><b>Lv.{ttl}</b>TikTok Shop</span>
              <span><b>{streakN}</b>day streak</span>
              <span><b>{got}</b>badges</span>
            </span>
            <span className="lb-foot">{real ? (since ? `Since ${since}` : "") : "Since Mar 2026 · rezekii.com/c/aisyah.glow"}</span>
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
          <h2 className="lb-h">You&apos;re {lvName}</h2>
          <p className="v2-muted" style={{ margin: 0 }}>Your level sets your commission rates.</p>
          <div className="lb-path" role="group" aria-label="Levels">
            {levels.map((l, i) => (
              <button key={l.name} type="button" className={`lb-stop ${i === pick ? "on" : ""} ${i <= levelAt ? "got" : ""}`} aria-pressed={i === pick} onClick={() => setPick(i)}>
                <Emblem level={KEY[l.name]} size={i === levelAt ? 74 : 60} animate={i === levelAt} dim={i > levelAt} />
                <b>{l.name}</b>
                {i === levelAt && <span className="badge">You</span>}
              </button>
            ))}
          </div>
          <div className="lb-perks" key={pick}>
            <small>{levels[pick].how}</small>
            <ul>
              {levels[pick].gives.map((g) => <li key={g}><Icon name="check" size={15} width={2.8} />{g}</li>)}
            </ul>
          </div>
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm" onClick={() => setShare({ big: `${lvName} creator`, label: "My creator level on Rezekii", lines: [`TikTok Shop Lv.${ttl}`, `${got} badges earned`], level: mine, kicker: "Level up", moment: "level" })}>
              <Icon name="share" size={16} /> Share My Card
            </button>
          </div>
        </div>
      </section>

      <StreakSection
        streak={streakN}
        best={real ? real.best : CREATOR.streak}
        countedToday={real ? real.countedToday : false}
        days={new Set(real ? real.days : sampleDays)}
        tiers={new Set(real ? real.tiers : STREAK_TIERS.filter((t) => t.days <= CREATOR.streak).map((t) => t.days))}
        since={real ? (real.since ? dayOf(real.since) : null) : null}
        badgeGot={badges.find((b) => b.name === "7-Day Streak")?.got ?? false}
      />

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Badges</h2>
          <span className="badge">{got} of {badges.length} collected</span>
        </div>
        <div className="lb-badges">
          {badges.map((b) => (
            <button key={b.name} type="button" className={`lb-badge ${b.got ? "got" : ""}`} onClick={() => setBadge(b)}>
              <BadgeEmblem name={b.name} got={b.got} />
              <b>{b.name}</b>
              <small>{b.got ? "Collected" : b.progress ? `${b.progress[0]} / ${b.progress[1]} days` : "Locked"}</small>
            </button>
          ))}
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
            <button type="button" className="np-btn" onClick={() => { setBadge(null); setShare({ big: badge.name, label: "New badge on Rezekii", lines: [`${lvName} creator`, `${got} badges so far`], kicker: "New badge", moment: "badge" }); }}>
              <Icon name="share" size={18} /> Share This Badge
            </button>
          ) : (
            <button type="button" className="btn-outline" style={{ height: 46 }} onClick={() => setBadge(null)}>Got It</button>
          )}
        </Sheet>
      )}

      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} level={share.level} kicker={share.kicker} moment={share.moment} />}
    </div>
  );
}
