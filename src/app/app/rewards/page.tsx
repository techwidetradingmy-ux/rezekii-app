"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Celebrate, Progress, ShareSheet, Title } from "@/components/ui";
import { Honour, ShareButton } from "@/components/creator2/bits";
import { BADGES, CREATOR, MISSIONS } from "@/lib/mock";
import "@/app/creator2.css";

const CHESTS = [
  { at: 1, reward: 10 },
  { at: 3, reward: 20 },
  { at: 5, reward: 20 },
];
const WEEK = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
const GO: Record<string, string> = { m2: "/app/account", m6: "/app/opportunities" };

type Moment = { title: string; line: string; cheer: string; icon: "gift" | "trophy"; share: { big: string; label: string; lines: string[] } };

/** Missions as a game: streak on top, today's chests, newbie missions with a countdown, then milestones. */
export default function RewardsMissions() {
  const daily = MISSIONS.find((m) => m.kind === "daily")!;
  const newbie = MISSIONS.filter((m) => m.kind === "newbie");
  const milestones = MISSIONS.filter((m) => m.kind === "milestone");
  const posts = daily.progress;

  const [credits, setCredits] = useState(CREATOR.credits);
  const [opened, setOpened] = useState<number[]>([]);
  const [claimed, setClaimed] = useState<string[]>(["m1", "m3", "m4"]);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [share, setShare] = useState<Moment["share"] | null>(null);

  const doneNewbie = newbie.filter((m) => m.done).length;
  const left = 30 - CREATOR.streak;
  const nextChest = CHESTS.find((c) => c.at > posts);
  const fill = posts >= 5 ? 1 : posts <= 1 ? 0 : posts <= 3 ? ((posts - 1) / 2) * 0.5 : 0.5 + ((posts - 3) / 2) * 0.5;

  const openChest = (i: number) => {
    const c = CHESTS[i];
    setOpened((o) => [...o, i]);
    setCredits((n) => n + c.reward);
    const more = nextChest ? nextChest.at - posts : 0;
    setMoment({
      title: `Chest ${i + 1} opened`,
      line: `+${c.reward} credits`,
      cheer: nextChest ? `Post ${more} more today to open the next chest (+${nextChest.reward} credits).` : "All 3 chests open today. Come back tomorrow for new ones.",
      icon: "gift",
      share: { big: `${posts} videos`, label: "Today I posted", lines: [`Chest ${i + 1} opened`, `${CREATOR.streak} days in a row`] },
    });
  };

  const claim = (id: string) => {
    const m = MISSIONS.find((x) => x.id === id)!;
    setClaimed((c) => [...c, id]);
    setCredits((n) => n + m.reward);
    const todo = newbie.filter((x) => !x.done);
    setMoment({
      title: "Mission complete",
      line: `+${m.reward} credits`,
      cheer: todo.length
        ? `${todo.length} newbie missions left: ${todo.map((x) => x.title.toLowerCase()).join(" and ")}. Finish within 5 days 12 hours for the full reward.`
        : "Every newbie mission done. Keep your streak going.",
      icon: "trophy",
      share: { big: `${doneNewbie} of 6`, label: "Newbie missions done", lines: [`Just done: ${m.title.toLowerCase()}`, `${CREATOR.streak} days in a row`] },
    });
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Missions" sub="Real posts earn credits. Chests reset at midnight, Malaysia time.">
        <span className="cr2-titleacts">
          <Link href="/app/rewards/wallet" className="cr2-credits"><Icon name="wallet" size={16} /> {credits.toLocaleString("en-MY")} credits</Link>
          <ShareButton big={`${CREATOR.streak} days`} label="My posting streak" lines={["in a row, every day", `${CREATOR.activity} creator on Rezekii`]} />
        </span>
      </Title>

      <section className="cr2-streak" aria-label="Posting streak">
        <div className="cr2-streak-top">
          <span className="cr2-flame"><Icon name="flame" size={34} width={2.2} /></span>
          <div>
            <h2>{CREATOR.streak} days in a row</h2>
            <p>You&apos;re {CREATOR.activity}. Any video you post counts toward your streak.</p>
          </div>
        </div>
        <div className="v2-days" aria-label="Last 7 days">
          {WEEK.map((d, i) => (
            <span key={d} className={`${i >= 7 - CREATOR.streak ? "on" : ""} ${i === 6 ? "today" : ""}`}>{i === 6 ? "Today" : d}</span>
          ))}
        </div>
        <Link href="/app/rewards/level" className="cr2-streak-goal">
          <Honour state="off" size={46} />
          <span>
            {left} more days to Highly active: honour badge + designated samples
            <Progress value={CREATOR.streak} max={30} />
          </span>
          <Icon name="arrow" size={18} />
        </Link>
      </section>

      <div className="v2-grid2">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Today&apos;s mission</h2>
            <span className="badge">{posts} of 5 posts</span>
          </div>
          <span className="v2-muted">Post a video with a Techwide product in the cart. One video posted to several platforms counts once.</span>
          <div className="cr2-chests">
            <div className="v2-tiers">
              <i style={{ width: `calc((100% - 32px) * ${fill})` }} />
              {CHESTS.map((c, i) => {
                const reached = posts >= c.at;
                const isOpen = opened.includes(i);
                const ready = reached && !isOpen;
                return (
                  <button
                    key={c.at}
                    type="button"
                    className={`v2-chest ${isOpen ? "on" : ready ? "ready" : ""}`}
                    aria-label={ready ? `Open chest ${i + 1}` : isOpen ? `Chest ${i + 1} opened` : `Chest ${i + 1}: post ${c.at}`}
                    onClick={() => ready && openChest(i)}
                    style={{ cursor: ready ? "pointer" : "default" }}
                  >
                    {isOpen ? <Icon name="check" size={18} width={3} /> : <Icon name="gift" size={20} />}
                  </button>
                );
              })}
            </div>
            <div className="cr2-chestlbl">
              {CHESTS.map((c) => (
                <span key={c.at}><b>{c.at} post{c.at > 1 ? "s" : ""}</b>+{c.reward}</span>
              ))}
            </div>
          </div>
          {CHESTS.some((c, i) => posts >= c.at && !opened.includes(i)) ? (
            <button type="button" className="np-btn" onClick={() => openChest(CHESTS.findIndex((c, i) => posts >= c.at && !opened.includes(i)))}>
              <Icon name="gift" size={18} /> Open your chest
            </button>
          ) : (
            <span className="v2-small">{nextChest ? `Post ${nextChest.at - posts} more today to open the next chest.` : "All chests open. See you tomorrow."}</span>
          )}
        </section>

        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Newbie missions</h2>
            <span className="badge">{doneNewbie} of 6 done</span>
          </div>
          <div className="v2-steps">{newbie.map((m) => <i key={m.id} className={m.done ? "on" : undefined} />)}</div>
          <span className="cr2-timer" style={{ alignSelf: "flex-start" }}><Icon name="cal" size={15} /> 5 days 12 hours left · after that the reward is halved</span>
          <div className="v2-divide">
            {newbie.map((m) => (
              <div key={m.id} className="cr2-mission">
                <span className={`cr2-mico ${m.done ? "done" : ""}`}><Icon name={m.done ? "check" : "spark"} size={18} width={m.done ? 3 : 1.9} /></span>
                <span>
                  <strong>{m.title}</strong>
                  <span className="cr2-reward"><Icon name="star" size={13} /> +{m.reward} credits</span>
                </span>
                {m.done ? (
                  claimed.includes(m.id) ? <span className="badge badge-gray">Claimed</span> : <button type="button" className="np-btn v2-btn-sm" onClick={() => claim(m.id)}>Claim</button>
                ) : (
                  <Link href={GO[m.id] ?? "/app"} className="btn-outline v2-btn-sm">Do it</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Milestones</h2>
          <span className="v2-small">Bigger rewards for real results</span>
        </div>
        <div className="v2-divide">
          {milestones.map((m) => (
            <div key={m.id} className="cr2-mission">
              <span className="cr2-mico"><Icon name="trophy" size={18} /></span>
              <span>
                <strong>{m.title}</strong>
                <Progress value={m.progress} max={m.goal} />
                <small>{m.progress} of {m.goal} · {m.goal - m.progress} to go</small>
              </span>
              <span className="cr2-reward"><Icon name="star" size={13} /> +{m.reward}</span>
            </div>
          ))}
        </div>
      </section>

      <Link href="/app/rewards/level" className="v2-card" style={{ textDecoration: "none", color: "var(--text)", flexDirection: "row", alignItems: "center", gap: 14 }}>
        <span className="v2-medal" style={{ width: 52, height: 52, animation: "none" }}><Icon name="medal" size={26} /></span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <b>Badges: {BADGES.filter((b) => b.got).length} of {BADGES.length}</b>
          <span className="v2-small">Next up: 7-day streak, 1 more day</span>
        </span>
        <Icon name="arrow" size={18} />
      </Link>

      <p className="cr2-note"><Icon name="shield" size={15} /><span>Sharing never earns credits. Only real posts and successful referrals do.</span></p>

      {moment && (
        <Celebrate
          title={moment.title}
          line={moment.line}
          cheer={moment.cheer}
          icon={moment.icon}
          onClose={() => setMoment(null)}
          onShare={() => { setShare(moment.share); setMoment(null); }}
        />
      )}
      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} />}
    </div>
  );
}
