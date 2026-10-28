"use client";

import "@/app/admin.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Seg, Title } from "@/components/ui";
import { Av, Funnel, Meta, Pill, Search } from "@/components/admin/bits";
import { MISSION_DEFS, MISSION_FUNNELS, PROGRESS_PEOPLE } from "@/lib/mock-admin";

type View = "Per person" | "Per mission";

/** Progress per person (where each creator or seller is in each mission) and per mission (where people get stuck). */
export default function GrowthProgress() {
  const { toast } = useDemo();
  const [view, setView] = useState<View>("Per person");
  const [q, setQ] = useState("");
  const [who, setWho] = useState(PROGRESS_PEOPLE[0].key);
  const withFunnel = MISSION_DEFS.filter((m) => MISSION_FUNNELS[m.id]);
  const [mid, setMid] = useState(withFunnel[0].id);

  const matches = PROGRESS_PEOPLE.filter((p) => !q || `${p.key} ${p.who}`.toLowerCase().includes(q.toLowerCase()));
  const person = PROGRESS_PEOPLE.find((p) => p.key === who) ?? PROGRESS_PEOPLE[0];
  const m = MISSION_DEFS.find((x) => x.id === mid)!;
  const steps = MISSION_FUNNELS[mid];
  const rate = steps ? Math.round((steps[steps.length - 1][1] / steps[0][1]) * 100) : 0;
  let worst = 1;
  let worstAt = 1;
  steps.forEach(([, v], i) => { if (i && v / steps[i - 1][1] < worst) { worst = v / steps[i - 1][1]; worstAt = i; } });

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Progress per Person" sub="See where people are and where they get stuck.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast("Exported as CSV")}><Icon name="doc" size={15} /> Export</button>
      </Title>

      <Seg value={view} options={["Per person", "Per mission"] as const} onChange={setView} />

      {view === "Per person" ? (
        <div className="v2-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)" }}>
          <section className="v2-card">
            <Search value={q} onChange={setQ} placeholder="Search a creator or seller" />
            <div className="ad-list">
              {matches.map((p) => (
                <button key={p.key} type="button" className="ad-row ad-rowbtn click" onClick={() => setWho(p.key)} style={p.key === who ? { background: "var(--gsoft)" } : undefined}>
                  <Av name={p.key} size={34} />
                  <span className="main"><b>{p.key}</b><small>{p.role} · joined {p.joined}</small></span>
                  <span className="ad-tag gray">{p.missions.filter((x) => x.progress >= x.goal).length}/{p.missions.length}</span>
                </button>
              ))}
              {matches.length === 0 && <p className="v2-small" style={{ margin: 0 }}>No one found.</p>}
            </div>
          </section>

          <section className="v2-card">
            <div className="v2-card-h">
              <div className="v2-row" style={{ gap: 12 }}>
                <Av name={person.key} size={44} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 17 }}>{person.key}</b>
                  <span className="v2-small">{person.who} · {person.role} · joined {person.joined}</span>
                </span>
              </div>
              <Link href="/admin/analytics" className="v2-link">Activity timeline</Link>
            </div>
            <div className="ad-list">
              {person.missions.map((x) => {
                const done = x.progress >= x.goal;
                return (
                  <div key={x.title} className="ad-row">
                    <span className="main">
                      <b>{x.title}</b>
                      <small>{x.progress} of {x.goal}</small>
                    </span>
                    <span className="ad-mini">
                      <Progress value={x.progress} max={x.goal} />
                    </span>
                    <Pill tone={done ? "ok" : x.left === "Paused" ? "mute" : /left|Ends/.test(x.left) ? "warn" : "mute"}>{done ? "Done" : x.left}</Pill>
                    <span className="ad-tag" style={{ minWidth: 90, justifyContent: "center" }}>{x.claimed ? "Claimed" : done ? "Not claimed" : "—"}</span>
                  </div>
                );
              })}
            </div>
            <Meta range="Since sign-up" source="Rezekii mission progress" updated="Today 10:40" />
          </section>
        </div>
      ) : (
        <>
          <div className="v2-chips ad-chips" role="group" aria-label="Mission">
            {withFunnel.map((x) => (
              <button key={x.id} type="button" className={`v2-chip ${x.id === mid ? "on" : ""}`} aria-pressed={x.id === mid} onClick={() => setMid(x.id)}>
                {x.title} <small>{x.who === "Creator" ? "C" : "S"}</small>
              </button>
            ))}
          </div>
          <p className="v2-small" style={{ margin: "-6px 0 0" }}><b style={{ color: "var(--text)" }}>{m.title}</b> · {m.who} mission · {m.period} · reward {m.tiers} credits</p>
          <div className="v2-grid4 ad-stats">
            <div className="v2-stat"><small>Started</small><b>{steps[0][1].toLocaleString("en-MY")}</b><em>Last 30 days</em></div>
            <div className="v2-stat"><small>Completion rate</small><b>{rate}%</b><em className={rate >= 50 ? "up" : "down"}>{rate >= 50 ? "Healthy" : "Worth a look"}</em></div>
            <div className="v2-stat"><small>Biggest drop</small><b>{Math.round((1 - worst) * 100)}%</b><em>At “{steps[worstAt][0]}”</em></div>
          </div>
          <section className="v2-card">
            <div className="v2-card-h">
              <h2 className="v2-h2">Where people get stuck</h2>
              <Link href="/admin/growth" className="v2-link">Edit mission</Link>
            </div>
            <Funnel steps={steps} />
            <div className="v2-alert" style={{ background: "var(--bsoft)", color: "var(--blue)" }}>
              <Icon name="spark" size={18} />
              <span>
                Most people stop before “{steps[worstAt][0]}”. Try a clearer step or a 24-hour reminder.
              </span>
            </div>
            <Meta range="Last 30 days" source="Rezekii events (mission steps)" updated="Today 10:40" />
          </section>
        </>
      )}
    </div>
  );
}
