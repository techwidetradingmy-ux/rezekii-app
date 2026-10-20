"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardChannel, BoardPost, BoardState } from "@/modules/social/board.ts";
import type { Brand } from "@/modules/social/brands.ts";
import type { Channel } from "@/modules/social/rules.ts";
import { BrandIcon } from "../brand-icons";
import "./board.css";

const TZ = "Asia/Kuala_Lumpur";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const LOOK: Record<BoardState, [string, string]> = { removed: ["Removed", "badge-gray"], fbdraft: ["Draft in Facebook", "badge-gray"], draft: ["Draft", "badge-gray"], scheduled: ["Scheduled", "badge-blue"], posting: ["Posting", "badge-blue"], posted: ["Posted", ""], failed: ["Failed", "badge-red"], link: ["Add product link", "badge-amber"] };
// Worst first: an app's icon shows the state of its least-finished channel.
const RANK: BoardState[] = ["failed", "link", "posting", "scheduled", "draft", "fbdraft", "removed", "posted"];
const needs = (p: BoardPost) => p.channels.some((c) => c.state === "failed" || c.state === "link" || c.commentFailed);
type Filter = "all" | "upcoming" | "posted" | "attention";

/**
 * All channels (Admins): every post with a chip per channel. Built for a busy week: a summary first, filters, one row per
 * post grouped by day, the per-channel detail only when a row is opened, and a Week view. Filters by brand (B8).
 */
export function Board({ posts, now, brands }: { posts: BoardPost[]; now: number; brands: Brand[] }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "week">("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [hidden, setHidden] = useState<Set<Channel>>(new Set());
  const [brand, setBrand] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [earlier, setEarlier] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const today = dayKey(new Date(now).toISOString());
  const dayLabel = (k: string) => {
    const diff = Math.round((Date.parse(k) - Date.parse(today)) / 86400e3);
    const d = new Date(`${k}T12:00:00Z`);
    const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return diff === 0 ? ["Today", date] : diff === 1 ? ["Tomorrow", date] : diff === -1 ? ["Yesterday", date] : [d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }), date];
  };
  const kinds = [...new Set(posts.flatMap((p) => p.channels.map((c) => c.kind)))];
  const inBrand = brands.find((b) => b.id === brand)?.channels;
  const visible = (p: BoardPost) => {
    const chans = p.channels.filter((c) => !hidden.has(c.kind) && (!inBrand || inBrand.includes(c.account)));
    if (!chans.length) return false;
    if (filter === "attention") return needs(p);
    if (filter === "upcoming") return chans.some((c) => c.state === "scheduled" || c.state === "posting");
    if (filter === "posted") return chans.some((c) => c.state === "posted" || c.state === "link");
    return true;
  };
  const list = posts.filter(visible);
  const weekEnd = new Date(Date.parse(today) + 7 * 86400e3).toISOString().slice(0, 10);
  const inWeek = posts.filter((p) => p.at && dayKey(p.at) >= today && dayKey(p.at) < weekEnd);
  const attention = posts.filter(needs).length;

  async function act(c: BoardChannel, action: "cancel" | "link-done" | "retry-comment" | "retry") {
    setBusy(c.id + action);
    const r = c.kind === "tiktok"
      ? await fetch(`/api/posts/${c.id}/${action === "retry" ? "retry" : "cancel"}`, { method: "POST" }).catch(() => null)
      : await fetch(`/api/social/posts/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy("");
    setNote(r?.ok ? (action === "cancel" ? `${c.name}: cancelled.` : action === "link-done" ? "Marked done." : action === "retry" ? `${c.name}: trying again within a minute.` : "The first comment will be tried again within a minute.") : (d?.error ?? "That didn't work. Try again."));
    router.refresh();
  }

  // One icon per app (with a count when several Pages or accounts), so a post to 10 Pages stays one tidy row.
  const icons = (p: BoardPost) => (
    <span className="bd-ics">{[...new Set(p.channels.map((c) => c.kind))].map((k) => {
      const cs = p.channels.filter((c) => c.kind === k);
      const worst = RANK.find((s) => cs.some((c) => c.state === s)) ?? "posted";
      return <span key={k} className="bd-chi" title={cs.map((c) => `${c.name}: ${LOOK[c.state][0]}`).join(" · ")}><BrandIcon ch={k} size={22} /><i className={`bd-d-${worst}`} />{cs.length > 1 && <em className="bd-n">{cs.length}</em>}</span>;
    })}</span>
  );
  const sub = (p: BoardPost) => {
    const bad = p.channels.filter((c) => c.state === "failed" || c.state === "link" || c.commentFailed).length;
    if (bad) return <small className="warn">{bad} need{bad > 1 ? "" : "s"} attention</small>;
    const allPosted = p.channels.every((c) => c.state === "posted");
    const posting = p.channels.some((c) => c.state === "posting");
    return <small>{allPosted ? "All posted" : posting ? "Posting now" : p.channels.every((c) => c.state === "draft") ? "Draft" : "Scheduled"} · {p.channels.length} channel{p.channels.length > 1 ? "s" : ""}</small>;
  };
  const row = (p: BoardPost) => {
    const isOpen = open.has(p.key);
    return (
      <div key={p.key} className={`bd-row${isOpen ? " open" : ""}`}>
        <button type="button" className="bd-rb" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })}>
          <span className="bd-t">{p.at ? time(p.at) : "No time"}</span>
          <span className="bd-c"><b>{p.caption || "No caption"}</b>{sub(p)}</span>
          {icons(p)}
          <span className="bd-chev" aria-hidden="true">›</span>
        </button>
        {isOpen && (
          <div className="bd-det">
            {p.channels.map((c) => (
              <div key={c.id} className="bd-ln">
                <BrandIcon ch={c.kind} size={20} />
                <b>{c.name}</b>
                <span className={`badge ${LOOK[c.state][1]}`}>{LOOK[c.state][0]}</span>
                <span className="x">{c.note}</span>
                <span className="bd-acts">
                  {c.linkReminder && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "link-done")}>Done</button>}
                  {c.commentFailed && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "retry-comment")}>Retry comment</button>}
                  {c.canRetry && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "retry")}>{busy === c.id + "retry" ? "Trying…" : "Try again"}</button>}
                  {c.canCancel && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "cancel")}>{busy === c.id + "cancel" ? "Cancelling…" : "Cancel"}</button>}
                  {c.permalink && <a className="btn-outline" href={c.permalink} target="_blank" rel="noreferrer">Open</a>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const drafts = list.filter((p) => !p.at);
  const days = [...new Set(list.filter((p) => p.at).map((p) => dayKey(p.at as string)))].sort((a, b) => (a < today && b < today ? b.localeCompare(a) : a.localeCompare(b)));
  const shownDays = days.filter((k) => k >= today || earlier || filter !== "all");

  return (
    <div className="bd">
      <div className="bd-top">
        <div className="bd-sum">
          <span><b>{posts.filter((p) => p.at && dayKey(p.at) === today).length}</b><small>today</small></span>
          <span><b>{inWeek.length}</b><small>next 7 days</small></span>
          <span><b>{inWeek.reduce((n, p) => n + p.channels.length, 0)}</b><small>channel posts</small></span>
          <span className={attention ? "att" : ""}><b>{attention}</b><small>need attention</small></span>
        </div>
        <div className="bd-right">
          <div className="np-seg" role="tablist" aria-label="View"><button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button><button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Week</button></div>
          <Link href="/app/new" className="np-btn">New post</Link>
        </div>
      </div>
      <div className="bd-filt">
        <div className="np-seg" role="tablist" aria-label="Status">
          {([["all", "All"], ["upcoming", "Coming up"], ["posted", "Posted"], ["attention", `Needs attention${attention ? ` · ${attention}` : ""}`]] as [Filter, string][]).map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={filter === v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
        {brands.length > 0 ? (
          <div className="bd-brands" role="group" aria-label="Brand">
            {[{ id: "all", name: "All brands" }, ...brands].map((b) => <button key={b.id} type="button" aria-pressed={brand === b.id} onClick={() => setBrand(b.id)}>{b.name}</button>)}
          </div>
        ) : kinds.length > 1 && <div className="bd-chf" role="group" aria-label="Channels">{kinds.map((k) => <button key={k} type="button" aria-pressed={!hidden.has(k)} onClick={() => setHidden((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} title={k}><BrandIcon ch={k} size={22} /></button>)}</div>}
      </div>
      {note && <p className="np-note" role="status">{note}</p>}
      {posts.length === 0 ? (
        <section className="card"><h2>No posts yet</h2><p>Schedule your first post and every channel will show here, from scheduled to posted.</p><Link href="/app/new" className="np-btn">New post</Link></section>
      ) : view === "list" ? (
        <section className="card bd-list">
          {drafts.length > 0 && <div className="bd-day"><div className="bd-dh"><b>Drafts</b><em>{drafts.length}</em></div>{drafts.map(row)}</div>}
          {shownDays.map((k) => {
            const ps = list.filter((p) => p.at && dayKey(p.at) === k).sort((a, b) => (a.at as string).localeCompare(b.at as string));
            const [a, b] = dayLabel(k);
            return <div key={k} className="bd-day"><div className="bd-dh"><b>{a}</b><small>{b}</small><em>{ps.length} post{ps.length > 1 ? "s" : ""} · {ps.reduce((n, p) => n + p.channels.length, 0)} channels</em></div>{ps.map(row)}</div>;
          })}
          {!drafts.length && !shownDays.length && <p className="np-muted">Nothing matches these filters.</p>}
          {filter === "all" && days.some((k) => k < today) && <button type="button" className="btn-outline bd-more" onClick={() => setEarlier(!earlier)}>{earlier ? "Hide earlier days" : "Show earlier days"}</button>}
        </section>
      ) : (
        <section className="card bd-weekcard"><div className="bd-week">
          {Array.from({ length: 7 }, (_, i) => new Date(Date.parse(today) + i * 86400e3).toISOString().slice(0, 10)).map((k, i) => {
            const ps = list.filter((p) => p.at && dayKey(p.at) === k).sort((a, b) => (a.at as string).localeCompare(b.at as string));
            const [a, b] = dayLabel(k);
            return (
              <div key={k} className={`bd-col${i === 0 ? " today" : ""}`}>
                <h4>{i < 2 ? a : b.split(" ").slice(0, 2).join(" ")}<small>{ps.length}</small></h4>
                {ps.map((p) => <button key={p.key} type="button" className={`bd-chip${needs(p) ? " att" : ""}`} title={p.caption} onClick={() => { setView("list"); setOpen((s) => new Set(s).add(p.key)); }}><b>{time(p.at as string)}</b>{icons(p)}</button>)}
                {!ps.length && <small className="np-muted">—</small>}
              </div>
            );
          })}
        </div></section>
      )}
      <p className="np-muted">Times are Malaysia time. A channel can be cancelled until it starts posting. Posts already live can only be edited or deleted in each app.</p>
    </div>
  );
}
