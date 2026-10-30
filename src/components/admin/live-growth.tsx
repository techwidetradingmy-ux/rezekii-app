"use client";

import { useEffect, useState } from "react";
import { Columns, Title } from "@/components/ui";
import { Av, Chips, Funnel, Pill, Search } from "@/components/admin/bits";
import { day } from "@/components/admin/live-lists";

/** Loads one admin data part (admins only). */
function useData<T>(part: string): [T | null, string | null] {
  const [d, setD] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/v2/admin/data?part=${part}`, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { data: T }) => setD(x.data))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  }, [part]);
  return [d, err];
}

type Mission = { side: "creator" | "seller"; id: string; title: string; reward: number; kind: "Daily" | "Starter" | "Milestone"; claims: number; week: number; people: number; credits: number };
type Person = { name: string; side: string; starters: [number, number]; dailyWeek: number; credits: number; last: string | null; missing: string[] };
type Report = { missions: Mission[]; people: Person[] };

/** Growth › Missions on real data (owner, 31 Oct 2026): every mission as it runs now, with its claims. Rewards are set in code. */
export function LiveMissions() {
  const [d, err] = useData<Report>("missions");
  const [who, setWho] = useState<"Creators" | "Sellers">("Creators");
  const shown = (d?.missions ?? []).filter((m) => m.side === (who === "Creators" ? "creator" : "seller"));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Missions" sub="Every mission as it runs now, with how often it's claimed. Changing a reward is a code change for now." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Who" value={who} onChange={setWho} options={[["Creators", d.missions.filter((m) => m.side === "creator").length], ["Sellers", d.missions.filter((m) => m.side === "seller").length]]} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Mission</th><th>Type</th><th>Reward</th><th>Claims</th><th>Last 7 days</th><th>People</th><th>Credits given</th></tr></thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={`${m.side}-${m.id}`}>
                      <td style={{ minWidth: 200 }}><b>{m.title}</b></td>
                      <td>{m.kind}</td>
                      <td className="num">{m.reward}</td>
                      <td className="num">{m.claims}</td>
                      <td className="num">{m.week}</td>
                      <td className="num">{m.people}</td>
                      <td className="num">{m.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="v2-small" style={{ margin: 0 }}>Bonus chests and streak tiers are paid on top. From the credit ledger.</p>
        </>
      )}
    </div>
  );
}

/** Growth › Progress per Person on real data: where each person is with their starter missions, and what's left. */
export function LiveProgress() {
  const [d, err] = useData<Report>("missions");
  const [q, setQ] = useState("");
  const shown = (d?.people ?? []).filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Progress per Person" sub="Where each creator and seller is with their missions, and what they haven't done yet." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search name or handle" /></div>
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {shown.map((p, i) => (
                <div key={i} className="ad-row" style={{ alignItems: "flex-start" }}>
                  <Av name={p.name} />
                  <span className="main">
                    <b>{p.name} <Pill tone="mute">{p.side === "seller" ? "Seller" : "Creator"}</Pill></b>
                    <small>{p.starters[0]} of {p.starters[1]} one-time missions · {p.dailyWeek} daily claims this week · {p.credits} credits from missions · last {day(p.last)}</small>
                    {p.missing.length > 0 && <small>Not yet: {p.missing.join(", ")}</small>}
                  </span>
                </div>
              ))}
              {!shown.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No one has claimed a mission yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

type Analytics = { funnels: Record<"Creators" | "Sellers", [string, number][]>; events: Record<string, number[]> };
/** Analytics on real data: how far creators and sellers get, and the main events per day. */
export function LiveAnalytics() {
  const [d, err] = useData<Analytics>("analytics");
  const [who, setWho] = useState<"Creators" | "Sellers">("Creators");
  const [ev, setEv] = useState("Sign-ups");
  const labels = Array.from({ length: 30 }, (_, i) => {
    if (i % 7 !== 0 && i !== 29) return "";
    const t = new Date(Date.now() - (29 - i) * 86_400_000);
    return i === 29 ? "Today" : t.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
  });
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Analytics" sub="From Rezekii's own records. Funnels are all time; events are per Malaysia day." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">How Far People Get</h2><Chips label="Who" value={who} onChange={setWho} options={[["Creators"], ["Sellers"]]} /></div>
            <Funnel steps={d.funnels[who]} tone={who === "Sellers" ? "amber" : "blue"} />
          </section>
          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">Events, Last 30 Days</h2><span className="v2-small">{(d.events[ev] ?? []).reduce((a, b) => a + b, 0)} in all</span></div>
            <Chips label="Event" value={ev} onChange={setEv} options={Object.keys(d.events).map((k) => [k, d.events[k].reduce((a, b) => a + b, 0)])} />
            <div className="sl-cols sl-dense"><Columns values={d.events[ev] ?? []} labels={labels} /></div>
          </section>
        </>
      )}
    </div>
  );
}
