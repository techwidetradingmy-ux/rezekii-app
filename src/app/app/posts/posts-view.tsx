"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { shortCount, type TikTokVideo } from "@/integrations/tiktok/stats.ts";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx, type Lang } from "@/lib/i18n/lang.ts";

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
  draft: [tx("Draft"), "badge-gray"],
  scheduled: [tx("Scheduled"), "badge"],
  publishing: [tx("Sending to TikTok"), "badge-blue"],
  processing: [tx("TikTok is processing"), "badge-blue"],
  posted: [tx("Posted"), "badge"],
  sent_to_inbox: [tx("In your TikTok drafts"), "badge"],
  failed: [tx("Failed"), "badge-red"],
  cancelled: [tx("Cancelled"), "badge-gray"],
};
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: tx("Everyone"), MUTUAL_FOLLOW_FRIENDS: tx("Friends"), FOLLOWER_OF_CREATOR: tx("Followers"), SELF_ONLY: tx("Only me") };
const TZ = "Asia/Kuala_Lumpur";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions, lang: Lang) => new Date(iso).toLocaleString(dateLocale(lang), { timeZone: TZ, hour12: true, ...o });
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
type Stats = { videos: TikTokVideo[]; posts: Record<string, { views?: number; likes?: number; url?: string }> };

/**
 * My posts: every post with its status, as a list or a week calendar. Updates itself while TikTok is working on a post.
 * Opens with the posts and the saved views and likes from the server; the latest numbers from TikTok follow.
 */
export function PostsView({ initialPosts, initialStats, now }: { initialPosts: Post[]; initialStats: Stats; now: number }) {
  const t = useT();
  const lang = useLang();
  const [posts, setPosts] = useState<Post[] | null>(initialPosts);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; });
  const [busyId, setBusyId] = useState("");
  const [note, setNote] = useState("");
  const [loadedAt, setLoadedAt] = useState(now);
  const [stats, setStats] = useState<Stats>(initialStats);

  const load = useCallback(() => {
    fetch("/api/posts", { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, d: (await r.json()) as { posts?: Post[]; error?: string } }))
      .then(({ ok, d }) => (ok && d.posts ? (setPosts(d.posts), setError(""), setLoadedAt(Date.now())) : setError(t(d.error || tx("Couldn't load your posts.")))))
      .catch(() => setError(t("Couldn't load your posts. Check your connection.")));
  }, [t]);
  // The latest views and likes from TikTok (video.list), once; the saved numbers stay if TikTok doesn't answer.
  useEffect(() => {
    fetch("/api/tiktok/stats?videos=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Partial<Stats>) => (d.videos?.length || Object.keys(d.posts ?? {}).length) && setStats({ videos: d.videos ?? [], posts: d.posts ?? {} }))
      .catch(() => {});
  }, []);

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
    setNote(r.ok ? t("Cancelled. The video is kept in your drafts.") : t(d.error || tx("Couldn't cancel.")));
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
        <span className="mp-when">{at ? <><strong>{fmt(at, { weekday: "short", day: "numeric", month: "short" }, lang)}</strong><small>{fmt(at, { hour: "numeric", minute: "2-digit" }, lang)}</small></> : <small>{t("No time yet")}</small>}</span>
        <span className="mp-main">
          <span className="mp-caption">{p.caption || (p.mode === "inbox" ? t("Sent to TikTok drafts (caption added in TikTok)") : t("No caption"))}</span>
          <small>{p.mode === "inbox" ? t("To TikTok drafts") : t("Post · {privacy}", { privacy: p.privacy_level ? t(PRIVACY[p.privacy_level] ?? p.privacy_level) : t("privacy not set") })}{p.status === "failed" && p.last_error ? ` · ${t(p.last_error)}` : ""}{p.status === "scheduled" && p.attempts > 0 && p.last_error ? t(" · Try {n} of 3 didn't go through, trying again soon: {error}", { n: p.attempts, error: t(p.last_error) }) : ""}{p.status === "publishing" && p.attempts > 0 ? t(" · try {n} of 3", { n: p.attempts + 1 }) : ""}</small>
          {stats.posts[p.id] && (
            <span className="mp-stats">
              <span><b>{shortCount(stats.posts[p.id].views)}</b> {t("views")}</span>
              <span><b>{shortCount(stats.posts[p.id].likes)}</b> {t("likes")}</span>
            </span>
          )}
        </span>
        <span className={`badge ${cls}`}>{t(label)}</span>
        {(p.status === "scheduled" || p.status === "failed") && (
          <button type="button" className="btn-outline mp-cancel" disabled={busyId === p.id} onClick={() => cancel(p)}>{busyId === p.id ? t("Cancelling…") : t("Cancel")}</button>
        )}
      </li>
    );
  };

  if (error) return <p className="np-error" role="alert">{error}</p>;
  if (!posts) return <p className="np-muted">{t("Loading your posts…")}</p>;

  const upcoming = posts.filter((p) => ["scheduled", "publishing", "processing", "failed"].includes(p.status)).sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const done = posts.filter((p) => ["posted", "sent_to_inbox"].includes(p.status));
  const drafts = posts.filter((p) => p.status === "draft");

  return (
    <div className="mp">
      <div className="mp-bar">
        <div className="np-seg" role="tablist" aria-label={t("View")}>
          <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>{t("List")}</button>
          <button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "on" : ""} onClick={() => setView("week")}>{t("Week")}</button>
        </div>
        <Link href="/app/new" className="np-btn">{t("New post")}</Link>
      </div>
      {note && <p className="np-note" role="status">{note}</p>}
      {posts.length === 0 && (
        <section className="card mp-empty"><h2>{t("No posts yet")}</h2><p>{t("Schedule your first video and it will show here, from scheduled to posted.")}</p><Link href="/app/new" className="np-btn">{t("New post")}</Link></section>
      )}
      {posts.length > 0 && view === "list" && (
        <>
          {upcoming.length > 0 && <section className="card mp-group"><h2>{t("Coming up")}</h2><ul>{upcoming.map(row)}</ul></section>}
          {drafts.length > 0 && <section className="card mp-group"><h2>{t("Drafts")}</h2><ul>{drafts.map(row)}</ul></section>}
          {done.length > 0 && <section className="card mp-group"><h2>{t("Posted")}</h2><ul>{done.map(row)}</ul></section>}
        </>
      )}
      {view === "list" && stats.videos.length > 0 && (
        <section className="card mp-group" aria-labelledby="tt-recent">
          <h2 id="tt-recent">{t("Recent videos on your TikTok")}</h2>
          <ul className="tt-grid">
            {stats.videos.map((v) => (
              <li key={v.id}>
                <a href={v.share_url} target="_blank" rel="noreferrer" className="tt-card">
                  {v.cover_image_url ? (
                    // TikTok's signed cover links come from many CDN hosts, so a plain img.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover_image_url} alt="" loading="lazy" width={120} height={160} />
                  ) : (
                    <span className="tt-cover" aria-hidden="true" />
                  )}
                  <span className="tt-title">{v.title || v.video_description || t("Untitled video")}</span>
                  <span className="mp-stats">
                    <span><b>{shortCount(v.view_count)}</b> {t("views")}</span>
                    <span><b>{shortCount(v.like_count)}</b> {t("likes")}</span>
                  </span>
                  {v.create_time ? <small>{fmt(new Date(v.create_time * 1000).toISOString(), { day: "numeric", month: "short" }, lang)}</small> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {posts.length > 0 && view === "week" && (
        <section className="card mp-week" aria-label={t("Week calendar")}>
          <div className="mp-weekbar">
            <button type="button" className="btn-outline" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400e3))} aria-label={t("Previous week")}>‹</button>
            <strong>{days[0].toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" })} – {days[6].toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" })}</strong>
            <button type="button" className="btn-outline" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400e3))} aria-label={t("Next week")}>›</button>
          </div>
          <div className="mp-days">
            {days.map((d) => {
              const k = dayKey(d);
              const list = byDay[k] ?? [];
              const today = k === dayKey(new Date());
              return (
                <div key={k} className={today ? "mp-day today" : "mp-day"}>
                  <span className="mp-dayhead">{d.toLocaleDateString(dateLocale(lang), { weekday: "short" })} <b>{d.getDate()}</b></span>
                  {list.length === 0 ? <small className="np-muted">—</small> : list.map((p) => (
                    <span key={p.id} className={`mp-chip ${STATUS[p.status][1]}`} title={p.caption}>
                      <b>{fmt((p.status === "posted" && p.posted_at) || p.scheduled_at || p.created_at, { hour: "numeric", minute: "2-digit" }, lang)}</b>
                      <span>{p.caption || t(STATUS[p.status][0])}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <p className="np-muted">{t("Times are Malaysia time. Posts can be cancelled until they start sending to TikTok. Posts already on TikTok can only be edited or deleted in the TikTok app.")}</p>
    </div>
  );
}
