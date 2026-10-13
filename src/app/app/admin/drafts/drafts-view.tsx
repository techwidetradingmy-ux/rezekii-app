"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CalPost } from "@/modules/admin/posts.ts";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../accounts/accounts.css";
import "../admin.css";

type Draft = CalPost & { createdAt: string };
type Info = { privacy_level_options: string[]; nextRecommended: string; creator_username?: string };
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });

/** Drafts on Techwide's team accounts, as designed in the mockup (Drafts). */
export function DraftsView({ drafts }: { drafts: Draft[] }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState<Draft | null>(null);
  const [closing, setClosing] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [mode, setMode] = useState<0 | 1>(0);
  const [dt, setDt] = useState("");
  const [consent, setConsent] = useState(false);
  const [del, setDel] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const s = q.trim().toLowerCase();
  const shown = drafts.filter((d) => !s || `${d.caption} ${d.handle}`.toLowerCase().includes(s));

  function openSheet(d: Draft) {
    setCur(d);
    setClosing(false);
    setInfo(null);
    setInfoError("");
    setPrivacy("");
    setMode(0);
    setDt("");
    setConsent(false);
    // TikTok asks apps to read the account's posting settings each time before posting.
    fetch(`/api/posts/creator-info?account=${encodeURIComponent(d.openId)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as Info & { error?: string };
        if (!r.ok) throw new Error(j.error || "TikTok didn't answer.");
        setInfo(j);
      })
      .catch((err) => setInfoError(err instanceof Error ? err.message : String(err)));
  }
  const closeSheet = () => {
    setClosing(true);
    setTimeout(() => {
      setCur(null);
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!cur) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function schedule() {
    if (!cur || !info || busy) return;
    if (!privacy) return flash("Choose who can view this post", false);
    if (!consent) return flash("Agree to TikTok's Music Usage Confirmation first", false);
    const at = mode === 0 ? info.nextRecommended : dt ? new Date(`${dt}:00+08:00`).toISOString() : "";
    if (!at) return flash("Pick a date and time", false);
    setBusy(true);
    const r = await fetch(`/api/admin/posts/${cur.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "move", at, privacy, consent }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return flash(j.error || "Could not schedule the draft.", false);
    flash(`Scheduled for ${when(at)}`);
    closeSheet();
    router.refresh();
  }
  async function remove() {
    if (!del || busy) return;
    setBusy(true);
    const r = await fetch(`/api/admin/posts/${del.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete" }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setDel(null);
    if (!r.ok) return flash(j.error || "Could not delete the draft.", false);
    flash("Draft deleted");
    router.refresh();
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="nv-title">Drafts</h1>
          <p className="nv-sub">Saved posts with no time yet · they never publish until you schedule them</p>
        </div>
        <Link href="/app/new" className="nv-btn nv-press" style={{ height: 42, textDecoration: "none" }}>+ New post</Link>
      </div>

      <section className="nv-up nv-card" aria-label="Filter drafts" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <label htmlFor="drq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search drafts</label>
        <input id="drq" type="text" className="nv-input" placeholder="Search captions" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 260px" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{drafts.length} {drafts.length === 1 ? "draft" : "drafts"}</span>
      </section>

      {!shown.length && (
        <div className="nv-card nv-up" style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{drafts.length ? "No drafts match" : "No drafts"}</span>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Drafts you save from New post on Techwide&apos;s accounts show up here.</span>
          <Link href="/app/new" className="nv-btn nv-press" style={{ textDecoration: "none" }}>New post</Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {shown.map((d) => (
          <div key={d.id} className="nv-card nv-hover nv-up" style={{ padding: 14, display: "flex", gap: 14 }}>
            <div style={{ width: 96, aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden", background: "#0d1117", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v14H4zM10 9l5 3-5 3z" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>{d.caption || "No caption"}</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><span className="nv-badge b-gray">{d.handle}</span>{d.privacy && <span className="nv-badge b-gray">{PRIVACY[d.privacy] ?? d.privacy}</span>}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Saved {when(d.createdAt)}</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>
                <button type="button" className="nv-btn nv-sm nv-press" onClick={() => openSheet(d)}>Schedule</button>
                <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setDel(d)} style={{ color: "var(--red)" }}>Delete</button>
              </span>
            </div>
          </div>
        ))}
      </div>

      {cur && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closeSheet} />
          <div role="dialog" aria-modal="true" aria-labelledby="drst" className={`nv-sheet ${closing ? "out" : ""}`}>
            <span className="nv-grab" aria-hidden="true" />
            <h3 id="drst" style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>Schedule this draft</h3>
            <span style={{ fontSize: 15, color: "var(--body)", overflowWrap: "anywhere" }}>{cur.caption || "No caption"} · {cur.handle}</span>
            {infoError && <span style={{ fontSize: 14, color: "var(--red)" }}>{infoError}</span>}
            {!info && !infoError && <span className="nv-skel" style={{ height: 44 }} />}
            {info && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="drpriv" className="nv-label">Who can view <span style={{ color: "var(--red)" }}>· required</span></label>
                  <select id="drpriv" className="nv-input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                    <option value="">Choose who can view…</option>
                    {info.privacy_level_options.map((o) => <option key={o} value={o}>{PRIVACY[o] ?? o}</option>)}
                  </select>
                </div>
                <div className="nv-seg" role="group" aria-label="When" style={{ width: "100%" }}>
                  <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: mode === 0 ? "translateX(0)" : "translateX(100%)" }} />
                  <button type="button" className={mode === 0 ? "on" : ""} aria-pressed={mode === 0} onClick={() => setMode(0)}>Recommended time</button>
                  <button type="button" className={mode === 1 ? "on" : ""} aria-pressed={mode === 1} onClick={() => setMode(1)}>Pick a time</button>
                </div>
                {mode === 0 ? (
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gink)" }}>Next free recommended time: {when(info.nextRecommended)}</span>
                ) : (
                  <>
                    <label htmlFor="drdt" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Date and time (Malaysia time)</label>
                    <input id="drdt" type="datetime-local" className="nv-input" value={dt} onChange={(e) => setDt(e.target.value)} />
                  </>
                )}
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, lineHeight: 1.45, color: "var(--body)" }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="nv-link" style={{ fontSize: 14 }}>Music Usage Confirmation</a>.</span>
                </label>
                <button type="button" className="nv-btn nv-press nv-cta" onClick={schedule} disabled={busy} style={{ height: 54, fontSize: 16 }}>
                  {busy && <span className="nv-spin" aria-hidden="true" />}Schedule
                </button>
              </>
            )}
          </div>
        </>
      )}

      {del && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Keep draft" onClick={() => setDel(null)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="drat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="drat" style={{ fontSize: 17, fontWeight: 700 }}>Delete this draft?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>The video file is deleted too. This can&apos;t be undone.</span>
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setDel(null)}>Keep</button>
              <button type="button" className="danger" onClick={remove} disabled={busy}>Delete</button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
