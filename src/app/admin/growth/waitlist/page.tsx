"use client";

import "@/app/admin.css";
import "@/app/ai-video.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Seg, Title } from "@/components/ui";
import { Av, Chips } from "@/components/admin/bits";
import { TRIAL_SIZE, WAITLIST, joinedText, type WaitlistEntry } from "@/lib/mock-ai-video";
import { rm } from "@/lib/mock";

type Filter = "All" | "Picked for Trial";
type Sort = "Most Videos" | "Newest";

/**
 * AI Video Waitlist (owner, 29 Oct 2026): creators who want to try AI Video before it launches. We pick the first trial batch
 * from here, up to the trial size; the rest stay on the list for later batches.
 */
export default function AiVideoWaitlist() {
  const { toast } = useDemo();
  const [list, setList] = useState<WaitlistEntry[]>(WAITLIST);
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<Sort>("Most Videos");

  const picked = list.filter((c) => c.picked).length;
  const shown = list
    .filter((c) => filter === "All" || c.picked)
    .sort((a, b) => (sort === "Most Videos" ? b.videos - a.videos : b.joined.localeCompare(a.joined)) || b.gmv30 - a.gmv30);

  const pick = (c: WaitlistEntry) => {
    if (!c.picked && picked >= TRIAL_SIZE) return toast(`Trial is full: ${TRIAL_SIZE} of ${TRIAL_SIZE} picked`);
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, picked: !x.picked } : x)));
    toast(c.picked ? `${c.handle} taken off the trial` : `${c.handle} picked for the trial (${picked + 1} of ${TRIAL_SIZE})`);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="AI Video Waitlist" sub="Creators who want to try AI Video before it launches. Pick who gets into the first trial batch.">
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("Waitlist exported (CSV)")}><Icon name="arrow" size={16} /> Export List</button>
      </Title>

      <section className="v2-card av-trial">
        <div className="v2-card-h">
          <span><small>Picked for Trial</small><b>{picked} <em>of {TRIAL_SIZE}</em></b></span>
          <span><small>On the Waitlist</small><b>{list.length}</b></span>
        </div>
        <Progress value={picked} max={TRIAL_SIZE} />
      </section>

      <div className="av-bar">
        <Chips<Filter> label="Filter waitlist" value={filter} onChange={setFilter} options={[["All", list.length], ["Picked for Trial", picked]]} />
        <Seg value={sort} options={["Most Videos", "Newest"] as const} onChange={setSort} />
      </div>

      <section className="v2-card" style={{ padding: "8px 20px" }}>
        <div className="ad-list">
          {shown.map((c) => (
            <div key={c.id} className="ad-row av-row">
              <Av name={c.handle} />
              <span className="main">
                <b>{c.handle}</b>
                <small>{c.niche} · joined {joinedText(c.joined)}</small>
                {c.note && <small className="av-note">“{c.note}”</small>}
              </span>
              <span className="main av-col">
                <b className="ad-nowrap">{c.videos} videos a month</b>
                <small>{c.types.join(", ")}</small>
              </span>
              <span className="main av-col sm">
                <b className="ad-nowrap">{rm(c.gmv30, 0)}</b>
                <small>GMV, 30 days</small>
              </span>
              <span className="av-plats">{c.platforms.map((p) => <span key={p} className="av-plat">{p}</span>)}</span>
              <button type="button" className={`av-pick ${c.picked ? "on" : ""}`} aria-pressed={c.picked} onClick={() => pick(c)}>
                {c.picked ? <><Icon name="check" size={14} width={2.8} /> Picked</> : "Pick for Trial"}
              </button>
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>No one picked yet.</p>}
        </div>
      </section>
    </div>
  );
}
