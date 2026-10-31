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
  campaign: { commission: number; description: string };
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
function SellerCampaignCard({ value }: { value: { commission: number; description: string } }) {
  const { toast } = useDemo();
  const [rate, setRate] = useState(String(value.commission));
  const [text, setText] = useState(value.description);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaign: { commission: Number(rate), description: text } }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    toast(r?.ok ? "Saved. New shops' campaigns use this." : x?.error ?? "Didn't save. Please try again.");
  };
  return (
    <section className="v2-card" style={{ gap: 12 }}>
      <div className="v2-card-h"><h2 className="v2-h2">New Seller Campaigns</h2><span className="v2-small">Made when a shop connects Seller Center</span></div>
      <p className="v2-small" style={{ margin: 0 }}>Each shop gets its own public campaign, &quot;Techwide X [shop]&quot;. Every seller in Seller Center can see the description. {"{shop}"} becomes the shop&apos;s name.</p>
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
