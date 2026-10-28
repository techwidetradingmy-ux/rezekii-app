"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, ShareSheet, Sheet, Title } from "@/components/ui";
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

/** One mission: a general action with one button. `share` opens the share card; `ready` can be claimed now. */
export type Mission = { id: string; icon: IconName; title: string; reward: number; cta: string; href?: string; share?: boolean; progress?: [number, number]; state: "todo" | "ready" | "done"; left?: string; counts?: string };
type List = "daily" | "starter" | "milestone";
type Moment = { title: string; line: string; cheer: string; icon: "gift" | "trophy" | "flame"; share?: { big: string; label: string; lines: string[] } };

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
 * Missions for creators and sellers (owner, 28 Oct 2026): a streak worth celebrating, with honour tiers and bonus credits;
 * today's bar of daily credits with bonus chests; daily, once-only starter and (for sellers) milestone missions, each a general
 * action with one button. A day counts towards the streak when at least one daily mission is done; checking in counts.
 */
export function MissionsBoard(p: {
  daily: Mission[]; starter: Mission[]; milestones?: Mission[]; credits: number; streak: number; walletHref: string;
  sub: string; starterNote: string; handle?: string; children?: ReactNode;
}) {
  const { toast } = useDemo();
  const [credits, setCredits] = useState(p.credits);
  const [lists, setLists] = useState<Record<List, Mission[]>>({ daily: p.daily, starter: p.starter, milestone: p.milestones ?? [] });
  const [streak, setStreak] = useState(p.streak);
  const [checkedToday, setCheckedToday] = useState(false);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [share, setShare] = useState<Moment["share"] | null>(null);
  // A share mission waits here until the card really goes out to an app.
  const [sharing, setSharing] = useState<{ list: List; m: Mission } | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);

  const daily = lists.daily, starter = lists.starter;
  // Bonus chests after a third, two thirds and all of today's missions.
  const chests = [{ at: Math.ceil(daily.length / 3), bonus: 10 }, { at: Math.ceil((daily.length * 2) / 3), bonus: 20 }, { at: daily.length, bonus: 40 }];
  const tier = tierOf(streak);
  const next = TIERS.find((t) => t.days > streak) ?? TIERS[TIERS.length - 1];
  const prev = tier?.days ?? 0;
  const doneToday = daily.filter((m) => m.state === "done").length;
  const earnedToday = daily.filter((m) => m.state === "done").reduce((s, m) => s + m.reward, 0) + chests.filter((c) => doneToday >= c.at).reduce((s, c) => s + c.bonus, 0);
  const maxToday = daily.reduce((s, m) => s + m.reward, 0) + chests.reduce((s, c) => s + c.bonus, 0);
  const starterDone = starter.filter((m) => m.state === "done").length;
  const starterLeft = starter.filter((m) => m.state !== "done").reduce((s, m) => s + m.reward, 0);
  const streakCard = { big: `${streak} days`, label: "My streak on Rezekii", lines: [`${tier?.name ?? "Spark"} tier`, `${tier?.metal ?? "Bronze"} emblem`] };

  const finish = (list: List, m: Mission) => {
    setLists((all) => ({ ...all, [list]: all[list].map((x) => (x.id === m.id ? { ...x, state: "done" as const } : x)) }));
    let gain = m.reward;
    const chest = list === "daily" ? chests.find((c) => c.at === doneToday + 1) : undefined;
    if (chest) gain += chest.bonus;
    setCredits((n) => n + gain);
    // The first daily mission of the day keeps the streak going.
    if (list === "daily" && !checkedToday) {
      const days = streak + 1;
      setStreak(days);
      setCheckedToday(true);
      const reached = TIERS.find((t) => t.days === days);
      if (reached) setCredits((n) => n + reached.bonus);
      const t = reached ?? tier;
      if (m.share) return;
      setMoment({
        title: reached ? `${reached.name} unlocked!` : `${days}-day streak!`,
        line: `+${gain + (reached?.bonus ?? 0)} credits`,
        cheer: reached ? `${reached.metal} emblem earned: ${reached.bonus} bonus credits for showing up ${days} days in a row.` : `${next.days - days} more days to ${next.name}: +${next.bonus} bonus credits.`,
        icon: "flame",
        share: { big: `${days} days`, label: "My streak on Rezekii", lines: [`${t?.name ?? "Spark"} tier`, `${t?.metal ?? "Bronze"} emblem`] },
      });
      return;
    }
    if (m.share) return;
    if (chest) setMoment({ title: "Bonus chest opened", line: `+${gain} credits`, cheer: `${chest.at} daily missions done today.`, icon: "gift", share: { big: `${chest.at} missions`, label: "Done today", lines: [`${streak}-day streak`] } });
    else if (list === "starter" || list === "milestone") setMoment({ title: `+${m.reward} credits`, line: m.title, cheer: "Nice. One more step done.", icon: "trophy" });
    else toast(`+${m.reward} credits`);
  };

  const row = (list: List) => (m: Mission) => (
    <li key={m.id} className={`mx-row ${m.state}`}>
      <span className="mx-ico"><Icon name={m.state === "done" ? "check" : m.icon} size={18} width={m.state === "done" ? 3 : 1.9} /></span>
      <span className="mx-main">
        <b>{m.title}</b>
        {m.progress && m.state !== "done" && <span className="mx-mini"><span><i style={{ width: `${(m.progress[0] / m.progress[1]) * 100}%` }} /></span><small>{m.progress[0]}/{m.progress[1]}</small></span>}
        {m.state !== "done" && (m.counts || m.left) && <small>{[m.counts, m.left].filter(Boolean).join(" · ")}</small>}
      </span>
      <span className="mx-get">+{m.reward}</span>
      {m.state === "done" ? (
        <span className="mx-done"><Icon name="check" size={14} width={3} /> Done</span>
      ) : m.state === "ready" ? (
        <button type="button" className="np-btn v2-btn-sm" onClick={() => finish(list, m)}>{m.cta}</button>
      ) : m.share ? (
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setSharing({ list, m }); setShare(streakCard); }}>{m.cta}</button>
      ) : (
        <Link href={m.href!} className="btn-outline v2-btn-sm">{m.cta}</Link>
      )}
    </li>
  );
  const ordered = (l: Mission[]) => [...l.filter((m) => m.state !== "done"), ...l.filter((m) => m.state === "done")];

  return (
    <div className="v2-stack v2-in mx-page" style={{ gap: 18 }}>
      <Title title="Missions" sub={p.sub}>
        <Link href={p.walletHref} className="ms-pill"><Icon name="wallet" size={15} /> {credits.toLocaleString("en-MY")} credits</Link>
      </Title>


      <section className="v2-card mx-card mx-daily">
        <div className="v2-card-h">
          <h2 className="v2-h2">Daily missions</h2>
          <span className="v2-small">Resets at midnight</span>
        </div>
        {/* The streak sits on top of the missions that keep it; tap for the tiers. */}
        <button type="button" className="mx-strip" style={{ ["--c1" as string]: tier?.c1 ?? "#f8c39b", ["--c2" as string]: tier?.c2 ?? "#b8642f" }} onClick={() => setStreakOpen(true)} aria-label={`${streak}-day streak. See tiers`}>
          <span className="mx-strip-em">{tier ? <Emblem tier={tier} size={34} /> : <Emblem tier={TIERS[0]} size={34} locked />}<b>{streak}</b></span>
          <span className="mx-strip-txt">
            <b>{streak}-day streak</b>
            <small>{checkedToday ? "Today counted" : "Do 1 mission today to keep it"} · {Math.max(0, next.days - streak)} days to {next.name} +{next.bonus}</small>
          </span>
          <span className="mx-strip-week" aria-hidden="true">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <i key={i} className={i < 2 || (i === 2 && checkedToday) ? "on" : i === 2 ? "today" : ""} />)}
          </span>
          <Icon name="arrow" size={16} />
        </button>
        <p className="mx-rule"><Icon name="check" size={14} width={3} /> Credits come only when it really happens: a post that goes live, a request that&apos;s sent, a share that goes out.</p>
        <div className="mx-today">
          <span className="mx-today-h"><b>{earnedToday} / {maxToday} credits today</b><small>{doneToday} of {daily.length} done</small></span>
          <span className="mx-track">
            <i style={{ width: `${(doneToday / daily.length) * 100}%` }} />
            {chests.map((c) => <span key={c.at} className={`mx-chest${doneToday >= c.at ? " open" : ""}`} style={{ left: `${(c.at / daily.length) * 100}%` }} title={`+${c.bonus} bonus at ${c.at} missions`}><Icon name={doneToday >= c.at ? "check" : "gift"} size={13} width={2.4} /><small>+{c.bonus}</small></span>)}
          </span>
        </div>
        <ul className="mx-list">{daily.map(row("daily"))}</ul>
      </section>

      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Starter missions</h2>
          <span className="badge badge-amber">Once only · {p.starterNote}</span>
        </div>
        <div className="mx-today">
          <span className="mx-today-h"><b>{starterDone} of {starter.length} done</b><small>{starterLeft} credits left to earn</small></span>
          <span className="mx-track starter"><i style={{ width: `${(starterDone / starter.length) * 100}%` }} /></span>
        </div>
        <ul className="mx-list">{ordered(starter).map(row("starter"))}</ul>
      </section>

      {lists.milestone.length > 0 && (
        <section className="v2-card mx-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Milestones</h2>
            <span className="v2-small">No time limit</span>
          </div>
          <ul className="mx-list">{ordered(lists.milestone).map(row("milestone"))}</ul>
        </section>
      )}

      {p.children}

      {streakOpen && (
        <Sheet title="Your streak" onClose={() => setStreakOpen(false)}>
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
              <span><b>{Math.max(0, next.days - streak)} days</b> to {next.name} <em>+{next.bonus} bonus credits</em></span>
              <span className="mx-bar"><i style={{ width: `${Math.min(100, ((streak - prev) / Math.max(1, next.days - prev)) * 100)}%` }} /></span>
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
          <button type="button" className="btn-outline" onClick={() => { setStreakOpen(false); setShare(streakCard); }}><Icon name="share" size={16} /> Share my streak</button>
        </Sheet>
      )}
      {moment && (
        <Celebrate title={moment.title} line={moment.line} cheer={moment.cheer} icon={moment.icon} onClose={() => setMoment(null)} onShare={() => { setShare(moment.share ?? streakCard); setMoment(null); }} />
      )}
      {share && (
        <ShareSheet
          onClose={() => { setShare(null); setSharing(null); }}
          big={share.big}
          label={share.label}
          lines={share.lines}
          kicker="Missions"
          handle={p.handle}
          onShared={() => { if (sharing) { finish(sharing.list, sharing.m); setSharing(null); toast(`Shared. +${sharing.m.reward} credits`); } }}
        />
      )}
    </div>
  );
}
