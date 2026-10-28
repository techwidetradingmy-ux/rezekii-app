"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, ShareSheet, Title } from "@/components/ui";
import { CREATOR, MISSIONS, MY_SAMPLES, product } from "@/lib/mock";
import "@/app/rewards.css";

const CHESTS = [
  { at: 1, reward: 10 },
  { at: 3, reward: 20 },
  { at: 5, reward: 20 },
];
/** Coming later: brands pay for content. Examples so creators know it's on the way. */
const BRANDED = [
  { brand: "Seri Living MY", bg: "linear-gradient(135deg,#ffb35c,#f05a00)", title: "Kitchen hacks week", task: "2 videos using the 900ml spin chopper", reward: "RM 50 per approved video", extra: "Free sample · 40 spots", ends: "Opens Dec" },
  { brand: "Urban Basics MY", bg: "linear-gradient(135deg,#8b7dff,#5b4ee0)", title: "OOTD try-on challenge", task: "3 try-on videos, any Urban Basics pants", reward: "RM 120 for all 3", extra: "+2% commission for 30 days", ends: "Opens Dec" },
  { brand: "Bersih Pro", bg: "linear-gradient(135deg,#25f4ee,#00a8a0)", title: "Honest before & after", task: "1 real before-and-after video", reward: "RM 30 bonus at 20 sales", extra: "Top 3 videos win RM 300", ends: "Opens Jan" },
];

type Row = { id: string; icon: IconName; title: string; get: string; perk?: string; progress?: [number, number]; due?: string; cta: string; href?: string; claim?: () => void };
type Moment = { title: string; line: string; cheer: string; icon: "gift" | "trophy"; share: { big: string; label: string; lines: string[] } };

/** Missions: one action list, most rewarding first, each with what you get; today's chests; branded missions coming soon. */
export default function Missions() {
  const { toast } = useDemo();
  const daily = MISSIONS.find((m) => m.kind === "daily")!;
  const posts = daily.progress;
  const [credits, setCredits] = useState(CREATOR.credits);
  const [opened, setOpened] = useState<number[]>([]);
  const [claimed, setClaimed] = useState<string[]>(["m1", "m3", "m4"]);
  const [notify, setNotify] = useState<string[]>([]);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [share, setShare] = useState<Moment["share"] | null>(null);

  const nextChest = CHESTS.find((c) => c.at > posts);
  const readyChest = CHESTS.findIndex((c, i) => posts >= c.at && !opened.includes(i));
  const sample = MY_SAMPLES.find((s) => s.status === "Posting");
  const newbie = MISSIONS.filter((m) => m.kind === "newbie");
  const unclaimed = newbie.filter((m) => m.done && !claimed.includes(m.id));
  const todo = newbie.filter((m) => !m.done);

  const openChest = (i: number) => {
    const c = CHESTS[i];
    setOpened((o) => [...o, i]);
    setCredits((n) => n + c.reward);
    setMoment({
      title: `Chest ${i + 1} opened`,
      line: `+${c.reward} credits`,
      cheer: nextChest ? `Post ${nextChest.at - posts} more today to open the next chest (+${nextChest.reward} credits).` : "All 3 chests open today. Come back tomorrow.",
      icon: "gift",
      share: { big: `${posts} videos`, label: "Today I posted", lines: [`Chest ${i + 1} opened`, `${CREATOR.streak} days in a row`] },
    });
  };
  const claim = (id: string) => {
    const m = MISSIONS.find((x) => x.id === id)!;
    setClaimed((c) => [...c, id]);
    setCredits((n) => n + m.reward);
    toast(`+${m.reward} credits`);
  };

  const rows: Row[] = [
    ...(readyChest >= 0 ? [{ id: "chest", icon: "gift" as IconName, title: `Open today's chest ${readyChest + 1}`, get: `+${CHESTS[readyChest].reward} credits`, cta: "Open", claim: () => openChest(readyChest) }] : []),
    ...unclaimed.map((m) => ({ id: m.id, icon: "check" as IconName, title: m.title, get: `+${m.reward} credits`, cta: "Claim", claim: () => claim(m.id) })),
    ...(nextChest
      ? [{ id: "post", icon: "video" as IconName, title: `Post ${nextChest.at - posts} more video${nextChest.at - posts > 1 ? "s" : ""} today`, get: `+${nextChest.reward} credits`, perk: `Keeps your ${CREATOR.streak}-day streak: ${30 - CREATOR.streak} days to Highly active`, progress: [posts, nextChest.at] as [number, number], due: "Before midnight", cta: "Post now", href: "/app/publish" }]
      : []),
    ...(sample ? [{ id: "sample", icon: "box" as IconName, title: `1 more video for your sample: ${product(sample.productId).name}`, get: "+80 credits", perk: "Keeps your sample record at 100%", progress: [sample.videos, 3] as [number, number], due: `Due ${sample.due}`, cta: "Submit link", href: "/app/account#samples" }] : []),
    ...todo.map((m) => ({ id: m.id, icon: (m.id === "m6" ? "scan" : "whatsapp") as IconName, title: m.title, get: `+${m.reward} credits`, perk: m.id === "m6" ? "Finds products in your showcase that pay more" : "The team can reach you about samples", due: `${m.due} left`, cta: m.id === "m6" ? "Scan now" : "Verify", href: m.id === "m6" ? "/app#scan" : "/app/account#profile" })),
    { id: "m9", icon: "trophy", title: "Finish your first collaboration", get: "+120 credits", perk: "Get a free sample, post 3 videos", cta: "Find a sample", href: "/app/market" },
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Missions" sub="Do these to earn credits. Credits pay for AI tools inside Rezekii.">
        <span className="ms-pills">
          <Link href="/app/account#level" className="ms-pill fire"><Icon name="flame" size={15} /> {CREATOR.streak}-day streak</Link>
          <Link href="/app/account#wallet" className="ms-pill"><Icon name="wallet" size={15} /> {credits.toLocaleString("en-MY")} credits</Link>
        </span>
      </Title>

      <section className="v2-card ms-list">
        <div className="v2-card-h">
          <h2 className="v2-h2">Do these now</h2>
          <span className="badge">{rows.length} things · up to +{rows.reduce((s, r) => s + Number(r.get.replace(/\D/g, "")), 0)} credits</span>
        </div>
        <ol>
          {rows.map((r, i) => (
            <li key={r.id} className={r.claim ? "ready" : undefined} style={{ animationDelay: `${i * 40}ms` }}>
              <span className="ms-ico"><Icon name={r.icon} size={19} /></span>
              <span className="ms-main">
                <b>{r.title}</b>
                {r.perk && <small>{r.perk}</small>}
                {r.progress && (
                  <span className="ms-prog">
                    <i><span style={{ width: `${(r.progress[0] / r.progress[1]) * 100}%` }} /></i>
                    {r.progress[0]} / {r.progress[1]}
                  </span>
                )}
              </span>
              <span className="ms-side">
                <span className="ms-get">{r.get}</span>
                {r.due && <small>{r.due}</small>}
                {r.claim ? (
                  <button type="button" className="np-btn v2-btn-sm" onClick={r.claim}>{r.cta}</button>
                ) : (
                  <Link href={r.href!} className="btn-outline v2-btn-sm">{r.cta}</Link>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="v2-card ms-chests">
        <div className="v2-card-h">
          <h2 className="v2-h2">Today&apos;s chests</h2>
          <span className="v2-small">{posts} posted · resets at midnight</span>
        </div>
        <div className="ms-chestrow">
          {CHESTS.map((c, i) => {
            const isOpen = opened.includes(i);
            const ready = posts >= c.at && !isOpen;
            return (
              <button key={c.at} type="button" className={`ms-chest ${isOpen ? "open" : ready ? "ready" : ""}`} disabled={!ready} onClick={() => openChest(i)} aria-label={ready ? `Open chest ${i + 1}` : `Chest ${i + 1}`}>
                <span><Icon name={isOpen ? "check" : "gift"} size={22} width={isOpen ? 3 : 1.9} /></span>
                <b>{c.at} post{c.at > 1 ? "s" : ""}</b>
                <small>+{c.reward}</small>
              </button>
            );
          })}
        </div>
        <span className="v2-small">One video posted to several platforms counts once. It needs a Techwide product in the cart.</span>
      </section>

      <section className="ms-branded">
        <div className="v2-card-h">
          <h2 className="v2-h2">Branded missions</h2>
          <span className="badge badge-amber">Coming soon</span>
        </div>
        <p className="v2-muted" style={{ margin: 0 }}>Brands will pay you for content here: real money for real videos, on top of your commission. Here&apos;s what they&apos;ll look like.</p>
        <div className="ms-bgrid">
          {BRANDED.map((b) => (
            <article key={b.title} className="ms-bcard">
              <span className="ms-soon">Coming soon</span>
              <span className="ms-brand"><i style={{ background: b.bg }}>{b.brand.slice(0, 1)}</i>{b.brand}</span>
              <b>{b.title}</b>
              <small>{b.task}</small>
              <span className="ms-breward">{b.reward}</span>
              <small>{b.extra} · {b.ends}</small>
              <button type="button" className={notify.includes(b.title) ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"} onClick={() => { setNotify((n) => (n.includes(b.title) ? n : [...n, b.title])); toast("We'll tell you when branded missions open"); }}>
                {notify.includes(b.title) ? <><Icon name="check" size={15} width={3} /> We&apos;ll tell you</> : <><Icon name="bell" size={15} /> Notify me</>}
              </button>
            </article>
          ))}
        </div>
      </section>

      {moment && (
        <Celebrate title={moment.title} line={moment.line} cheer={moment.cheer} icon={moment.icon} onClose={() => setMoment(null)} onShare={() => { setShare(moment.share); setMoment(null); }} />
      )}
      {share && <ShareSheet onClose={() => setShare(null)} big={share.big} label={share.label} lines={share.lines} kicker="Rewards" />}
    </div>
  );
}
