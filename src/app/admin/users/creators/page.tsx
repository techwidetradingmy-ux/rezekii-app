"use client";

import "@/app/admin.css";
import { LiveCreators } from "@/components/admin/live-admin-data";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Av, Chips, Pill, Reasons, Search, Sec, Switch } from "@/components/admin/bits";
import { DIRECTORY, SAMPLE_HISTORY, type Person } from "@/lib/mock-admin";
import { rm } from "@/lib/mock";

type Level = "Any level" | "Bronze" | "Silver" | "Gold";
const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-01" -> "1 Nov 2026" */
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

/** Creator directory with filters, and a profile sheet for Gold, MCN flag and freeze / ban. */
export default function CreatorDirectory() {
  const { live } = useDemo();
  const [people, setPeople] = useState<Person[]>(DIRECTORY);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<Level>("Any level");
  const [state, setState] = useState("Any state");
  const [activity, setActivity] = useState("Any activity");
  const [tt, setTt] = useState("Any TikTok level");
  const [niche, setNiche] = useState("Any niche");
  const [open, setOpen] = useState<string | null>(null);
  // Signed in (owner, 31 Oct 2026): real data.
  if (live) return <LiveCreators />;

  const shown = people.filter(
    (p) =>
      (level === "Any level" || p.level === level) &&
      (state === "Any state" || p.state === state) &&
      (activity === "Any activity" || p.activity === activity) &&
      (tt === "Any TikTok level" || (tt === "Lv.1–2" ? p.tt <= 2 : tt === "Lv.3–4" ? p.tt >= 3 && p.tt <= 4 : p.tt >= 5)) &&
      (niche === "Any niche" || p.niche === niche) &&
      (!q || `${p.handle} ${p.name}`.toLowerCase().includes(q.toLowerCase())),
  );
  const p = people.find((x) => x.handle === open) ?? null;
  const set = (handle: string, patch: Partial<Person>) => setPeople((l) => l.map((x) => (x.handle === handle ? { ...x, ...patch } : x)));
  const filtersOn = [state, activity, tt, niche].filter((x) => !x.startsWith("Any")).length + (level !== "Any level" ? 1 : 0);

  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Creators" sub={`${people.length} creators · ${people.filter((x) => x.level === "Gold").length} Gold`} />

      <div className="ad-bar">
        <Search value={q} onChange={setQ} placeholder="Search handle or name" />
        <select className="np-input ad-select" aria-label="State" value={state} onChange={(e) => setState(e.target.value)}>
          {["Any state", ...uniq(people.map((x) => x.state))].map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="np-input ad-select" aria-label="Activity tier" value={activity} onChange={(e) => setActivity(e.target.value)}>
          {["Any activity", "New", "Active"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="np-input ad-select" aria-label="TikTok level" value={tt} onChange={(e) => setTt(e.target.value)}>
          {["Any TikTok level", "Lv.1–2", "Lv.3–4", "Lv.5+"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className="np-input ad-select" aria-label="Niche" value={niche} onChange={(e) => setNiche(e.target.value)}>
          {["Any niche", ...uniq(people.map((x) => x.niche))].map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="ad-bar">
        <Chips<Level> label="Rezekii level" value={level} onChange={setLevel} options={(["Any level", "Bronze", "Silver", "Gold"] as Level[]).map((l) => [l, l === "Any level" ? people.length : people.filter((x) => x.level === l).length] as [Level, number])} />
        <span className="sp" />
        {filtersOn > 0 && (
          <button type="button" className="v2-link" onClick={() => { setLevel("Any level"); setState("Any state"); setActivity("Any activity"); setTt("Any TikTok level"); setNiche("Any niche"); setQ(""); }}>
            Clear {filtersOn} filter{filtersOn > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead>
              <tr><th>Creator</th><th>State</th><th>Level</th><th>Activity</th><th>TikTok</th><th>Niche</th><th className="num">Days in a row</th><th className="num">GMV 30 days</th><th>Status</th></tr>
            </thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.handle} className={`click ${x.status === "Frozen" || x.status === "Banned" ? "bad" : ""}`} onClick={() => setOpen(x.handle)}>
                  <td>
                    <span className="ad-cell">
                      <Av name={x.handle} size={32} />
                      <span><b>{x.handle}</b><small>{x.name}</small></span>
                    </span>
                  </td>
                  <td className="ad-nowrap">{x.state}</td>
                  <td><span className={`badge ${x.level === "Gold" ? "badge-amber" : x.level === "Silver" ? "badge-blue" : "badge-gray"}`}>{x.level}</span></td>
                  <td className="ad-nowrap">{x.activity}</td>
                  <td>Lv.{x.tt}</td>
                  <td className="ad-nowrap">{x.niche}</td>
                  <td className="num">{x.streak}</td>
                  <td className="num">{rm(x.gmv30, 0)}</td>
                  <td className="ad-nowrap">
                    {x.status === "Approved" ? <Pill tone="ok">Approved</Pill> : x.status === "Waiting" ? <Pill tone="info">Waiting</Pill> : <Pill tone="bad">{x.status}</Pill>}
                    {x.mcn && <> <span className="ad-tag amber">Other MCN</span></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="v2-muted" style={{ padding: 12 }}>No creators match.</p>}
      </section>

      {p && <Profile p={p} onClose={() => setOpen(null)} set={(patch) => set(p.handle, patch)} />}
    </div>
  );
}

function Profile({ p, onClose, set }: { p: Person; onClose: () => void; set: (patch: Partial<Person>) => void }) {
  const { toast } = useDemo();
  const [gold, setGold] = useState(false);
  const [from, setFrom] = useState("2026-11-01");
  const [to, setTo] = useState("");
  const [action, setAction] = useState<"Freeze" | "Ban" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const history = SAMPLE_HISTORY[p.handle] ?? [];
  const blocked = p.status === "Frozen" || p.status === "Banned";
  const datesOk = !!from && !!to && to > from;

  return (
    <Sheet title={p.handle} onClose={onClose}>
      <div className="v2-row" style={{ marginTop: -6 }}>
        <Av name={p.handle} size={48} />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
          <b>{p.name}</b>
          <span className="v2-small">{p.state} · {p.niche} · TikTok Lv.{p.tt}</span>
        </span>
        <span className={`badge ${p.level === "Gold" ? "badge-amber" : p.level === "Silver" ? "badge-blue" : "badge-gray"}`}>{p.level}</span>
      </div>
      {p.gold && <span className="v2-small">Gold from {p.gold}</span>}

      <div className="v2-grid4 ad-stats" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div className="v2-stat"><small>GMV 30 days</small><b>{rm(p.gmv30, 0)}</b></div>
        <div className="v2-stat"><small>Days in a row</small><b>{p.streak}</b><em>{p.activity}</em></div>
        <div className="v2-stat"><small>Delivery rate</small><b>{p.delivery}%</b><em className={p.delivery < 100 ? "down" : "up"}>{p.delivery < 100 ? "Below 100%" : "All delivered"}</em></div>
        <div className="v2-stat"><small>Samples</small><b>{p.samples}</b><em>All time</em></div>
      </div>

      <Sec>Sample history</Sec>
      {history.length ? (
        <div className="ad-list">
          {history.map((h) => (
            <div key={h.product} className="ad-row" style={{ padding: "9px 0" }}>
              <span className="main"><b>{h.product}</b><small>{h.when}</small></span>
              <Pill tone={h.ok ? "ok" : "bad"}>{h.status}</Pill>
            </div>
          ))}
        </div>
      ) : (
        <span className="v2-small">No samples yet.</span>
      )}

      <Sec>Level</Sec>
      {!gold ? (
        <div className="v2-row">
          <button type="button" className="ad-btn-ghost" disabled={p.level === "Gold"} onClick={() => setGold(true)}><Icon name="medal" size={16} /> {p.level === "Gold" ? "Already Gold" : "Mark as Gold"}</button>
          {p.level === "Gold" && <button type="button" className="v2-link" onClick={() => { set({ level: "Silver", gold: undefined }); toast("Gold removed · back to Silver · logged"); }}>Remove Gold</button>}
        </div>
      ) : (
        <div className="v2-card flat">
          <span className="v2-small">Gold gets the Gold rate on TAP products. Set both dates.</span>
          <div className="ad-form">
            <label className="v2-field">Starts<input className="np-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="v2-field">Ends<input className="np-input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          {to && !datesOk && <span className="ad-down" style={{ fontSize: 13 }}>End date must be after start.</span>}
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm" disabled={!datesOk} onClick={() => { set({ level: "Gold", gold: `${day(from)} – ${day(to)}` }); setGold(false); toast(`${p.handle} is Gold from ${day(from)} to ${day(to)} · logged`); }}>Save Gold</button>
            <button type="button" className="ad-btn-ghost" onClick={() => setGold(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="np-switchrow">
        <span>
          <b>In another MCN</b>
          <small>Can&apos;t join MCN deals.</small>
        </span>
        <Switch label="In another MCN" on={p.mcn} onChange={(v) => { set({ mcn: v }); toast(v ? "Flagged: in another MCN · logged" : "MCN flag removed · logged"); }} />
      </div>

      <Sec>Account</Sec>
      {blocked ? (
        <div className="v2-row">
          <Pill tone="bad">{p.status}</Pill>
          <button type="button" className="ad-btn-ghost" onClick={() => { set({ status: "Approved" }); toast(`${p.handle} restored · logged`); }}>Restore</button>
        </div>
      ) : !action ? (
        <div className="v2-row">
          <button type="button" className="ad-btn-ghost danger" onClick={() => { setAction("Freeze"); setReason(null); setNote(""); }}>Freeze or ban</button>
        </div>
      ) : (
        <div className="v2-card flat">
          <Seg value={action} options={["Freeze", "Ban"] as const} onChange={setAction} />
          <span className="v2-small">{action === "Freeze" ? "Pauses samples and missions until restored." : "Closes the account for good. Note required."}</span>
          <Reasons options={["Overdue samples", "Fake or duplicate account", "Broke the sample terms", "Other"]} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder={action === "Ban" ? "Required: what happened?" : "Note (optional). Creator sees the reason."} />
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm ad-btn-danger" disabled={!reason || (action === "Ban" && !note.trim())} onClick={() => { set({ status: action === "Freeze" ? "Frozen" : "Banned" }); setAction(null); toast(`${p.handle} ${action === "Freeze" ? "frozen" : "banned"} · reason sent · logged`); }}>{action} now</button>
            <button type="button" className="ad-btn-ghost" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
