"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActivityKind } from "@/modules/admin/admins.ts";
import type { SettingsData } from "@/modules/admin/settings.ts";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import { saveTheme, useTheme } from "../../use-theme";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../accounts/accounts.css";
import "../admin.css";

const TABS = ["Admins", "Posting times", "Activity log", "System health", "Appearance"];
const KIND_CLS: Record<ActivityKind, string> = { Posts: "b-green", Creators: "b-amber", Admins: "b-gray", Connections: "b-blue" };
const COLORS = ["#00874f", "#7c3aed", "#0e7490", "#b45309", "#be185d", "#334155"];
const label12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const when = (iso: string | null, now: number) => {
  if (!iso) return "not yet";
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });
};

/** Admin Settings, as designed in the mockup: admins, posting times, activity log, system health and appearance. */
export function SettingsView({ d, me, startTab }: { d: SettingsData; me: string; startTab: number }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const theme = useTheme();
  const [tab, setTab] = useState(startTab);
  const [newEmail, setNewEmail] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const [times, setTimes] = useState(d.times);
  const [newTime, setNewTime] = useState("");
  const [lq, setLq] = useState("");
  const [lf, setLf] = useState<"All" | ActivityKind>("All");
  const [openErr, setOpenErr] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  async function call(url: string, init: RequestInit, ok: string) {
    setBusy(true);
    const r = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
    const j = (await r.json().catch(() => ({}))) as { error?: string; times?: string[] };
    setBusy(false);
    if (!r.ok) {
      flash(j.error || "Something went wrong. Please try again.", false);
      return null;
    }
    flash(ok);
    router.refresh();
    return j;
  }
  async function addAdmin() {
    const em = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return flash("Enter a valid email address", false);
    if (d.admins.some((a) => a.email === em)) return flash("Already an admin", false);
    if (await call("/api/admin/admins", { method: "POST", body: JSON.stringify({ email: em }) }, `${em} can sign in with Google as admin`)) setNewEmail("");
  }
  async function saveTimes(next: string[], msg: string) {
    const j = await call("/api/admin/settings", { method: "PUT", body: JSON.stringify({ times: next }) }, msg);
    if (j?.times) setTimes(j.times);
  }
  const q = lq.trim().toLowerCase();
  const log = d.activity.filter((a) => (lf === "All" || a.kind === lf) && (!q || `${a.actor} ${a.what}`.toLowerCase().includes(q)));
  const themeIdx = theme === "light" ? 0 : theme === "dark" ? 1 : 2;

  return (
    <>
      <div>
        <h1 className="nv-title">Settings</h1>
        <p className="nv-sub">Admins, posting times, activity log and system health</p>
      </div>

      <section className="nv-up nv-card nv-noscroll" aria-label="Settings sections" role="tablist" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: 10, display: "flex", gap: 6, overflowX: "auto" }}>
        {TABS.map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={tab === i} className={`nv-chip nv-press${tab === i ? " on" : ""}`} onClick={() => setTab(i)} style={{ height: 40, padding: "0 16px", fontSize: 14 }}>{label}</button>
        ))}
      </section>

      {tab === 0 && (
        <section className="nv-up nv-card" aria-labelledby="stadm" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 22px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 4 }}>
              <h2 id="stadm" className="nv-h2">Admins</h2>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Anyone on this list can sign in with Google as an admin. All admins can do everything.</span>
            </span>
            <form action="/api/auth/signout" method="post" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Signed in as {me}</span>
              <button type="submit" className="nv-btn2 nv-sm nv-press">Sign out</button>
            </form>
          </div>
          {d.admins.map((a, i) => (
            <div key={a.email} className="nv-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "14px 22px", borderTop: "1px solid var(--line)" }}>
              <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS[i % COLORS.length], color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{a.email.charAt(0).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{a.email}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {a.email === me.toLowerCase() ? "You · " : ""}
                  {a.fixed ? "Set in Rezekii's server settings" : `Added by ${a.addedBy ?? "an admin"}${a.addedAt ? ` on ${new Date(a.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}` : ""}`}
                </span>
              </span>
              <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setRemove(a.email)} disabled={a.fixed || a.email === me.toLowerCase()} style={{ color: "var(--red)" }}>Remove</button>
            </div>
          ))}
          <div style={{ padding: "16px 22px 20px", borderTop: "1px solid var(--line)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <label htmlFor="stnew" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>New admin Gmail address</label>
            <input id="stnew" type="email" className="nv-input" placeholder="name@gmail.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAdmin()} style={{ flex: "1 1 260px" }} />
            <button type="button" className="nv-btn nv-press" onClick={addAdmin} disabled={busy}>Add admin</button>
            <span style={{ flexBasis: "100%", fontSize: 13, color: "var(--muted)" }}>New admins get admin access the next time they sign in with Google.</span>
          </div>
        </section>
      )}

      {tab === 1 && (
        <section className="nv-up nv-card" aria-labelledby="sttimes" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 id="sttimes" className="nv-h2">Recommended posting times</h2>
            <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>One set for all of Rezekii, Malaysia time. When someone picks &ldquo;Use recommended time&rdquo;, Rezekii takes the next free one.</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {times.map((t) => (
              <span key={t} className="nv-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 8px 0 16px", borderRadius: 999, background: "var(--gsoft)", color: "var(--gink)", fontWeight: 800, fontSize: 16 }}>
                {label12(t)}
                <button type="button" aria-label={`Remove ${label12(t)}`} disabled={times.length <= 1 || busy} onClick={() => saveTimes(times.filter((x) => x !== t), `${label12(t)} removed`)} style={{ width: 28, height: 28, borderRadius: "50%", border: 0, background: "var(--surface)", color: "var(--gink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: times.length <= 1 ? 0.4 : 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <label htmlFor="stnewtime" className="nv-label">Add a time</label>
            <input id="stnewtime" type="time" className="nv-input" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ width: 160 }} />
            <button
              type="button"
              className="nv-btn2 nv-press"
              disabled={busy}
              onClick={() => {
                if (!newTime) return flash("Pick a time first", false);
                if (times.includes(newTime)) return flash("That time is already on the list", false);
                saveTimes([...times, newTime], `${label12(newTime)} added`).then(() => setNewTime(""));
              }}
            >
              Add
            </button>
          </div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Keep at least one time. Changes apply to posts scheduled from now on.</span>
        </section>
      )}

      {tab === 2 && (
        <section className="nv-up nv-card" aria-labelledby="stlog" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 22px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 id="stlog" className="nv-h2">Activity log</h2>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Who did what and when · kept for 90 days</span>
            </span>
            <label htmlFor="stlq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search activity</label>
            <input id="stlq" type="text" className="nv-input" placeholder="Search" value={lq} onChange={(e) => setLq(e.target.value)} style={{ width: 220, maxWidth: "100%" }} />
          </div>
          <div className="nv-noscroll" role="group" aria-label="Type" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 22px 14px" }}>
            {(["All", "Posts", "Creators", "Admins", "Connections"] as const).map((k) => (
              <button key={k} type="button" className={`nv-chip nv-press${lf === k ? " on" : ""}`} aria-pressed={lf === k} onClick={() => setLf(k)}>{k}</button>
            ))}
          </div>
          {log.map((l, i) => (
            <div key={i} className="nv-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderTop: "1px solid var(--line)" }}>
              <span className={`nv-badge ${KIND_CLS[l.kind]}`} style={{ width: 96, justifyContent: "center", flexShrink: 0 }}>{l.kind}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, overflowWrap: "anywhere" }}><strong>{l.actor}</strong> {l.what}</span>
              <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{when(l.at, d.now)}</span>
            </div>
          ))}
          {!log.length && <div style={{ padding: 28, textAlign: "center", color: "var(--muted)", borderTop: "1px solid var(--line)" }}>{d.activity.length ? "Nothing matches." : "Nothing logged yet."}</div>}
        </section>
      )}

      {tab === 3 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          <section className="nv-up nv-card" aria-labelledby="stjobs" style={{ flex: "999 1 560px", minWidth: 0, overflow: "hidden" }}>
            <h2 id="stjobs" className="nv-h2" style={{ padding: "20px 22px 12px" }}>Background jobs</h2>
            {d.jobs.map((j) => (
              <div key={j.name} className="nv-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 22px", borderTop: "1px solid var(--line)" }}>
                <span className={j.last ? "nv-dot" : "nv-doto"} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 700 }}>{j.name}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{j.every} · last run {when(j.last, d.now)}</span>
                </span>
              </div>
            ))}
            <div style={{ padding: "12px 22px 18px", borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
              Daily refresh {d.health.refresh.runDate ? `for ${d.health.refresh.runDate}: ${d.health.refresh.done} done, ${d.health.refresh.open} waiting or running, ${d.health.refresh.failed} failed` : "hasn't run yet"}.
            </div>
          </section>
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 24 }}>
            <section className="nv-up nv-card" aria-labelledby="stapi" style={{ overflow: "hidden" }}>
              <h2 id="stapi" className="nv-cap" style={{ padding: "18px 22px 8px" }}>Connections to TikTok</h2>
              {d.health.lines.map((h, i) => (
                <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", borderTop: i ? "1px solid var(--line)" : 0 }}>
                  <span className={h.ok ? "nv-dot" : "nv-dotr"} aria-hidden="true" />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{h.label}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)", textAlign: "right" }}>{h.value}</span>
                </div>
              ))}
            </section>
            <section className="nv-up nv-card" aria-labelledby="sterr" style={{ overflow: "hidden" }}>
              <h2 id="sterr" className="nv-cap" style={{ padding: "18px 22px 8px" }}>Recent errors</h2>
              {d.health.errors.map((er, i) => (
                <div key={i} style={{ borderTop: "1px solid var(--line)" }}>
                  <button type="button" className="nv-row" onClick={() => setOpenErr({ ...openErr, [i]: !openErr[i] })} aria-expanded={!!openErr[i]} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", border: 0, background: "transparent", color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
                    <span className="nv-dotr" aria-hidden="true" />
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{er.title}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{er.when}</span></span>
                    <span style={{ color: "var(--muted)" }}>{openErr[i] ? "▲" : "▼"}</span>
                  </button>
                  {openErr[i] && <div className="nv-expand" style={{ padding: "0 22px 14px 42px", fontSize: 13, color: "var(--muted)", fontFamily: "ui-monospace, monospace", lineHeight: 1.5, overflowWrap: "anywhere" }}>{er.detail}</div>}
                </div>
              ))}
              {!d.health.errors.length && <div style={{ padding: "12px 22px 18px", borderTop: "1px solid var(--line)", fontSize: 14, color: "var(--muted)" }}>No errors in the last 7 days.</div>}
            </section>
          </div>
        </div>
      )}

      {tab === 4 && (
        <section className="nv-up nv-card" aria-labelledby="stlook" style={{ padding: 22, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <span style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 id="stlook" className="nv-h2">Appearance</h2>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>Device follows your phone or computer setting. Saved on this device.</span>
          </span>
          <div className="nv-seg" role="group" aria-label="Appearance" style={{ width: 300, maxWidth: "100%" }}>
            <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${themeIdx * 100}%)` }} />
            {(["Light", "Dark", "Device"] as const).map((label, i) => (
              <button key={label} type="button" className={themeIdx === i ? "on" : ""} aria-pressed={themeIdx === i} onClick={() => saveTheme(i === 0 ? "light" : i === 1 ? "dark" : "device")}>{label}</button>
            ))}
          </div>
        </section>
      )}

      {remove && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setRemove(null)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="stat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="stat" style={{ fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>Remove {remove}?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>They won&apos;t be able to use admin screens any more. Their sign-ins end now.</span>
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setRemove(null)}>Cancel</button>
              <button type="button" className="danger" disabled={busy} onClick={async () => { const em = remove; setRemove(null); await call(`/api/admin/admins?email=${encodeURIComponent(em)}`, { method: "DELETE" }, `${em} removed`); }}>Remove</button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
