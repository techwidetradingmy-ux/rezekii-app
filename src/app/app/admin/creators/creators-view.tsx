"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CreatorRow } from "@/modules/admin/creators.ts";
import { Emblem } from "../../../emblems";
import { n } from "../../marketplace/format";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../accounts/accounts.css";
import "../admin.css";

const COLORS = ["#7c3aed", "#e8005a", "#0e7490", "#334155", "#be185d", "#a16207", "#b45309", "#0f766e"];
const colorOf = (s: string) => COLORS[[...s].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length];
const LEVEL: Record<CreatorRow["level"], string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const TABS = ["Waiting", "Waitlist", "Approved", "Rejected", "Admins", "All"];
const ACCESS: Record<CreatorRow["access"], [string, string]> = { waiting: ["Waiting for approval", "b-amber"], approved: ["Approved", "b-green"], rejected: ["Rejected", "b-red"], waitlist: ["Waitlist", "b-gray"], invited: ["Invited to link", "b-blue"], none: ["TikTok Shop not linked", "b-gray"] };
const ago = (iso: string, now: number) => {
  const d = Math.floor((now - Date.parse(iso)) / 86400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 30 ? `${d} days ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
};
/** Exact date and time (Malaysia), so an admin can tell which account they just created. */
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const methods = (c: CreatorRow) => [c.google && "Google", c.tiktokLogin && `TikTok ${c.tiktokLogin}`, c.password && (c.loginEmail ? `Email ${c.loginEmail}` : "Email and password")].filter(Boolean).join(" · ") || "—";
const socialOf = (c: CreatorRow, platform: string) => c.social.filter((s) => s.platform === platform).map((s) => `${s.name}${s.active ? "" : " (reconnect)"}`).join(", ") || "Not connected";
/** Accounts that sign in with email and password alone: the only ones that can be made admin here. */
const emailOnly = (c: CreatorRow) => c.password && !c.google && !c.tiktokLogin && !c.admin;

function Avatar({ c, size }: { c: CreatorRow; size: number }) {
  return c.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: colorOf(c.handle), color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>{c.handle.replace("@", "").charAt(0).toUpperCase()}</span>
  );
}

/** Creator accounts, as designed in the mockup (Creators): TikTok Shop places, summary, list and the creator panel. */
export function CreatorsView({ creators, places, auto, now }: { creators: CreatorRow[]; places: number; auto: boolean; now: number }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CreatorRow | null>(null);
  const [closing, setClosing] = useState(false);
  const [alert, setAlert] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [newPw, setNewPw] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const used = Math.min(places, 25);
  const waitlist = creators.filter((c) => c.access === "waitlist" || c.access === "invited").sort((a, b) => (a.requestedAt ?? "").localeCompare(b.requestedAt ?? ""));
  const inTab = [(c: CreatorRow) => c.access === "waiting", (c: CreatorRow) => c.access === "waitlist" || c.access === "invited", (c: CreatorRow) => c.access === "approved", (c: CreatorRow) => c.access === "rejected", (c: CreatorRow) => c.admin, () => true];
  const s = q.trim().toLowerCase();
  const shown = creators.filter((c) => inTab[tab](c) && (!s || [c.handle, c.name, c.email, c.loginEmail, c.tiktokAccount, c.shopAccount, ...c.social.map((x) => x.name)].join(" ").toLowerCase().includes(s)));
  const counts = inTab.map((f) => creators.filter(f).length);

  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function decide(c: CreatorRow, approve: boolean) {
    if (!approve && !reason.trim()) return flash("Add a reason the creator will see", false);
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: approve ? "approve" : "reject", reason: approve ? undefined : reason.trim() }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; invited?: string | null };
    setBusy(false);
    if (!r.ok) return flash(j.error || "Could not save the decision.", false);
    setRejecting(null);
    setReason("");
    flash(approve ? `${c.handle} approved` : j.invited ? `Place freed · ${j.invited} invited to link TikTok Shop` : `${c.handle} rejected`);
    router.refresh();
  }
  async function setAuto(on: boolean) {
    setBusy(true);
    const r = await fetch("/api/admin/creators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ auto: on }) });
    setBusy(false);
    if (!r.ok) return flash("Could not change the setting.", false);
    flash(on ? "New creators are approved automatically" : "New creators wait for your approval");
    router.refresh();
  }

  async function gold(c: CreatorRow, invited: boolean) {
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gold: invited }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return flash(j.error || "Could not change the invitation.", false);
    flash(invited ? `${c.handle} is now Gold` : `Gold invitation withdrawn · ${c.handle} moves at the next daily update`);
    setOpen({ ...c, goldInvited: invited, level: invited ? "gold" : c.level });
    router.refresh();
  }
  async function setPassword(c: CreatorRow) {
    if (busy || !newPw) return;
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: newPw }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return flash(j.error || "Could not set the password.", false);
    setNewPw("");
    flash(`New password set for ${c.email ?? c.handle} · their other sign-ins ended`);
  }
  async function grantAdmin() {
    if (!open || busy) return;
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${open.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ admin: true }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setMakeAdmin(false);
    if (!r.ok) return flash(j.error || "Could not make this account an admin.", false);
    flash(`${open.email ?? open.handle} is now an admin · listed in Settings → Admins`);
    closePanel();
    router.refresh();
  }
  async function remove() {
    if (!open || busy || typed.trim() !== "DELETE") return;
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${open.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setAlert(false);
    if (!r.ok) return flash(j.error || "Could not remove the account.", false);
    flash(`${open.handle} removed`);
    closePanel();
    router.refresh();
  }

  const summary = [
    ["Waiting", counts[0], "var(--amber)", 0],
    ["Waitlist", counts[1], "var(--text)", 1],
    ["Approved", counts[2], "var(--gink)", 2],
    ["Rejected", counts[3], "var(--red)", 3],
  ] as const;

  return (
    <>
      <div>
        <h1 className="nv-title">Creators</h1>
        <p className="nv-sub">Approve each creator account · manage the waitlist for TikTok Shop places</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
        <section className="nv-up nv-card" aria-label={`${used} of 25 TikTok Shop places used`} style={{ flex: "1 1 340px", boxShadow: "var(--shadow)", borderRadius: 26, padding: 22, display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="110" height="110" viewBox="0 0 96 96" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--seg)" strokeWidth="10" />
            <circle cx="48" cy="48" r="40" fill="none" stroke={used >= 25 ? "#f59e0b" : "#00c073"} strokeWidth="10" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset={251.3 * (1 - used / 25)} transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
            <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="800" fill="currentColor" fontFamily="Albert Sans, sans-serif">{used}/25</text>
          </svg>
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>TikTok Shop places</span>
            <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>
              {used >= 25
                ? `All places are taken, so new creators join the waitlist${waitlist.length ? ` (${waitlist.length} waiting)` : ""}. Rejecting or removing an account frees a place, and the next creator on the waitlist is invited automatically.`
                : `${25 - used} ${25 - used === 1 ? "place is" : "places are"} free. Each creator who links TikTok Shop takes one while Rezekii's Shop app is in beta.`}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <button type="button" role="switch" aria-checked={auto} aria-labelledby="crauto" className={`nv-switch${auto ? " on" : ""}`} disabled={busy} onClick={() => setAuto(!auto)}><span /></button>
              <span id="crauto" style={{ fontSize: 13, fontWeight: 700 }}>Approve new creators automatically</span>
            </span>
          </span>
        </section>
        <section className="nv-up nv-card" aria-label="Summary" style={{ animationDelay: "60ms", flex: "2 1 480px", boxShadow: "var(--shadow)", borderRadius: 26, padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
          {summary.map(([k, v, color, i]) => (
            <button key={k} type="button" className="nv-row" onClick={() => setTab(i)} style={{ border: 0, background: "transparent", color: "var(--text)", textAlign: "left", padding: "10px 12px", borderRadius: 16, display: "flex", flexDirection: "column", gap: 4, cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{k}</span>
              <span style={{ fontSize: 32, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{n(v)}</span>
            </button>
          ))}
        </section>
      </div>

      <section className="nv-up nv-card" aria-labelledby="crlist" style={{ animationDelay: "120ms", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <h2 id="crlist" className="nv-h2" style={{ flex: 1, minWidth: 180 }}>Creator accounts</h2>
          <label htmlFor="crq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search creators</label>
          <input id="crq" type="text" className="nv-input" placeholder="Search handle, name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240, maxWidth: "100%" }} />
          <div className="nv-seg" role="group" aria-label="Status" style={{ width: 660, maxWidth: "100%" }}>
            <span className="nv-segthumb" aria-hidden="true" style={{ width: `calc(${100 / TABS.length}% - 1px)`, transform: `translateX(${tab * 100}%)` }} />
            {TABS.map((label, i) => <button key={label} type="button" className={tab === i ? "on" : ""} aria-pressed={tab === i} onClick={() => setTab(i)}>{label} {counts[i]}</button>)}
          </div>
        </div>
        {shown.map((c) => (
          <div key={c.id} className="nv-row" style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
            <button type="button" onClick={() => { setClosing(false); setNewPw(""); setOpen(c); }} style={{ border: 0, background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 14, color: "var(--text)", textAlign: "left", flex: 1, minWidth: 240, cursor: "pointer" }}>
              <Avatar c={c} size={44} />
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800, overflowWrap: "anywhere" }}>{c.handle} {c.name !== c.handle.replace("@", "") && <span style={{ fontWeight: 600, color: "var(--muted)" }}>· {c.name}</span>}</span>
                <span style={{ fontSize: 13, color: "var(--muted)", overflowWrap: "anywhere" }}>{c.email && c.email !== c.handle ? `${c.email} · ` : ""}Joined {ago(c.joined, now)}{c.links ? ` · ${n(c.links)} links made` : ""}{c.samples ? ` · ${n(c.samples)} samples` : ""}</span>
              </span>
            </button>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {c.admin && <span className="nv-badge b-blue">Admin</span>}
              <span className={`nv-badge ${c.shop ? "b-green" : "b-gray"}`}>{c.shop ? "TikTok Shop linked" : "TikTok Shop not linked"}</span>
              <span className={`nv-badge ${c.tiktok ? "b-blue" : "b-gray"}`}>{c.tiktok ? "TikTok connected" : "TikTok not connected"}</span>
              <span className={`nv-badge ${c.level === "gold" ? "b-amber" : "b-gray"}`}>{LEVEL[c.level]}{c.goldInvited && c.level !== "gold" ? " · Gold invited" : ""}</span>
            </span>
            {c.access === "waiting" && rejecting !== c.id ? (
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => { setRejecting(c.id); setReason(""); }} style={{ color: "var(--red)" }}>Reject</button>
                <button type="button" className="nv-btn nv-sm nv-press" disabled={busy} onClick={() => decide(c, true)}>Approve</button>
              </span>
            ) : c.access !== "waiting" && c.access !== "none" ? (
              <span className={`nv-badge ${ACCESS[c.access][1]}`}>{c.access === "waitlist" ? `Waitlist #${waitlist.findIndex((w) => w.id === c.id) + 1}` : c.access === "invited" ? "Invited · waiting for them to link" : ACCESS[c.access][0]}</span>
            ) : null}
          </div>
          {rejecting === c.id && (
            <div className="nv-expand" style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 58 }}>
              <label htmlFor={`crwhy-${c.id}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Reason for rejecting {c.handle}</label>
              <input id={`crwhy-${c.id}`} type="text" className="nv-input" placeholder="Reason the creator will see" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1, minWidth: 240, height: 40 }} />
              <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setRejecting(null)} style={{ height: 40 }}>Cancel</button>
              <button type="button" className="nv-btnd nv-sm nv-press" disabled={busy} onClick={() => decide(c, false)} style={{ height: 40 }}>Send rejection</button>
            </div>
          )}
          {c.access === "rejected" && c.reason && <span style={{ paddingLeft: 58, fontSize: 13, color: "var(--muted)" }}>Reason sent: &ldquo;{c.reason}&rdquo; · they can link again to ask again</span>}
          </div>
        ))}
        {!shown.length && <div style={{ padding: 32, borderTop: "1px solid var(--line)", textAlign: "center", color: "var(--muted)" }}>{s ? `No creators match "${q}".` : "Nobody here right now."}</div>}
      </section>

      {open && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="crpt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`nv-badge ${open.level === "gold" ? "b-amber" : "b-gray"}`}>{LEVEL[open.level]}</span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar c={open} size={56} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <h3 id="crpt" style={{ margin: 0, fontSize: 20, fontWeight: 800, overflowWrap: "anywhere" }}>{open.handle}</h3>
                <span style={{ fontSize: 14, color: "var(--muted)", overflowWrap: "anywhere" }}>{open.name} · {open.signIn}</span>
              </span>
            </div>
            <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
              {([
                ["Email", open.email ?? "—"],
                ["Admin access", open.admin ? "Yes · manage in Settings → Admins" : "No"],
                ["Signs in with", methods(open)],
                ["TikTok Shop", open.shopAccount ? `${open.shopAccount} · linked` : "Not linked"],
                ["Status", ACCESS[open.access][0]],
                ["TikTok (posting)", open.tiktokAccount ?? "Not connected"],
                ["Facebook", socialOf(open, "facebook")],
                ["Instagram", socialOf(open, "instagram")],
                ["Threads", socialOf(open, "threads")],
                ["Level", `${LEVEL[open.level]}${open.goldInvited ? " · Gold invited" : ""}`],
                ["Links made", n(open.links)],
                ["Samples asked for", n(open.samples)],
                ["Last sign-in", open.lastSignIn ? when(open.lastSignIn) : "—"],
                ["Joined", when(open.joined)],
              ] as const).map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border)" : 0, fontSize: 14 }}>
                  <span style={{ color: "var(--muted)", flexShrink: 0 }}>{k}</span><span style={{ fontWeight: 700, textAlign: "right", overflowWrap: "anywhere" }}>{v}</span>
                </div>
              ))}
            </div>
            {open.password && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 18, background: "var(--surface2)" }}>
                <span style={{ fontWeight: 800 }}>Set a new password</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>For when they forget it. Tell them the new one; their other sign-ins end. Passwords are never shown, only replaced.</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <label htmlFor="crpw" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>New password for {open.email ?? open.handle}</label>
                  <input id="crpw" type="password" className="nv-input" autoComplete="new-password" placeholder="At least 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPassword(open)} style={{ flex: "1 1 180px", height: 40 }} />
                  <button type="button" className="nv-btn2 nv-sm nv-press" disabled={busy || !newPw} onClick={() => setPassword(open)} style={{ height: 40 }}>Set password</button>
                </span>
              </div>
            )}
            {emailOnly(open) && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, padding: 16, borderRadius: 18, background: "var(--surface2)" }}>
                <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 800 }}>Admin access</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Only for an account you created yourself: anyone can sign up with any email address. This one was created {when(open.joined)}.</span>
                </span>
                <button type="button" className="nv-btn2 nv-sm nv-press" disabled={busy} onClick={() => setMakeAdmin(true)}>Make admin</button>
              </div>
            )}
            {!open.admin && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, background: open.goldInvited ? "#fff8e1" : "var(--surface2)", color: open.goldInvited ? "#3d2a00" : "var(--text)" }}>
              <Emblem level="gold" size={44} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 800 }}>{open.goldInvited ? "Invited to Gold" : "Gold is by invitation"}</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>{open.goldInvited ? "They stay Gold until the invitation is withdrawn." : "Invite creators who sell well and you want to keep."}</span>
              </span>
              <button type="button" className={open.goldInvited ? "nv-btn2 nv-sm nv-press" : "nv-btn nv-sm nv-press"} disabled={busy} onClick={() => gold(open, !open.goldInvited)}>{open.goldInvited ? "Withdraw" : "Invite to Gold"}</button>
            </div>
            )}
            {!open.admin && <button type="button" className="nv-link" onClick={() => { setTyped(""); setAlert(true); }} style={{ color: "var(--red)", alignSelf: "flex-start" }}>Remove this creator from Rezekii</button>}
          </div>
        </>
      )}

      {makeAdmin && open && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setMakeAdmin(false)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="cradm">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="cradm" style={{ fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>Make {open.email ?? open.handle} an admin?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>Created {when(open.joined)}. It will see every creator and can post to connected Pages, signing in with its email and password. Only continue if you created this account. Remove admin any time in Settings → Admins.</span>
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setMakeAdmin(false)}>Cancel</button>
              <button type="button" onClick={grantAdmin} disabled={busy}>Make admin</button>
            </div>
          </div>
        </>
      )}

      {alert && open && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setAlert(false)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="crat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="crat" style={{ fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>Remove {open.handle}?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>Their Rezekii account, connections, posts, link history and samples are deleted, and their TikTok Shop place is freed. Type DELETE to confirm.</span>
              <label htmlFor="crtype" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Type DELETE to confirm</label>
              <input id="crtype" type="text" className="nv-input" placeholder="Type DELETE" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" style={{ height: 38, marginTop: 8, textAlign: "center", background: "var(--surface)" }} />
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(false)}>Cancel</button>
              <button type="button" className="danger" onClick={remove} disabled={busy || typed.trim() !== "DELETE"} style={{ opacity: busy || typed.trim() !== "DELETE" ? 0.4 : 1 }}>Remove</button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
