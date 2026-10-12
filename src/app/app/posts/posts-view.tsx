"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  mode: "direct" | "inbox";
  caption: string;
  privacy_level: string | null;
  status: "draft" | "scheduled" | "publishing" | "processing" | "posted" | "sent_to_inbox" | "failed" | "cancelled";
  scheduled_at: string | null;
  posted_at: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
};

const STATUS: Record<Post["status"], [string, string]> = {
  draft: ["Draft", "badge-gray"],
  scheduled: ["Scheduled", "badge"],
  publishing: ["Sending to TikTok", "badge-blue"],
  processing: ["TikTok is processing", "badge-blue"],
  posted: ["Posted", "badge"],
  sent_to_inbox: ["In your TikTok drafts", "badge"],
  failed: ["Failed", "badge-red"],
  cancelled: ["Cancelled", "badge-gray"],
};
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
const TZ = "Asia/Kuala_Lumpur";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-GB", { timeZone: TZ, ...o });
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** My posts: every post with its status, as a list or a week calendar. Updates itself while TikTok is working on a post. */
export function PostsView() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; });
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(() => {
    fetch("/api/posts", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, d: (await r.json()) as { posts?: Post[]; error?: string } }))
      .then(({ ok, d }) => (ok && d.posts ? (setPosts(d.posts), setError(""), setLoadedAt(Date.now())) : setError(d.error || "Couldn't load your posts.")))
      .catch(() => setError("Couldn't load your posts. Check your connection."));
  }, []);
  useEffect(load, [load]);

  // Status updates after publishing (TikTok's guidelines): poll while a post is on its way.
  const working = posts?.some((p) => p.status === "publishing" || p.status === "processing" || (p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at).getTime() < loadedAt + 120e3));
  useEffect(() => {
    if (!working) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [working, load]);

  async function cancel(p: Post) {
    setBusyId(p.id);
    const r = await fetch(`/api/posts/${p.id}/cancel`, { method: "POST" });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setBusyId("");
    setNote(r.ok ? "Cancelled. The video is kept in your drafts." : d.error || "Couldn't cancel.");
    load();
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);
  const byDay = useMemo(() => {
    const m: Record<string, Post[]> = {};
    for (const p of posts ?? []) {
      const at = p.scheduled_at || p.posted_at;
      if (!at) continue;
      (m[dayKey(new Date(at))] ??= []).push(p);
    }
    for (const k in m) m[k].sort((a, b) => (a.scheduled_at || a.posted_at || "").localeCompare(b.scheduled_at || b.posted_at || ""));
    return m;
  }, [posts]);

  const row = (p: Post) => {
    const [label, cls] = STATUS[p.status];
    const at = p.status === "posted" && p.posted_at ? p.posted_at : p.scheduled_at;
    return (
      <li key={p.id} className="mp-row">
        <span className="mp-when">{at ? <><strong>{fmt(at, { weekday: "short", day: "numeric", month: "short" })}</strong><small>{fmt(at, { hour: "numeric", minute: "2-digit" })}</small></> : <small>No time yet</small>}</span>
        <span className="mp-main">
          <span className="mp-caption">{p.caption || (p.mode === "inbox" ? "Sent to TikTok drafts (caption added in TikTok)" : "No caption")}</span>
          <small>{p.mode === "inbox" ? "To TikTok drafts" : `Post · ${p.privacy_level ? PRIVACY[p.privacy_level] ?? p.privacy_level : "privacy not set"}`}{p.status === "failed" && p.last_error ? ` · ${p.last_error}` : ""}{p.status === "publishing" && p.attempts > 0 ? ` · try ${p.attempts + 1} of 3` : ""}</small>
        </span>
        <span className={`badge ${cls}`}>{label}</span>
        {(p.status === "scheduled" || p.status === "failed") && (
          <button type="button" className="btn-outline mp-cancel" disabled={busyId === p.id} onClick={() => cancel(p)}>{busyId === p.id ? "Cancelling…" : "Cancel"}</button>
        )}
      </li>
    );
  };

  if (error) return <p className="np-error" role="alert">{error}</p>;
  if (!posts) return <p className="np-muted">Loading your posts…</p>;

  const upcoming = posts.filter((p) => ["scheduled", "publishing", "processing", "failed"].includes(p.status));
  const done = posts.filter((p) => ["posted", "sent_to_inbox"].includes(p.status));
  const drafts = posts.filter((p) => p.status === "draft");

  return (
    <div className="mp">
      <div className="mp-bar">
        <div className="np-seg" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
          <button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Week</button>
        </div>
        <Link href="/app/new" className="np-btn">New post</Link>
      </div>
      {note && <p className="np-note" role="status">{note}</p>}
      {posts.length === 0 && (
        <section className="card mp-empty"><h2>No posts yet</h2><p>Schedule your first video and it will show here, from scheduled to posted.</p><Link href="/app/new" className="np-btn">New post</Link></section>
      )}
      {posts.length > 0 && view === "list" && (
        <>
          {upcoming.length > 0 && <section className="card mp-group"><h2>Coming up</h2><ul>{upcoming.map(row)}</ul></section>}
          {drafts.length > 0 && <section className="card mp-group"><h2>Drafts</h2><ul>{drafts.map(row)}</ul></section>}
          {done.length > 0 && <section className="card mp-group"><h2>Posted</h2><ul>{done.map(row)}</ul></section>}
        </>
      )}
      {posts.length > 0 && view === "week" && (
        <section className="card mp-week" aria-label="Week calendar">
          <div className="mp-weekbar">
            <button type="button" className="btn-outline" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400e3))} aria-label="Previous week">‹</button>
            <strong>{days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
            <button type="button" className="btn-outline" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400e3))} aria-label="Next week">›</button>
          </div>
          <div className="mp-days">
            {days.map((d) => {
              const k = dayKey(d);
              const list = byDay[k] ?? [];
              const today = k === dayKey(new Date());
              return (
                <div key={k} className={today ? "mp-day today" : "mp-day"}>
                  <span className="mp-dayhead">{d.toLocaleDateString("en-GB", { weekday: "short" })} <b>{d.getDate()}</b></span>
                  {list.length === 0 ? <small className="np-muted">—</small> : list.map((p) => (
                    <span key={p.id} className={`mp-chip ${STATUS[p.status][1]}`} title={p.caption}>
                      <b>{fmt((p.status === "posted" && p.posted_at) || p.scheduled_at || p.created_at, { hour: "numeric", minute: "2-digit" })}</b>
                      <span>{p.caption || STATUS[p.status][0]}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <p className="np-muted">Times are Malaysia time. Posts can be cancelled until they start sending to TikTok. Posts already on TikTok can only be edited or deleted in the TikTok app.</p>
    </div>
  );
}
