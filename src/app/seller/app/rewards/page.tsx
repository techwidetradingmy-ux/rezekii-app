"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Celebrate, Count, Progress, ShareSheet, Title } from "@/components/ui";
import { NEWBIE_LEFT_MS, SELLER_CREDITS, SELLER_MISSIONS, type SellerMission } from "@/lib/mock-seller";
import { SELLER, SELLER_RESULTS } from "@/lib/mock";

function Clock({ ms }: { ms: number }) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const parts: [number, string][] = [[Math.floor(s / 86400), "days"], [Math.floor((s % 86400) / 3600), "hrs"], [Math.floor((s % 3600) / 60), "min"], [s % 60, "sec"]];
  return (
    <span className="sl-clock" aria-label="Time left">
      {parts.map(([n, l]) => <span key={l}><b>{String(n).padStart(2, "0")}</b><small>{l}</small></span>)}
    </span>
  );
}

/** Seller missions: newbie setup steps with a countdown, then milestones. Credits, not cash. */
export default function SellerMissions() {
  const [missions, setMissions] = useState<SellerMission[]>(SELLER_MISSIONS);
  const [credits, setCredits] = useState(SELLER_CREDITS);
  const [left, setLeft] = useState(NEWBIE_LEFT_MS);
  const [cele, setCele] = useState<SellerMission | null>(null);
  const [share, setShare] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setLeft((l) => l - 1000), 1000);
    return () => window.clearInterval(t);
  }, []);

  const newbie = missions.filter((m) => m.kind === "newbie");
  const milestones = missions.filter((m) => m.kind === "milestone");
  const doneCount = newbie.filter((m) => m.done).length;

  const claim = (m: SellerMission) => {
    setMissions((all) => all.map((x) => (x.id === m.id ? { ...x, claimed: true } : x)));
    setCredits((c) => c + m.reward);
    setCele(m);
  };

  const row = (m: SellerMission) => (
    <div key={m.id} className={`sl-mission ${m.done && m.claimed ? "done" : ""}`}>
      <span className="sl-tick-ico">{m.done ? <Icon name="check" size={20} width={2.6} /> : <Icon name={m.kind === "newbie" ? "flame" : "trophy"} size={20} />}</span>
      <span>
        <strong>{m.title}</strong>
        {m.goal > 1 && (
          <span className="v2-row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <span style={{ flex: 1, minWidth: 0 }}><Progress value={m.progress} max={m.goal} /></span>
            <small className="v2-small" style={{ whiteSpace: "nowrap" }}>{m.progress} / {m.goal}</small>
          </span>
        )}
        <small className="v2-small">+{m.reward} credits</small>
      </span>
      {m.done && !m.claimed ? (
        <button type="button" className="np-btn v2-btn-sm" onClick={() => claim(m)}>Claim +{m.reward}</button>
      ) : m.done ? (
        <span className="badge">Claimed</span>
      ) : m.href ? (
        <Link href={m.href} className="btn-outline" style={{ height: 36, fontSize: 13.5 }}>Go</Link>
      ) : null}
    </div>
  );

  return (
    <div className="v2-stack v2-in">
      <Title title="Missions" sub="Finish setup steps and milestones to earn credits. Credits are rewards, not cash.">
        <Link href="/seller/app/rewards/wallet" className="btn-outline"><Icon name="wallet" size={18} /> <Count value={credits} /> credits</Link>
        <button type="button" className="btn-outline" onClick={() => setShare(true)}><Icon name="share" size={18} /> Share</button>
      </Title>

      <section className="v2-card">
        <div className="v2-card-h">
          <span>
            <h2 className="v2-h2">New seller missions</h2>
            <span className="v2-small">{doneCount} of {newbie.length} done · ends 7 days after you joined</span>
          </span>
          <Clock ms={left} />
        </div>
        <Progress value={doneCount} max={newbie.length} />
        <div>{newbie.map(row)}</div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h"><h2 className="v2-h2">Milestones</h2><span className="v2-small">No time limit</span></div>
        <div>{milestones.map(row)}</div>
      </section>

      <p className="v2-small" style={{ margin: 0 }}>Missions are set by the Techwide team and can change; a change never affects a mission you&apos;ve already started. Credits can&apos;t be withdrawn.</p>

      {cele && (
        <Celebrate
          title={`+${cele.reward} credits`}
          line={cele.title}
          cheer={cele.id === "sm4" ? `${SELLER.shop} is now in front of Techwide's creators.` : "Nice. That's one more step done."}
          onClose={() => setCele(null)}
          onShare={() => { setCele(null); setShare(true); }}
          tone="green"
          icon="medal"
        />
      )}
      {share && (
        <ShareSheet
          onClose={() => setShare(false)}
          handle={SELLER.shop}
          label="Now selling with creators on TikTok Shop"
          big={`${SELLER_RESULTS.creators} creators`}
          lines={["sell our products through Rezekii", "Join free with my link"]}
        />
      )}
    </div>
  );
}
