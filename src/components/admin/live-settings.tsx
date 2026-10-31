"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Pill } from "@/components/admin/bits";
import { when } from "@/components/admin/live-lists";

type Settings = {
  health: { lines: { label: string; value: string; ok: boolean }[]; refresh: { runDate: string | null; done: number; open: number; failed: number; lastAt: string | null }; errors: { title: string; when: string; detail: string }[] };
  jobs: { name: string; every: string; last: string | null }[];
  times: string[];
  auto: boolean;
  benefits: { label: string; v: [string, string, string]; key?: boolean }[];
  campaign: { name: string; commission: number; description: string };
  rules: { welcome: number; life: number; post: number; referral: { inviter: number; friend: number }; referralDays: number; starterDays: number };
};

/**
 * System › Settings on real data (owner, 31 Oct 2026): what's connected and running, the settings that really change how
 * Rezekii works (posting times, automatic approval), and the rules in use. Rules set in code are shown, not edited here.
 */
export function LiveSettings() {
  const { toast } = useDemo();
  const [d, setD] = useState<Settings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("20:00");
  const load = () =>
    fetch("/api/v2/admin/data?part=settings", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { data: Settings }) => { setD(x.data); setTimes(x.data.times); })
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load the settings. Please try again."));
  useEffect(() => { void load(); }, []);

  const saveTimes = async (list: string[]) => {
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ times: list }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string; times?: string[] } | null;
    if (!r?.ok) return toast(x?.error ?? "Didn't save. Please try again.");
    setTimes(x?.times ?? list);
    toast("Posting times saved");
  };
  const setAuto = async (auto: boolean) => {
    const r = await fetch("/api/admin/creators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ auto }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't save. Please try again.");
    toast(auto ? "New creators are approved automatically" : "New creators wait for a person");
    void load();
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Settings" sub="What's connected and running, and the settings that change how Rezekii works. Changes are logged.">
        <Link href="/admin/system/audit" className="ad-btn-ghost"><Icon name="doc" size={15} /> Audit log</Link>
      </Title>
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Connections</h2></div>
            <div className="ad-list">
              {d.health.lines.map((l) => (
                <div key={l.label} className="ad-row"><span className="main"><b>{l.label}</b><small>{l.value}</small></span>{l.ok ? <Pill tone="ok">OK</Pill> : <Pill tone="bad">Check</Pill>}</div>
              ))}
            </div>
          </section>

          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Scheduled Jobs</h2><span className="v2-small">Daily refresh {d.health.refresh.runDate ?? "not run yet"}: {d.health.refresh.done} done, {d.health.refresh.open} running, {d.health.refresh.failed} failed</span></div>
            <div className="ad-list">
              {d.jobs.map((j) => <div key={j.name} className="ad-row"><span className="main"><b>{j.name}</b><small>{j.every} · last {when(j.last)}</small></span></div>)}
            </div>
            {d.health.errors.length > 0 && (
              <div className="ad-list">
                {d.health.errors.map((e, i) => <div key={i} className="v2-alert red" style={{ padding: "10px 14px" }}><span>{e.title} · {e.when} · {e.detail}</span></div>)}
              </div>
            )}
          </section>

          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">Recommended Posting Times</h2><span className="v2-small">Malaysia time, shown in New Post</span></div>
            <div className="v2-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {times.map((t) => (
                <span key={t} className="badge" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {t}
                  <button type="button" className="v2-iconbtn" aria-label={`Remove ${t}`} disabled={times.length <= 1} onClick={() => void saveTimes(times.filter((x) => x !== t))}><Icon name="x" size={12} /></button>
                </span>
              ))}
            </div>
            <form className="v2-row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (!times.includes(newTime)) void saveTimes([...times, newTime]); }}>
              <input type="time" className="np-input" style={{ width: "auto" }} value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="New posting time" />
              <button type="submit" className="btn-outline v2-btn-sm" disabled={times.includes(newTime) || times.length >= 12}><Icon name="plus" size={15} /> Add time</button>
            </form>
          </section>

          <section className="v2-card">
            <div className="ad-row" style={{ padding: 0 }}>
              <span className="main"><b>Approve new creators automatically</b><small>Off: each creator who links TikTok Shop waits in Users › Review.</small></span>
              <button type="button" role="switch" aria-checked={d.auto} aria-label="Approve new creators automatically" className={`np-switch ${d.auto ? "on" : ""}`} onClick={() => void setAuto(!d.auto)}><span /></button>
            </div>
          </section>

          <AnnouncementsCard />
          <SellerCampaignCard value={d.campaign} />

          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-card-h" style={{ padding: "0 8px" }}><h2 className="v2-h2">Level Benefits</h2><span className="v2-small">What creators see on Level & Badges</span></div>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Benefit</th><th>Bronze</th><th>Silver</th><th>Gold</th></tr></thead>
                <tbody>{d.benefits.map((b) => <tr key={b.label}><td><b>{b.label}</b></td>{b.v.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Rules in Use</h2><span className="v2-small">Set in code; ask the developer to change</span></div>
            <div className="ad-list">
              {[
                ["Welcome credits", `${d.rules.welcome} for each new account`],
                ["Credits last", `${d.rules.life} days; the oldest are used first`],
                ["Post Everywhere", `${d.rules.post} credits per app; refunded if a post fails or is cancelled`],
                ["Referral reward", `${d.rules.referral.inviter} credits each, when the friend links TikTok Shop within ${d.rules.referralDays} days`],
                ["Starter missions", `Open for the first ${d.rules.starterDays} days`],
                ["TAP campaigns", "Always open to every shop, local and cross-border"],
              ].map(([k, v]) => <div key={k} className="ad-row"><span className="main"><b>{k}</b><small>{v}</small></span></div>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * New seller campaigns (owner, 31 Oct 2026): every shop that connects Seller Center gets a public campaign "Techwide X [shop]"
 * with this commission and description. {shop} becomes the shop's name. Campaigns already made keep their own text.
 */
function SellerCampaignCard({ value }: { value: { name: string; commission: number; description: string } }) {
  const { toast } = useDemo();
  const [name, setName] = useState(value.name);
  const [rate, setRate] = useState(String(value.commission));
  const [text, setText] = useState(value.description);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaign: { name, commission: Number(rate), description: text } }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    toast(r?.ok ? "Saved. New shops' campaigns use this." : x?.error ?? "Didn't save. Please try again.");
  };
  return (
    <section className="v2-card" style={{ gap: 12 }}>
      <div className="v2-card-h"><h2 className="v2-h2">New Seller Campaigns</h2><span className="v2-small">Made when a shop connects Seller Center</span></div>
      <p className="v2-small" style={{ margin: 0 }}>Each shop gets its own public campaign. Every seller in Seller Center can see its name and description. {"{shop}"} becomes the shop&apos;s name and {"{creators}"} the number of creators linked on Rezekii; TikTok cuts names at 49 characters.</p>
      <label className="v2-small" style={{ display: "grid", gap: 6, maxWidth: 420 }}>Campaign name
        <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Campaign name" />
      </label>
      <label className="v2-small" style={{ display: "grid", gap: 6, maxWidth: 220 }}>Campaign commission (%)
        <input className="np-input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Campaign commission" />
      </label>
      <label className="v2-small" style={{ display: "grid", gap: 6 }}>Description ({text.length}/900)
        <textarea className="np-input" rows={7} maxLength={900} value={text} onChange={(e) => setText(e.target.value)} aria-label="Campaign description" />
      </label>
      <button type="button" className="np-btn v2-btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</button>
    </section>
  );
}

type Ann = { id: string; title: string; body: string; level: "info" | "important"; audience: string; starts_at: string; ends_at: string | null; created_by: string | null };
/**
 * Announcements (owner, 31 Oct 2026): a message to everyone, e.g. when TikTok's data is late. It shows in every user's
 * notifications under System until it's ended. Late or failed daily updates are announced on their own.
 */
function AnnouncementsCard() {
  const { toast } = useDemo();
  const [list, setList] = useState<Ann[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<"info" | "important">("important");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState(false);
  const load = () => fetch("/api/v2/admin/announcements", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setList(d?.list ?? [])).catch(() => setList([]));
  useEffect(() => { void load(); }, []);
  const send = async (method: "POST" | "PATCH", body: Record<string, string>) => {
    setBusy(true);
    const r = await fetch("/api/v2/admin/announcements", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) return toast(x?.error ?? "Didn't save. Please try again.");
    toast(method === "POST" ? "Posted. Everyone sees it in Notifications." : "Ended");
    if (method === "POST") { setTitle(""); setBody(""); }
    void load();
  };
  const active = (a: Ann) => !a.ends_at || Date.parse(a.ends_at) > Date.now();
  return (
    <section className="v2-card" style={{ gap: 12 }}>
      <div className="v2-card-h"><h2 className="v2-h2">Announcements</h2><span className="v2-small">Shown in Notifications under System</span></div>
      <p className="v2-small" style={{ margin: 0 }}>Late or failed daily data updates are announced automatically after 2:00 AM.</p>
      <input className="np-input" maxLength={80} placeholder="Title, e.g. TikTok data is late today" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      <textarea className="np-input" rows={3} maxLength={300} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message" />
      <div className="v2-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select className="np-input" style={{ width: 170 }} value={level} onChange={(e) => setLevel(e.target.value as "info" | "important")} aria-label="Level">
          <option value="important">Important</option>
          <option value="info">Info</option>
        </select>
        <select className="np-input" style={{ width: 170 }} value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Who sees it">
          <option value="all">Everyone</option>
          <option value="creator">Creators</option>
          <option value="seller">Sellers</option>
        </select>
        <button type="button" className="np-btn v2-btn-sm" disabled={busy || title.trim().length < 3 || body.trim().length < 3} onClick={() => void send("POST", { title, body, level, audience })}>Post</button>
      </div>
      <div className="ad-list">
        {(list ?? []).slice(0, 6).map((a) => (
          <div key={a.id} className="ad-row">
            <span className="main"><b>{a.title}</b><small>{a.body}</small><small>{a.level === "important" ? "Important" : "Info"} · {a.audience === "all" ? "Everyone" : a.audience === "creator" ? "Creators" : "Sellers"} · {when(a.starts_at)}{a.created_by ? ` · ${a.created_by}` : ""}</small></span>
            {active(a) ? <button type="button" className="btn-outline v2-btn-sm" disabled={busy} onClick={() => void send("PATCH", { id: a.id })}>End</button> : <Pill tone="mute">Ended</Pill>}
          </div>
        ))}
        {list && !list.length && <p className="v2-muted" style={{ margin: 0 }}>None yet.</p>}
      </div>
    </section>
  );
}
