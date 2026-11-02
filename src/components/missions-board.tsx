"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, ShareSheet, Sheet, Title, withParts, type MomentKind } from "@/components/ui";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx } from "@/lib/i18n/lang";
import "@/app/rewards.css";

/**
 * Streak tiers: each one an honour emblem in its own colour, with bonus credits when it's reached (100 at most, owner 3 Nov 2026).
 * Names are English here and show in her language (t(tier.name), t(tier.metal)).
 */
export const TIERS = [
  { days: 3, name: tx("Spark"), metal: tx("Bronze"), bonus: 20, c1: "#f8c39b", c2: "#b8642f" },
  { days: 7, name: tx("Flame"), metal: tx("Silver"), bonus: 50, c1: "#f1f4f8", c2: "#8593a6" },
  { days: 14, name: tx("Blaze"), metal: tx("Gold"), bonus: 100, c1: "#ffe38f", c2: "#cf9312" },
  { days: 30, name: tx("Inferno"), metal: tx("Emerald"), bonus: 100, c1: "#7dedbd", c2: "#008a55" },
  { days: 60, name: tx("Legend"), metal: tx("Amethyst"), bonus: 100, c1: "#c4b9ff", c2: "#5340d8" },
  { days: 100, name: tx("Mythic"), metal: tx("Ruby"), bonus: 100, c1: "#ff9ccb", c2: "#d4004f" },
];
export const tierOf = (d: number) => [...TIERS].reverse().find((x) => d >= x.days) ?? null;

/**
 * One mission: a general action with one button. `share` opens the share card; `ready` can be claimed now. Its words (title,
 * cta, counts, left) are English and show in her language on the board.
 */
export type Mission = { id: string; icon: IconName; title: string; reward: number; cta: string; href?: string; share?: boolean; progress?: [number, number]; state: "todo" | "ready" | "done"; left?: string; counts?: string };
type List = "daily" | "starter" | "milestone";
/** What a real claim sends back (owner, 31 Oct 2026): the board after it, and what it paid. */
export type ClaimResult = {
  lists: { daily: Mission[]; starter: Mission[]; milestones: Mission[] };
  credits: number; streak: number; countedToday: boolean; week: { on: boolean[]; today: number };
  gained: number; chest: number | null; tier: { days: number; bonus: number } | null;
};
type Moment = { title: string; line: string; cheer: string; icon: "gift" | "trophy" | "flame"; share?: { big: string; label: string; lines: string[]; moment: MomentKind } };

/** A streak emblem: a shield in the tier's colours with a flame; grey and locked until reached. */
export function Emblem({ tier, size = 44, locked = false }: { tier: (typeof TIERS)[number]; size?: number; locked?: boolean }) {
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
  /** Real accounts: this week's counted days, whether today counts yet, and the claim that pays on the server. */
  week?: { on: boolean[]; today: number }; countedToday?: boolean; onClaim?: (m: Mission) => Promise<ClaimResult>;
  /** Creators: the streak strip opens the Streak section in Level, Streak & Badges (owner, 1 Nov 2026). */
  streakHref?: string;
}) {
  const { toast } = useDemo();
  // Every word on the board in her language (owner, 3 Nov 2026).
  const t = useT();
  const lang = useLang();
  const [week, setWeek] = useState(p.week);
  const [busy, setBusy] = useState<string | null>(null);
  const [credits, setCredits] = useState(p.credits);
  const [lists, setLists] = useState<Record<List, Mission[]>>({ daily: p.daily, starter: p.starter, milestone: p.milestones ?? [] });
  const [streak, setStreak] = useState(p.streak);
  const [checkedToday, setCheckedToday] = useState(p.countedToday ?? false);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [share, setShare] = useState<Moment["share"] | null>(null);
  // A share mission waits here until the card really goes out to an app.
  const [sharing, setSharing] = useState<{ list: List; m: Mission } | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);

  /** "1 day", "12 days". */
  const dayCount = (n: number) => (n === 1 ? t("{n} day", { n }) : t("{n} days", { n }));
  /** "3 days to Flame: +50 credits." */
  const toNext = (left: number, tier: (typeof TIERS)[number]) => (left === 1 ? t("{n} day to {tier}: +{bonus} credits.", { n: left, tier: t(tier.name), bonus: tier.bonus }) : t("{n} days to {tier}: +{bonus} credits.", { n: left, tier: t(tier.name), bonus: tier.bonus }));
  /** The two chips on a streak card: its tier and its emblem. */
  const tierLines = (tier: (typeof TIERS)[number] | null) => [t("{tier} tier", { tier: t(tier?.name ?? "Spark") }), t("{metal} emblem", { metal: t(tier?.metal ?? "Bronze") })];
  /** M T W T F S S, Monday first, in her language. */
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 2 + i)).toLocaleDateString(dateLocale(lang), { weekday: "narrow", timeZone: "UTC" }));

  const daily = lists.daily, starter = lists.starter;
  // Bonus chests after a third, two thirds and all of today's missions.
  const chests = [{ at: Math.ceil(daily.length / 3), bonus: 10 }, { at: Math.ceil((daily.length * 2) / 3), bonus: 20 }, { at: daily.length, bonus: 40 }];
  const tier = tierOf(streak);
  const next = TIERS.find((x) => x.days > streak) ?? TIERS[TIERS.length - 1];
  const prev = tier?.days ?? 0;
  const toGo = Math.max(0, next.days - streak);
  const doneToday = daily.filter((m) => m.state === "done").length;
  const earnedToday = daily.filter((m) => m.state === "done").reduce((s, m) => s + m.reward, 0) + chests.filter((c) => doneToday >= c.at).reduce((s, c) => s + c.bonus, 0);
  const maxToday = daily.reduce((s, m) => s + m.reward, 0) + chests.reduce((s, c) => s + c.bonus, 0);
  const starterDone = starter.filter((m) => m.state === "done").length;
  const starterLeft = starter.filter((m) => m.state !== "done").reduce((s, m) => s + m.reward, 0);
  const streakCard = { big: dayCount(streak), label: t("My streak on Rezekii"), lines: tierLines(tier), moment: "streak" as const };

  // A real claim: the server checks the action happened, pays once, and sends the board back.
  const claimLive = async (m: Mission) => {
    if (!p.onClaim || busy) return;
    setBusy(m.id);
    try {
      const r = await p.onClaim(m);
      setLists({ daily: r.lists.daily, starter: r.lists.starter, milestone: r.lists.milestones });
      setCredits(r.credits);
      setWeek(r.week);
      const newDay = r.countedToday && !checkedToday;
      setCheckedToday(r.countedToday);
      setStreak(r.streak);
      if (!r.gained) return;
      if (m.share) {
        toast(t("Shared. +{n} credits", { n: r.gained }));
        return;
      }
      const hit = r.tier ? TIERS.find((x) => x.days === r.tier!.days) : null;
      const now = tierOf(r.streak);
      if (newDay)
        setMoment({
          title: hit ? t("{tier} unlocked!", { tier: t(hit.name) }) : t("{n}-day streak!", { n: r.streak }),
          line: t("+{n} credits", { n: r.gained }),
          cheer: hit ? t("{metal} emblem. +{n} bonus credits.", { metal: t(hit.metal), n: hit.bonus }) : (() => { const n = TIERS.find((x) => x.days > r.streak) ?? TIERS[TIERS.length - 1]; return toNext(Math.max(0, n.days - r.streak), n); })(),
          icon: "flame",
          share: { big: dayCount(r.streak), label: t("My streak on Rezekii"), lines: tierLines(now), moment: "streak" },
        });
      else if (r.chest) setMoment({ title: t("Bonus chest opened"), line: t("+{n} credits", { n: r.gained }), cheer: t("Daily missions done today."), icon: "gift", share: { big: `+${r.gained}`, label: t("Done today"), lines: [t("{n}-day streak", { n: r.streak })], moment: "mission" } });
      else if (r.lists.daily.some((x) => x.id === m.id)) toast(t("+{n} credits", { n: r.gained }));
      else setMoment({ title: t("+{n} credits", { n: r.gained }), line: t(m.title), cheer: t("Nice work."), icon: "trophy" });
    } catch (e) {
      toast(e instanceof Error ? t(e.message) : t("Didn't go through. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const finish = (list: List, m: Mission) => {
    if (p.onClaim) {
      void claimLive(m);
      return;
    }
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
      const reached = TIERS.find((x) => x.days === days);
      if (reached) setCredits((n) => n + reached.bonus);
      const hit = reached ?? tier;
      if (m.share) return;
      setMoment({
        title: reached ? t("{tier} unlocked!", { tier: t(reached.name) }) : t("{n}-day streak!", { n: days }),
        line: t("+{n} credits", { n: gain + (reached?.bonus ?? 0) }),
        cheer: reached ? t("{metal} emblem. +{n} bonus credits.", { metal: t(reached.metal), n: reached.bonus }) : toNext(next.days - days, next),
        icon: "flame",
        share: { big: dayCount(days), label: t("My streak on Rezekii"), lines: tierLines(hit), moment: "streak" },
      });
      return;
    }
    if (m.share) return;
    if (chest) setMoment({ title: t("Bonus chest opened"), line: t("+{n} credits", { n: gain }), cheer: chest.at === 1 ? t("{n} daily mission done today.", { n: chest.at }) : t("{n} daily missions done today.", { n: chest.at }), icon: "gift", share: { big: chest.at === 1 ? t("{n} mission", { n: chest.at }) : t("{n} missions", { n: chest.at }), label: t("Done today"), lines: [t("{n}-day streak", { n: streak })], moment: "mission" } });
    else if (list === "starter" || list === "milestone") setMoment({ title: t("+{n} credits", { n: m.reward }), line: t(m.title), cheer: t("Nice work."), icon: "trophy" });
    else toast(t("+{n} credits", { n: m.reward }));
  };

  const row = (list: List) => (m: Mission) => (
    <li key={m.id} className={`mx-row ${m.state}`}>
      <span className="mx-ico"><Icon name={m.state === "done" ? "check" : m.icon} size={18} width={m.state === "done" ? 3 : 1.9} /></span>
      <span className="mx-main">
        <b>{t(m.title)}</b>
        {m.progress && m.state !== "done" && <span className="mx-mini"><span><i style={{ width: `${(m.progress[0] / m.progress[1]) * 100}%` }} /></span><small>{m.progress[0]}/{m.progress[1]}</small></span>}
        {m.state !== "done" && (m.counts || m.left) && <small>{[m.counts, m.left].filter((x): x is string => !!x).map((x) => t(x)).join(" · ")}</small>}
      </span>
      <span className="mx-get">+{m.reward}</span>
      {m.state === "done" ? (
        <span className="mx-done"><Icon name="check" size={14} width={3} /> {t("Done")}</span>
      ) : m.state === "ready" ? (
        <button type="button" className="np-btn v2-btn-sm" disabled={busy === m.id} onClick={() => finish(list, m)}>{busy === m.id ? "…" : t(m.cta)}</button>
      ) : m.share ? (
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setSharing({ list, m }); setShare(streakCard); }}>{t(m.cta)}</button>
      ) : m.href ? (
        <Link href={m.href} className="btn-outline v2-btn-sm">{t(m.cta)}</Link>
      ) : null}
    </li>
  );
  // The streak strip on top of the daily missions that keep it.
  const stripLook = { ["--c1" as string]: tier?.c1 ?? "#f8c39b", ["--c2" as string]: tier?.c2 ?? "#b8642f" };
  const strip = (
    <>
      <span className="mx-strip-em">{tier ? <Emblem tier={tier} size={34} /> : <Emblem tier={TIERS[0]} size={34} locked />}<b>{streak}</b></span>
      <span className="mx-strip-txt">
        <b>{t("{n}-day streak", { n: streak })}</b>
        <small>{checkedToday ? t("Today counted") : t("Check in or finish a mission today to keep it")} · {toGo === 1 ? t("{n} day to {tier} +{bonus}", { n: toGo, tier: t(next.name), bonus: next.bonus }) : t("{n} days to {tier} +{bonus}", { n: toGo, tier: t(next.name), bonus: next.bonus })}</small>
      </span>
      <span className="mx-strip-week" aria-hidden="true">
        {weekDays.map((d, i) => <i key={i} className={week ? (week.on[i] ? "on" : i === week.today ? "today" : "") : i < 2 || (i === 2 && checkedToday) ? "on" : i === 2 ? "today" : ""} />)}
      </span>
      <Icon name="arrow" size={16} />
    </>
  );
  // Claimable first, then still to do, then done at the bottom (owner, 1 Nov 2026), in every list.
  const RANK_STATE = { ready: 0, todo: 1, done: 2 } as const;
  const ordered = (l: Mission[]) => l.map((m, i) => [m, i] as const).sort((a, b) => RANK_STATE[a[0].state] - RANK_STATE[b[0].state] || a[1] - b[1]).map(([m]) => m);

  return (
    <div className="v2-stack v2-in mx-page" style={{ gap: 18 }}>
      <Title title={t("Missions")} sub={p.sub}>
        <Link href={p.walletHref} className="ms-pill"><Icon name="wallet" size={15} /> {t("{n} credits", { n: credits.toLocaleString("en-MY") })}</Link>
      </Title>


      <section className="v2-card mx-card mx-daily">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("Daily Missions")}</h2>
          <span className="v2-small">{t("Resets at midnight")}</span>
        </div>
        {/* The streak sits on top of the missions that keep it; tap for the tiers. */}
        {/* Creators open the Streak section in Level, Streak & Badges (owner, 1 Nov 2026); sellers get the tiers in a sheet. */}
        {p.streakHref
          ? <Link href={p.streakHref} className="mx-strip" style={stripLook} aria-label={t("{n}-day streak. See your streak", { n: streak })}>{strip}</Link>
          : <button type="button" className="mx-strip" style={stripLook} onClick={() => setStreakOpen(true)} aria-label={t("{n}-day streak. See tiers", { n: streak })}>{strip}</button>}
        <p className="mx-rule"><Icon name="check" size={14} width={3} /> {t("Credits come only once the action is done.")}</p>
        <div className="mx-today">
          <span className="mx-today-h"><b>{t("{earned} / {max} credits today", { earned: earnedToday, max: maxToday })}</b><small>{t("{done} of {n} done", { done: doneToday, n: daily.length })}</small></span>
          <span className="mx-track">
            <i style={{ width: `${(doneToday / daily.length) * 100}%` }} />
            {chests.map((c) => <span key={c.at} className={`mx-chest${doneToday >= c.at ? " open" : ""}`} style={{ left: `${(c.at / daily.length) * 100}%` }} title={c.at === 1 ? t("+{bonus} bonus at {n} mission", { bonus: c.bonus, n: c.at }) : t("+{bonus} bonus at {n} missions", { bonus: c.bonus, n: c.at })}><Icon name={doneToday >= c.at ? "check" : "gift"} size={13} width={2.4} /><small>+{c.bonus}</small></span>)}
          </span>
        </div>
        <ul className="mx-list">{ordered(daily).map(row("daily"))}</ul>
      </section>

      {starter.length > 0 && (
      <section className="v2-card mx-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("Starter Missions")}</h2>
          <span className="badge badge-amber">{t("Once only · {note}", { note: p.starterNote })}</span>
        </div>
        <div className="mx-today">
          <span className="mx-today-h"><b>{t("{done} of {n} done", { done: starterDone, n: starter.length })}</b><small>{t("{n} credits left", { n: starterLeft })}</small></span>
          <span className="mx-track starter"><i style={{ width: `${(starterDone / starter.length) * 100}%` }} /></span>
        </div>
        <ul className="mx-list">{ordered(starter).map(row("starter"))}</ul>
      </section>
      )}

      {lists.milestone.length > 0 && (
        <section className="v2-card mx-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">{t("Milestones")}</h2>
            <span className="v2-small">{t("No time limit")}</span>
          </div>
          <ul className="mx-list">{ordered(lists.milestone).map(row("milestone"))}</ul>
        </section>
      )}

      {p.children}

      {streakOpen && (
        <Sheet title={t("Your Streak")} onClose={() => setStreakOpen(false)}>
          <section className="mx-streak" style={{ ["--c1" as string]: tier?.c1 ?? "#f8c39b", ["--c2" as string]: tier?.c2 ?? "#b8642f" }} aria-label={t("Your streak")}>
            <div className="mx-streak-top">
              <span className="mx-big-emblem">{tier ? <Emblem tier={tier} size={74} /> : <Emblem tier={TIERS[0]} size={74} locked />}<b>{streak}</b></span>
              <span className="mx-streak-txt">
                <span className="mx-tiername">{tier ? `${t(tier.name)} · ${t(tier.metal)}` : t("No tier yet")}</span>
                <strong>{t("{n}-day streak", { n: streak })}</strong>
                <small>{checkedToday ? t("Today counted.") : t("Check in or finish any daily mission today to keep it.")}</small>
              </span>
            </div>
            <div className="mx-week" aria-label={t("This week")}>
              {weekDays.map((d, i) => {
                const state = week
                  ? week.on[i] ? (i === week.today ? "on today" : "on") : i === week.today ? "today" : ""
                  : i < 2 ? "on" : i === 2 ? (checkedToday ? "on today" : "today") : "";
                return <span key={i} className={`mx-wd ${state}`}><i>{state.startsWith("on") ? <Icon name="check" size={15} width={3} /> : state === "today" ? <Icon name="flame" size={16} width={2.2} /> : null}</i>{d}</span>;
              })}
            </div>
            <div className="mx-next">
              <span>{withParts(t("{days} to {tier} {bonus}"), { days: <b>{dayCount(toGo)}</b>, tier: t(next.name), bonus: <em>{t("+{n} bonus credits", { n: next.bonus })}</em> })}</span>
              <span className="mx-bar"><i style={{ width: `${Math.min(100, ((streak - prev) / Math.max(1, next.days - prev)) * 100)}%` }} /></span>
            </div>
            <ol className="mx-tiers" aria-label={t("Streak tiers")}>
              {TIERS.map((x) => (
                <li key={x.days} className={streak >= x.days ? (tier?.days === x.days ? "now" : "got") : ""}>
                  <Emblem tier={x} size={30} locked={streak < x.days} />
                  <b>{t("{n}d", { n: x.days })}</b>
                  <small>+{x.bonus}</small>
                </li>
              ))}
            </ol>
          </section>
          <button type="button" className="btn-outline" onClick={() => { setStreakOpen(false); setShare(streakCard); }}><Icon name="share" size={16} /> {t("Share My Streak")}</button>
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
          kicker={t("Missions")}
          moment={share.moment}
          handle={p.handle}
          onShared={() => { if (sharing) { finish(sharing.list, sharing.m); setSharing(null); if (!p.onClaim) toast(t("Shared. +{n} credits", { n: sharing.m.reward })); } }}
        />
      )}
    </div>
  );
}
