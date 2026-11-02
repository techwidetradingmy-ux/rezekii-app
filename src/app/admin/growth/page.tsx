"use client";

import "@/app/admin.css";
import { LiveMissions } from "@/components/admin/live-growth";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Pill, Sec, Switch, type Tone } from "@/components/admin/bits";
import { MISSION_DEFS, TRIGGERS, type MissionDef, type MissionStatus } from "@/lib/mock-admin";

const STATUS_TONE: Record<MissionStatus, Tone> = { Live: "ok", Draft: "info", Paused: "mute" };
const PERIOD_ICON: Record<MissionDef["period"], [IconName, string]> = {
  Once: ["star", "linear-gradient(135deg,#7aa2ff,#1d4ed8)"],
  Daily: ["flame", "linear-gradient(135deg,#f5a623,#e8005a)"],
  Weekly: ["cal", "linear-gradient(135deg,#22dc95,#00a862)"],
};
/** Monthly event volume over the last 30 days, used for the impact preview. */
const VOLUME: Record<string, number> = {
  tiktok_shop_linked: 1310, scan_completed: 1120, whatsapp_verified: 1490, publish_succeeded: 9420, sample_video_posted: 410, streak_reached: 380,
  collab_completed: 240, referral_qualified: 160, shop_connected: 168, product_submitted: 121, product_live: 34,
};
const BUDGET = 150000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-01T00:00" -> "1 Nov 2026, 00:00" */
const fmt = (iso: string) => {
  const [d, t] = iso.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  return y && mo && da ? `${da} ${MONTHS[mo - 1]} ${y}${t ? `, ${t}` : ""}` : iso;
};
type Def = MissionDef & { next?: string };

const blank = (who: "Creator" | "Seller"): MissionDef => ({
  id: "new", who, title: "", trigger: who === "Creator" ? "publish_succeeded" : "product_submitted", goal: "", period: "Once", tiers: "50", cap: "Once per person",
  deadline: 7, late: "Halve the reward", status: "Draft", version: "v0", template: "Story", message: "Mission complete!", cheer: "Keep going, you're on a roll.", start: "—", done30: 0, people30: 0,
});
const firstTier = (t: string) => Number(t.split("/")[0]?.trim().replace(/[^\d.]/g, "")) || 0;
const estimate = (m: MissionDef) => Math.round(((VOLUME[m.trigger] ?? 200) * firstTier(m.tiers) * (m.period === "Daily" ? 0.4 : m.period === "Weekly" ? 0.6 : 1)) / 1000) * 1000;

/** Missions and rewards, set up without code: trigger, goal, tiers, caps, deadline after sign-up, late rule, card. */
export default function GrowthMissions() {
  const { toast, live } = useDemo();
  const [who, setWho] = useState<"Creators" | "Sellers">("Creators");
  const [list, setList] = useState<Def[]>(MISSION_DEFS);
  const [edit, setEdit] = useState<Def | null>(null);
  // Signed in (owner, 31 Oct 2026): real data.
  if (live) return <LiveMissions />;
  const shown = list.filter((m) => m.who === (who === "Creators" ? "Creator" : "Seller"));
  const issued = shown.filter((m) => m.status === "Live").reduce((a, m) => a + estimate(m), 0);

  const save = (m: Def, status: MissionStatus, start: string) => {
    const old = list.find((x) => x.id === m.id);
    const version = m.id === "new" ? "v1" : `v${Number(m.version.slice(1)) + 1}`;
    const when = fmt(start);
    const next: Def =
      status === "Draft"
        ? { ...m, version, status: old?.status === "Live" ? "Live" : "Draft", next: old?.status === "Live" ? `${version} draft saved` : undefined }
        : { ...m, version, status: old?.status === "Live" ? "Live" : "Draft", start: old?.status === "Live" ? old.start : m.start, next: `${version} starts ${when}` };
    setList((l) => (m.id === "new" ? [...l, { ...next, id: `md${l.length + 1}` }] : l.map((x) => (x.id === m.id ? next : x))));
    setEdit(null);
    toast(status === "Draft" ? `Saved as draft ${version}` : `${m.title} ${version} scheduled · starts ${when}`);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Missions" sub="Change missions and rewards any time, no code.">
        <button type="button" className="np-btn v2-btn-sm" onClick={() => setEdit(blank(who === "Creators" ? "Creator" : "Seller"))}><Icon name="plus" size={16} /> New Mission</button>
      </Title>

      <Seg value={who} options={["Creators", "Sellers"] as const} onChange={setWho} />

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>Live missions</small><b>{shown.filter((m) => m.status === "Live").length}</b><em>{shown.filter((m) => m.status !== "Live").length} draft or paused</em></div>
        <div className="v2-stat"><small>Credits/month (est.)</small><b>{issued.toLocaleString("en-MY")}</b><em>Live missions, last 30 days</em></div>
        <div className="v2-stat"><small>Completed in 30 days</small><b>{shown.reduce((a, m) => a + m.done30, 0).toLocaleString("en-MY")}</b><em>All live missions</em></div>
      </div>

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((m) => (
            <div key={m.id} className="ad-mission">
              <span className="ad-mico" style={{ background: PERIOD_ICON[m.period][1] }}><Icon name={PERIOD_ICON[m.period][0]} size={20} /></span>
              <span className="main">
                <b>{m.title} <span className="ad-tag gray">{m.version}</span></b>
                <small>
                  When <code className="ad-mono">{m.trigger}</code> · {m.period} · goal {m.goal} · reward {m.tiers} credits · cap {m.cap}
                </small>
                <small>{m.deadline ? `Deadline: ${m.deadline} days after sign-up · late: ${m.late.toLowerCase()}` : "No deadline"}{m.status === "Live" ? ` · live since ${m.start}` : ""}</small>
                {m.next && <small className="ad-up"><Icon name="cal" size={13} /> {m.next}</small>}
              </span>
              <span className="acts">
                {m.status !== "Live" && m.next?.includes("starts") ? <Pill tone="info">Scheduled</Pill> : <Pill tone={STATUS_TONE[m.status]}>{m.status}</Pill>}
                {m.status !== "Draft" && (
                  <Switch label={`${m.title} live`} on={m.status === "Live"} onChange={(v) => { setList((l) => l.map((x) => (x.id === m.id ? { ...x, status: v ? "Live" : "Paused" } : x))); toast(v ? `${m.title} is live again` : `${m.title} paused · no new starts`); }} />
                )}
                <button type="button" className="ad-btn-ghost" onClick={() => setEdit(m)}>Edit</button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {edit && <Editor m={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function Editor({ m: init, onClose, onSave }: { m: Def; onClose: () => void; onSave: (m: Def, s: MissionStatus, start: string) => void }) {
  const [m, setM] = useState<Def>(init);
  const [start, setStart] = useState("2026-11-01T00:00");
  const set = (patch: Partial<MissionDef>) => setM((x) => ({ ...x, ...patch }));
  const est = estimate(m);
  const isNew = init.id === "new";
  const reward = firstTier(m.tiers);

  return (
    <Sheet title={isNew ? "New Mission" : `Edit: ${init.title}`} onClose={onClose}>
      {!isNew && <span className="v2-small" style={{ marginTop: -8 }}>Saves as {`v${Number(init.version.slice(1)) + 1}`}. {init.version} stays {init.status.toLowerCase()} until then.</span>}

      <Sec>Who and when</Sec>
      <Seg value={m.who} options={["Creator", "Seller"] as const} onChange={(v) => set({ who: v })} />
      <label className="v2-field">Title<input className="np-input" value={m.title} placeholder="e.g. Post 3 days in a row" onChange={(e) => set({ title: e.target.value })} /></label>
      <div className="ad-form">
        <label className="v2-field">Trigger event
          <select className="np-input" value={m.trigger} onChange={(e) => set({ trigger: e.target.value })}>
            {TRIGGERS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="v2-field">Goal<input className="np-input" value={m.goal} placeholder="e.g. 3 posts" onChange={(e) => set({ goal: e.target.value })} /></label>
      </div>
      <div className="v2-field">Period<Seg value={m.period} options={["Once", "Daily", "Weekly"] as const} onChange={(v) => set({ period: v })} /></div>

      <Sec>Reward</Sec>
      <div className="ad-form">
        <label className="v2-field">Reward tiers (credits)<input className="np-input" value={m.tiers} placeholder="10 / 30 / 60" onChange={(e) => set({ tiers: e.target.value })} /><small>Use / between tiers.</small></label>
        <label className="v2-field">Caps<input className="np-input" value={m.cap} placeholder="60 a day · 1,200 a month" onChange={(e) => set({ cap: e.target.value })} /></label>
      </div>

      <Sec>Deadline</Sec>
      <div className="np-switchrow">
        <span><b>Has a deadline</b></span>
        <Switch label="Has a deadline" on={m.deadline !== null} onChange={(v) => set({ deadline: v ? 7 : null })} />
      </div>
      {m.deadline !== null && (
        <>
          <div className="v2-row">
            <span className="ad-num">
              <button type="button" aria-label="Fewer days" onClick={() => set({ deadline: Math.max(1, (m.deadline ?? 1) - 1) })}>−</button>
              <b>{m.deadline}</b>
              <button type="button" aria-label="More days" onClick={() => set({ deadline: Math.min(60, (m.deadline ?? 1) + 1) })}>+</button>
            </span>
            <span className="v2-muted">days after sign-up</span>
          </div>
          <div className="v2-field">If late<Seg value={m.late} options={["Halve the reward", "Void it"] as const} onChange={(v) => set({ late: v })} /></div>
        </>
      )}

      <Sec>Completion card</Sec>
      <div className="ad-form">
        <div className="v2-stack" style={{ gap: 10 }}>
          <div className="v2-field">Template<Seg value={m.template} options={["Story", "Square"] as const} onChange={(v) => set({ template: v })} /></div>
          <label className="v2-field">Message<input className="np-input" value={m.message} onChange={(e) => set({ message: e.target.value })} /><small>{"{n}"} = their number</small></label>
          <label className="v2-field">Encouragement<input className="np-input" value={m.cheer} onChange={(e) => set({ cheer: e.target.value })} /></label>
        </div>
        <div className={`ad-cele ${m.template === "Square" ? "square" : ""}`} aria-label="Card preview" style={m.template === "Story" ? { minHeight: 260 } : { aspectRatio: "1 / 1" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className="cf" style={{ left: `${(i * 37) % 100}%`, background: ["#00c073", "#f5a623", "#e8005a", "#25f4ee"][i % 4], animationDelay: `${i * 160}ms` }} />
          ))}
          <span className="v2-medal"><Icon name="trophy" size={30} width={2.2} /></span>
          <h3>{(m.message || "Mission complete!").replace("{n}", "6").replace("{x}", "24")}</h3>
          <p className="gain">+{reward} credits</p>
          <p>{(m.cheer || "").replace("{x}", "24").replace("{n}", "3")}</p>
          <span className="v2-small" style={{ marginTop: "auto" }}>Preview · {m.template}</span>
        </div>
      </div>

      <Sec>Schedule</Sec>
      <label className="v2-field">Starts<input className="np-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /><small>Asia/Kuala_Lumpur · {fmt(start)}</small></label>

      <div className="ad-impact">
        <Icon name="chart" size={22} />
        <span>
          <b>About {est.toLocaleString("en-MY")} credits a month</b>
          Based on last 30 days of {m.trigger} events.
        </span>
      </div>
      {est > BUDGET && <div className="v2-alert"><Icon name="alert" size={18} /><span>Over the {BUDGET.toLocaleString("en-MY")}-credit monthly budget. Lower the reward or add a cap.</span></div>}

      <div className="v2-alert" style={{ background: "var(--surface2)", color: "var(--body)" }}>
        <Icon name="shield" size={18} />
        <span>Changes apply to new starts only. Earned rewards never change.</span>
      </div>

      <div className="v2-row">
        <button type="button" className="np-btn" disabled={!m.title.trim() || !m.goal.trim() || !reward} onClick={() => onSave(m, "Live", start)}><Icon name="cal" size={17} /> Schedule</button>
        <button type="button" className="ad-btn-ghost" disabled={!m.title.trim()} onClick={() => onSave(m, "Draft", start)}>Save Draft</button>
      </div>
    </Sheet>
  );
}
