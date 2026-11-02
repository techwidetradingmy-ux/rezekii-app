"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Chips, Pill, Switch } from "@/components/admin/bits";
import { rm } from "@/lib/mock";
import { SUPPORT } from "@/lib/support";

type Status = "draft" | "upcoming" | "live" | "ended";
type Campaign = { id: string; name: string; status: Status; hidden?: boolean; start: number | null; end: number | null; products: number; creators: number; upto: number; gmvPaid: number; comEst: number };
type Form = { name: string; description: string; start: string; end: string; regEnd: string; commission: number; local: boolean; crossBorder: boolean; shopCodes: string[]; whatsapp: string; email: string; phone: string; startAt?: number | null };
type Filter = "Live" | "Not published" | "Ending in 90 days" | "Ended";
type Outcome = { total: number; ok: string[]; failed: [string, string][] };

const DAY = 86_400;
const MYT = 8 * 3600;
const toDay = (unix: number) => new Date((unix + MYT) * 1000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY * 1000).toISOString().slice(0, 10);
const longDay = (unix: number | null) => (unix ? new Date((unix + MYT) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const daysLeft = (end: number | null) => (end ? Math.ceil((end - Date.now() / 1000) / DAY) : null);
const STATUS: Record<Status, [string, "ok" | "warn" | "mute" | "bad"]> = { draft: ["Not published", "mute"], upcoming: ["Starts soon", "warn"], live: ["Live", "ok"], ended: ["Ended", "mute"] };

/** A new campaign: open to every shop (campaigns are always public, owner 31 Oct 2026), starting today for 90 days. */
const blank = (): Form => {
  const today = toDay(Math.floor(Date.now() / 1000));
  return { name: "", description: "", start: today, end: addDays(today, 90), regEnd: addDays(today, 90), commission: 10, local: true, crossBorder: true, shopCodes: [], whatsapp: SUPPORT.wa, email: SUPPORT.email, phone: "" };
};

/**
 * TAP Campaigns on real data (owner, 31 Oct 2026): Techwide's campaigns as TikTok has them, created, changed and published
 * here instead of Partner Center. Every campaign is open to all shops. Ending soon ones can be pushed to TikTok's latest end.
 */
export function LiveCampaigns() {
  const { toast } = useDemo();
  const [list, setList] = useState<Campaign[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Live");
  const [editing, setEditing] = useState<{ id: string | null; form: Form; status?: string; counts?: { approved: number; pending: number; declined: number } } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState<Outcome | null>(null);
  // Extend automatically each morning (owner, 2 Nov 2026).
  const [auto, setAuto] = useState<boolean | null>(null);

  const load = () =>
    fetch("/api/admin/tap/campaigns", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("Sign in with a Techwide admin account to see the campaigns.")) : r.ok ? r.json() : null))
      .then((d: { campaigns?: Campaign[] } | null) => (d?.campaigns ? setList(d.campaigns) : setFailed("TikTok Shop didn't answer. Please try again.")))
      .catch((e: Error) => setFailed(e.message.startsWith("Sign in") ? e.message : "TikTok Shop didn't answer. Please try again."));
  useEffect(() => { void load(); }, []);
  useEffect(() => { fetch("/api/admin/tap/campaigns/auto", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { on?: boolean } | null) => setAuto(d?.on ?? null)).catch(() => null); }, []);
  const flipAuto = async (on: boolean) => {
    const r = await fetch("/api/admin/tap/campaigns/auto", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ on }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't save. Please try again.");
    setAuto(on);
    toast(on ? "Campaigns ending within 90 days are extended every morning" : "Automatic extending is off");
  };

  const all = (list ?? []).filter((c) => !c.hidden);
  // Within 90 days of the end (owner, 2 Nov 2026). A running campaign can always be extended to 360 days from today.
  const soon = (c: Campaign) => (c.status === "live" || c.status === "upcoming") && (daysLeft(c.end) ?? 999) < 90;
  const ending = all.filter(soon).sort((a, b) => (a.end ?? 0) - (b.end ?? 0));
  const extendable = ending;
  const groups: Record<Filter, Campaign[]> = {
    Live: all.filter((c) => c.status === "live" || c.status === "upcoming"),
    "Not published": all.filter((c) => c.status === "draft"),
    "Ending in 90 days": ending,
    Ended: all.filter((c) => c.status === "ended"),
  };

  const open = async (c: Campaign) => {
    setLoadingId(c.id);
    const r = await fetch(`/api/admin/tap/campaigns/${c.id}`, { cache: "no-store" }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { form?: Form; status?: string; counts?: { approved: number; pending: number; declined: number }; error?: string } | null;
    setLoadingId(null);
    if (!r?.ok || !d?.form) return toast(d?.error ?? "TikTok Shop didn't answer. Please try again.");
    setErr("");
    setEditing({ id: c.id, form: d.form, status: d.status, counts: d.counts });
  };

  const save = async (andPublish: boolean) => {
    if (!editing) return;
    setBusy(true);
    setErr("");
    const r = await fetch(editing.id ? `/api/admin/tap/campaigns/${editing.id}` : "/api/admin/tap/campaigns", {
      method: editing.id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing.form),
    }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (!r?.ok || !d?.id) {
      setBusy(false);
      return setErr(d?.error ?? "TikTok Shop didn't answer. Please try again.");
    }
    if (andPublish) {
      const p = await fetch(`/api/admin/tap/campaigns/${d.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: editing.form.name }) }).catch(() => null);
      const pd = (await p?.json().catch(() => null)) as { error?: string } | null;
      if (!p?.ok) {
        setBusy(false);
        setEditing({ ...editing, id: d.id, status: "READY" });
        return setErr(`Saved, but not published: ${pd?.error ?? "TikTok Shop didn't answer."}`);
      }
    }
    setBusy(false);
    setEditing(null);
    toast(andPublish ? "Published. Shops can register products now." : editing.id ? "Changes saved" : "Saved as not published. Publish it when it's ready.");
    void load();
  };

  const hide = async (c: Campaign) => {
    const r = await fetch(`/api/admin/tap/campaigns/${c.id}/hide`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hide: true }) }).catch(() => null);
    if (!r?.ok) return toast("Couldn't hide it. Please try again.");
    toast("Hidden from this list. TikTok keeps it as a draft.");
    void load();
  };

  const extendAll = async () => {
    setBusy(true);
    const result: Outcome = { total: extendable.length, ok: [], failed: [] };
    for (const c of extendable) {
      const r = await fetch(`/api/admin/tap/campaigns/${c.id}/extend`, { method: "POST" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { error?: string } | null;
      if (r?.ok) result.ok.push(c.id);
      else result.failed.push([c.name, d?.error ?? "TikTok Shop didn't answer."]);
    }
    setOut(result);
    setBusy(false);
    toast(`${result.ok.length} of ${result.total} extended`);
    void load();
  };

  const f = editing?.form;
  const setF = (patch: Partial<Form>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="TAP Campaigns" sub="Techwide's campaigns on TikTok. Create and change them here. Don't let one end by accident.">
        {list && <span className="v2-row" style={{ gap: 8 }}>
          {auto !== null && <span className="v2-row" style={{ gap: 8 }}><Switch on={auto} onChange={(v) => void flipAuto(v)} label="Extend automatically" /><small className="v2-muted">Extend Automatically</small></span>}
          <button type="button" className="btn-outline v2-btn-sm" disabled={busy || !extendable.length} onClick={() => void extendAll()}>
            <Icon name="cal" size={16} /> Extend {extendable.length} Ending Soon
          </button>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setErr(""); setEditing({ id: null, form: blank() }); }}>
            <Icon name="plus" size={16} /> New Campaign
          </button>
        </span>}
      </Title>

      {out && (
        <section className={`v2-card ad-result ${out.failed.length ? "has-fail" : ""}`} aria-live="polite">
          <div className="v2-card-h">
            <h2 className="v2-h2">Extend: Result</h2>
            <button type="button" className="v2-iconbtn" aria-label="Dismiss result" onClick={() => setOut(null)}><Icon name="x" size={16} /></button>
          </div>
          <div className="ad-sum">
            <span>Ending in 90 days {out.total}</span>
            <Icon name="arrow" size={16} />
            <span className="ok"><Icon name="check" size={14} /> {out.ok.length} extended to TikTok&apos;s latest end (360 days from today)</span>
            {out.failed.length > 0 && <span className="bad"><Icon name="x" size={14} /> {out.failed.length} failed</span>}
          </div>
          {out.failed.map(([who, why]) => <div key={who} className="v2-alert red" style={{ padding: "10px 14px" }}><span>{who} · {why}</span></div>)}
        </section>
      )}

      {!list ? (
        <p className="v2-muted">{failed ?? "Loading Techwide's campaigns from TikTok…"}</p>
      ) : (
        <>
          <Chips<Filter> label="Filter campaigns" value={filter} onChange={setFilter} options={(Object.keys(groups) as Filter[]).map((k) => [k, groups[k].length])} />
          <section className="v2-card" style={{ padding: "8px 20px" }}>
            <div className="ad-list">
              {groups[filter].map((c) => {
                const left = daysLeft(c.end);
                const [label, tone] = soon(c) ? ["Ending Soon", "warn" as const] : STATUS[c.status];
                return (
                  <div key={c.id} className="ad-row" style={soon(c) ? { boxShadow: "inset 4px 0 0 #f5a623", paddingLeft: 12, marginLeft: -12 } : undefined}>
                    <span className="main">
                      <b>{c.name}</b>
                      <small>{c.id} · {c.products} product{c.products === 1 ? "" : "s"} · {c.creators} creator{c.creators === 1 ? "" : "s"}{c.gmvPaid ? ` · ${rm(c.gmvPaid, 0)} sales` : ""}{c.upto ? ` · up to ${c.upto / 100}%` : ""}</small>
                    </span>
                    <span className="main" style={{ flex: "0 1 170px" }}>
                      <b className="ad-nowrap">Ends {longDay(c.end)}</b>
                      <small>{c.status === "ended" ? "Ended" : left !== null ? `${left} day${left === 1 ? "" : "s"} left` : ""}</small>
                    </span>
                    <Pill tone={tone}>{label}</Pill>
                    <span className="acts">
                      {c.status !== "ended" && <button type="button" className="ad-btn-ghost" disabled={loadingId === c.id} onClick={() => void open(c)}>{loadingId === c.id ? "Opening…" : c.status === "draft" ? "Edit or Publish" : "Edit"}</button>}
                      {c.status === "draft" && <button type="button" className="ad-btn-ghost" onClick={() => void hide(c)}>Hide</button>}
                    </span>
                  </div>
                );
              })}
              {groups[filter].length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing to show.</p>}
            </div>
          </section>
        </>
      )}
      <p className="v2-small" style={{ margin: 0 }}>Every change goes straight to TikTok and is logged. TikTok can&apos;t delete campaigns; Hide only removes a draft from this list.</p>

      {editing && f && (
        <Sheet title={editing.id ? "Edit Campaign" : "New Campaign"} onClose={() => !busy && setEditing(null)} wide>
          {editing.counts && <p className="v2-small" style={{ margin: 0 }}>{editing.counts.approved} products approved · {editing.counts.pending} waiting for review · {editing.counts.declined} declined</p>}
          <label className="v2-field">Name<input className="np-input" maxLength={49} value={f.name} onChange={(e) => setF({ name: e.target.value })} placeholder="Techwide Home & Living" /></label>
          <label className="v2-field">Description for shops<textarea className="np-input" rows={3} maxLength={1000} value={f.description} onChange={(e) => setF({ description: e.target.value })} placeholder="What creators Techwide brings and what shops get" /></label>
          <div className="v2-row" style={{ gap: 10, alignItems: "flex-end" }}>
            <label className="v2-field" style={{ flex: 1 }}>Starts<input type="date" className="np-input" value={f.start} disabled={!!editing.id && editing.status !== "READY"} onChange={(e) => setF({ start: e.target.value })} /></label>
            <label className="v2-field" style={{ flex: 1 }}>Registration closes<input type="date" className="np-input" value={f.regEnd} onChange={(e) => setF({ regEnd: e.target.value })} /></label>
            <label className="v2-field" style={{ flex: 1 }}>Ends<input type="date" className="np-input" value={f.end} onChange={(e) => setF({ end: e.target.value })} /></label>
          </div>
          <label className="v2-field">Total commission shown to shops (%)<input type="number" className="np-input" min={1.01} max={79.99} step={0.5} value={f.commission} onChange={(e) => setF({ commission: Number(e.target.value) })} /></label>
          <p className="v2-small" style={{ margin: 0 }}>Open to every shop, local and cross-border. A shop&apos;s own commission is a starting point; it can offer any rate.</p>
          <div className="v2-row" style={{ gap: 10 }}>
            <label className="v2-field" style={{ flex: 1 }}>WhatsApp<input className="np-input" value={f.whatsapp} onChange={(e) => setF({ whatsapp: e.target.value })} /></label>
            <label className="v2-field" style={{ flex: 1 }}>Email<input type="email" className="np-input" value={f.email} onChange={(e) => setF({ email: e.target.value })} /></label>
            <label className="v2-field" style={{ flex: 1 }}>Phone (optional)<input className="np-input" value={f.phone} onChange={(e) => setF({ phone: e.target.value })} /></label>
          </div>
          {err && <p className="wf-err" role="alert">{err}</p>}
          <div className="pp-stack">
            {(!editing.id || editing.status === "READY") && (
              <button type="button" className="np-btn" disabled={busy} onClick={() => void save(true)}>{busy ? <span className="sl-spin" /> : "Save and Publish"}</button>
            )}
            <button type="button" className={!editing.id || editing.status === "READY" ? "btn-outline" : "np-btn"} disabled={busy} onClick={() => void save(false)}>
              {editing.id ? "Save changes" : "Save, publish later"}
            </button>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>Publishing shows it to shops in Seller Center. A published campaign can end later, not earlier.</p>
        </Sheet>
      )}
    </div>
  );
}
