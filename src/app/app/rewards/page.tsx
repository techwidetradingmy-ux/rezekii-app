"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, ShareSheet, Title } from "@/components/ui";
import { CREATOR } from "@/lib/mock";
import "@/app/rewards.css";

/** Streak tiers: each one an honour emblem in its own colour, with bonus credits when it's reached. */
const TIERS = [
  { days: 3, name: "Spark", metal: "Bronze", bonus: 20, c1: "#f8c39b", c2: "#b8642f" },
  { days: 7, name: "Flame", metal: "Silver", bonus: 50, c1: "#f1f4f8", c2: "#8593a6" },
  { days: 14, name: "Blaze", metal: "Gold", bonus: 100, c1: "#ffe38f", c2: "#cf9312" },
  { days: 30, name: "Inferno", metal: "Emerald", bonus: 300, c1: "#7dedbd", c2: "#008a55" },
  { days: 60, name: "Legend", metal: "Amethyst", bonus: 600, c1: "#c4b9ff", c2: "#5340d8" },
  { days: 100, name: "Mythic", metal: "Ruby", bonus: 1000, c1: "#ff9ccb", c2: "#d4004f" },
];
const tierOf = (d: number) => [...TIERS].reverse().find((t) => d >= t.days) ?? null;

type Mission = { id: string; icon: IconName; title: string; reward: number; cta: string; href?: string; progress?: [number, number]; state: "todo" | "ready" | "done"; left?: string };
/** Daily missions: general actions anywhere in Rezekii, reset at midnight. */
const DAILY: Mission[] = [
  { id: "d1", icon: "check", title: "Check in", reward: 5, cta: "Check in", state: "ready" },
  { id: "d2", icon: "video", title: "Post a video", reward: 20, cta: "Post", href: "/app/publish", state: "done" },
  { id: "d3", icon: "video", title: "Post 3 videos", reward: 30, cta: "Post", href: "/app/publish", progress: [2, 3], state: "todo" },
  { id: "d4", icon: "scan", title: "Run a scan", reward: 10, cta: "Claim", state: "ready" },
  { id: "d5", icon: "gift", title: "Request a free sample", reward: 15, cta: "Find one", href: "/app/market", state: "todo" },
  { id: "d6", icon: "share", title: "Share a proud moment", reward: 5, cta: "Share", state: "todo" },
];
/** Bonus chests along today's bar, after 2, 4 and all 6 daily missions. */
const CHESTS = [{ at: 2, bonus: 10 }, { at: 4, bonus: 20 }, { at: 6, bonus: 40 }];
/** Starter missions: once only, for the first 7 days after joining. */
const STARTER: Mission[] = [
  { id: "s1", icon: "user", title: "Fill in your profile", reward: 50, cta: "", state: "done" },
  { id: "s2", icon: "link", title: "Link TikTok Shop", reward: 100, cta: "", state: "done" },
  { id: "s3", icon: "video", title: "Link your TikTok account", reward: 50, cta: "", state: "done" },
  { id: "s4", icon: "share", title: "Connect Facebook, Instagram or Threads", reward: 30, cta: "Claim", state: "ready" },
  { id: "s5", icon: "whatsapp", title: "Verify your WhatsApp", reward: 30, cta: "Verify", href: "/app/account#profile", state: "todo", left: "5 days left" },
  { id: "s6", icon: "scan", title: "Run your first scan", reward: 50, cta: "Scan", href: "/app", state: "todo", left: "5 days left" },
  { id: "s7", icon: "trophy", title: "Finish your first collaboration", reward: 120, cta: "Find a sample", href: "/app/market", state: "todo", left: "5 days left" },
];
/** Coming later: brands pay for content. Examples so creators know it's on the way. */
const BRANDED = [
  { brand: "Seri Living MY", bg: "linear-gradient(135deg,#ffb35c,#f05a00)", title: "Kitchen hacks week", reward: "RM 50 a video", ends: "Opens Dec" },
  { brand: "Urban Basics MY", bg: "linear-gradient(135deg,#8b7dff,#5b4ee0)", title: "OOTD try-on challenge", reward: "RM 120 for 3 videos", ends: "Opens Dec" },
  { brand: "Bersih Pro", bg: "linear-gradient(135deg,#25f4ee,#00a8a0)", title: "Honest before & after", reward: "RM 30 at 20 sales", ends: "Opens Jan" },
];

/** A streak emblem: a shield in the tier's colours with a flame; grey and locked until reached. */
function Emblem({ tier, size = 44, locked = false }: { tier: (typeof TIERS)[number]; size?: number; locked?: boolean }) {
  const id = `mx-g-${tier.days}`;
  return (
    <svg className={`mx-emblem${locked ? " locked" : ""}`} width={size} height={size * 1.1} viewBox="0 0 40 44" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={locked ? "#e6ebf0" : tier.c1} />
          <stop offset="1" stopColor={locked ? "#aeb8c3" : tier.c2} />
        </linearGradient>
      </defs>
      <path d="M20 2 36 8v12c0 10-7 18-16 22C11 38 4 30 4 20V8z" fill={`url(#${id})`} stroke="#ffffff" strokeWidth="2.4" />
      <path d="M20 11c1.2 4.4 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.2 1.1-3.3 2.2-4.4 0 2.2 1.1 3.3 2.2 3.3-1.1-3.3 0-6.6 1.1-9.9z" fill="#ffffff" opacity={locked ? 0.6 : 0.95} />
    </svg>
  );
}

/**
 * Missions (owner, 28 Oct 2026): a streak worth celebrating, with honour tiers and bonus credits; today's bar of daily credits;
 * daily missions and once-only starter missions, each a general action with one button.
 */
export default function Missions() {
  const { toast } = useDemo();
  const [credits, setCredits] = useState(CREATOR.credits);
  const [daily, setDaily] = useState(DAILY);
  const [starter, setStarter] = useState(STARTER);
  const [streak, setStreak] = useState(CREATOR.streak);
  const [checkedToday, setCheckedToday] = useState(false);
  const [moment, setMoment] = useState<{ title: string; line: string; cheer: string; icon: "gift" | "trophy" | "flame"; share?: { big: string; label: string; lines: string[] } } | null>(null);
  const [share, setShare] = useState<{ big: string; label: string; lines: string[] } | null>(null);

  const tier = tierOf(streak);
  const next = TIERS.find((t) => t.days > streak)!;
  const prev = tier?.days ?? 0;
  const doneToday = daily.filter((m) => m.state === "done").length;
  const earnedToday = daily.filter((m) => m.state === "done").reduce((s, m) => s + m.reward, 0) + CHESTS.filter((c) => doneToday >= c.at).reduce((s, c) => s + c.bonus, 0);
  const maxToday = daily.reduce((s, m) => s + m.reward, 0) + CHESTS.reduce((s, c) => s + c.bonus, 0);
  const starterDone = starter.filter((m) => m.state === "done").length;
  const starterLeft = starter.filter((m) => m.state !== "done").reduce((s, m) => s + m.reward, 0);

  const finish = (list: "daily" | "starter", m: Mission) => {
    const set = list === "daily" ? setDaily : setStarter;
    set((all) => all.map((x) => (x.id === m.id ? { ...x, state: "done" } : x)));
    let gain = m.reward;
    const chest = list === "daily" ? CHESTS.find((c) => c.at === doneToday + 1) : undefined;
    if (chest) gain += chest.bonus;
    setCredits((n) => n + gain);
    // The first daily mission of the day keeps the streak going.
    if (list === "daily" && !checkedToday) {
      const days = streak + 1;
      setStreak(days);
      setCheckedToday(true);
      const reached = TIERS.find((t) => t.days === days);
      if (reached) setCredits((n) => n + reached.bonus);
      setMoment({
        title: reached ? `${reached.name} unlocked!` : `${days}-day streak!`,
        line: reached ? `+${m.reward + reached.bonus} credits` : `+${gain} credits`,
        cheer: reached ? `${reached.metal} emblem earned. ${reached.bonus} bonus credits for showing up ${days} days in a row.` : `${next.days - days} more days to ${next.name}: +${next.bonus} bonus credits.`,
        icon: "flame",
        share: { big: `${days} days`, label: "My streak on Rezekii", lines: [`${(reached ?? tier)?.name ?? "Spark"} tier`, `${(reached ?? tier)?.metal ?? "Bronze"} emblem`] },
      });
      return;
    }
    if (chest) setMoment({ title: "Bonus chest opened", line: `+${chest.bonus} credits`, cheer: `${chest.at} daily missions done today.`, icon: "gift", share: { big: `${chest.at} missions`, label: "Done today", lines: [`${streak}-day streak`] } });
    else toast(`+${m.reward} credits`);
  };

  const row = (list: "daily" | "starter") => (m: Mission) => (
    <li key={m.id} className={`mx-row ${m.state}`}>
      <span className="mx-ico"><Icon name={m.state === "done" ? "check" : m.icon} size={18} width={m.state === "done" ? 3 : 1.9} /></span>
      <span className="mx-main">
        <b>{m.title}</b>
        {m.progress && m.state !== "done" && <span className="mx-mini"><span><i style={{ width: `${(m.progress[0] / m.progress[1]) * 100}%` }} /></span><small>{m.progress[0]}/{m.progress[1]}</small></span>}
        {m.left && m.state !== "done" && <small>{m.left}</small>}
      </span>
      <span className="mx-get">+{m.reward}</span>
      {m.state === "done" ? (
        <span className="mx-done">Done</span>
      ) : m.state === "ready" ? (
        <button type="button" className="np-btn v2-btn-sm" onClick={() => finish(list, m)}>{m.cta}</button>
      ) : m.id === "d6" ? (
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setShare({ big: `${streak} days`, label: "My streak on Rezekii", lines: [`${tier?.name ?? "Spark"} tier`] }); finish(list, m); }}>{m.cta}</button>
      ) : (
        <Link href={m.href!} className="btn-outline v2-btn-sm">{m.cta}</Link>
      )}
    </li>
  );

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Missions" sub="Earn credits. Spend them on AI tools.">
        <Link href="/app/account#wallet" className="ms-pill"><Icon name="wallet" size={15} /> {credits.toLocaleString("en-MY")} credits</Link>
      </Title>

      <section className="mx-streak" style={{ ["--c1" as string]: tier?.c1 ?? "#f8c39b", ["--c2" as string]: tier?.c2 ?? "#b8642f" }} aria-label="Your streak">
        <div className="mx-streak-top">
          <span className="mx-big-emblem">{tier ? <Emblem tier={tier} size={74} /> : <Emblem tier={TIERS[0]} size={74} locked />}<b>{streak}</b></span>
          <span className="mx-streak-txt">
            <span className="mx-tiername">{tier ? `${tier.name} · ${tier.metal}` : "No tier yet"}</span>
            <strong>{streak}-day streak</strong>
            <small>{checkedToday ? "Today counted. See you tomorrow!" : "Do 1 daily mission today to keep it."}</small>
          </span>
        </div>
        <div className="mx-week" aria-label="This week">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
            const state = i < 2 ? "on" : i === 2 ? (checkedToday ? "on today" : "today") : "";
            return <span key={i} className={`mx-wd ${state}`}><i>{state.startsWith("on") ? <Icon name="check" size={15} width={3} /> : state === "today" ? <Icon name="flame" size={16} width={2.2} /> : null}</i>{d}</span>;
          })}
        </div>
        <div className="mx-next">
          <span><b>{next.days - streak} days</b> to {next.name} <em>+{next.bonus} bonus credits</em></span>
          <span className="mx-bar"><i style={{ width: `${((streak - prev) / (next.days - prev)) * 100}%` }} /></span>
        </div>
        <ol className="mx-tiers" aria-label="Streak tiers">
          {TIERS.map((t) => (
            <li key={t.days} className={streak >= t.days ? (tier?.days === t.days ? "now" : "got") : ""}>
              <Emblem tier={t} size={30} locked={streak < t.days} />
              <b>{t.days}d</b>
              <small>+{t.bonus}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Daily missions</h2>
          <span className="v2-small">Resets at midnight</span>
        </div>
        <div className="mx-today">
          <span className="mx-today-h"><b>{earnedToday} / {maxToday} credits today</b><small>{doneToday} of {daily.length} done</small></span>
          <span className="mx-track">
            <i style={{ width: `${(doneToday / daily.length) * 100}%` }} />
            {CHESTS.map((c) => <span key={c.at} className={`mx-chest${doneToday >= c.at ? " open" : ""}`} style={{ left: `${(c.at / daily.length) * 100}%` }} title={`+${c.bonus} bonus at ${c.at} missions`}><Icon name={doneToday >= c.at ? "check" : "gift"} size={13} width={2.4} /><small>+{c.bonus}</small></span>)}
          </span>
        </div>
        <ul className="mx-list">{daily.map(row("daily"))}</ul>
      </section>

      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Starter missions</h2>
          <span className="badge badge-amber">Once only</span>
        </div>
        <div className="mx-today">
          <span className="mx-today-h"><b>{starterDone} of {starter.length} done</b><small>{starterLeft} credits left to earn</small></span>
          <span className="mx-track starter"><i style={{ width: `${(starterDone / starter.length) * 100}%` }} /></span>
        </div>
        <ul className="mx-list">{[...starter.filter((m) => m.state !== "done"), ...starter.filter((m) => m.state === "done")].map(row("starter"))}</ul>
      </section>

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

      {moment && (
        <Celebrate title={moment.title} line={moment.line} cheer={moment.cheer} icon={moment.icon} onClose={() => setMoment(null)} onShare={moment.share ? () => { setShare(moment.share!); setMoment(null); } : undefined} />
      )}
      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} kicker="Missions" />}
    </div>
  );
}
