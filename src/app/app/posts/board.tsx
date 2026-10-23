"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx, type Lang } from "@/lib/i18n/lang.ts";
import type { BoardChannel, BoardPost, BoardState } from "@/modules/social/board.ts";
import type { Brand } from "@/modules/social/brands.ts";
import type { Channel } from "@/modules/social/rules.ts";
import { BrandIcon } from "../brand-icons";
import { PostDetails } from "./post-details";
import "./board.css";

const TZ = "Asia/Kuala_Lumpur";
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const time = (iso: string, lang: Lang) => new Date(iso).toLocaleTimeString(dateLocale(lang), { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const LOOK: Record<BoardState, [string, string]> = { removed: [tx("Removed"), "badge-gray"], fbdraft: [tx("Draft in Facebook"), "badge-gray"], draft: [tx("Draft"), "badge-gray"], scheduled: [tx("Scheduled"), "badge-blue"], posting: [tx("Posting"), "badge-blue"], posted: [tx("Posted"), ""], failed: [tx("Failed"), "badge-red"] };
// Worst first: an app's icon shows the state of its least-finished channel.
const RANK: BoardState[] = ["failed", "posting", "scheduled", "draft", "fbdraft", "removed", "posted"];
const needs = (p: BoardPost) => p.channels.some((c) => c.state === "failed" || c.commentFailed);
type Filter = "all" | "upcoming" | "posted" | "attention";

/**
 * All channels (Admins): every post with a chip per channel. Built for a busy week: a summary first, filters, then the
 * latest posts first (M6), what's coming up and drafts, one row per post grouped by day, the per-channel detail only when
 * a row is opened, and a Week view. Filters by brand (B8). Every post has Reuse (M7).
 */
export function Board({ posts, now, brands }: { posts: BoardPost[]; now: number; brands: Brand[] }) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
  const [view, setView] = useState<"list" | "week">("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [hidden, setHidden] = useState<Set<Channel>>(new Set());
  const [brand, setBrand] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(20);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  // Live (M5): while anything is posting or due soon, fresh statuses every 8 seconds; also when you come back to the tab.
  const live = posts.some((p) => p.channels.some((c) => c.active));
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 8000);
    return () => clearInterval(id);
  }, [live, router]);
  useEffect(() => {
    const back = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [router]);

  const today = dayKey(new Date(now).toISOString());
  // [day name, date, short date for the Week columns]
  const dayLabel = (k: string) => {
    const diff = Math.round((Date.parse(k) - Date.parse(today)) / 86400e3);
    const d = new Date(`${k}T12:00:00Z`);
    const date = d.toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const short = d.toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", timeZone: "UTC" });
    return [diff === 0 ? t("Today") : diff === 1 ? t("Tomorrow") : diff === -1 ? t("Yesterday") : d.toLocaleDateString(dateLocale(lang), { weekday: "long", timeZone: "UTC" }), date, short];
  };
  const kinds = [...new Set(posts.flatMap((p) => p.channels.map((c) => c.kind)))];
  const inBrand = brands.find((b) => b.id === brand)?.channels;
  const visible = (p: BoardPost) => {
    const chans = p.channels.filter((c) => !hidden.has(c.kind) && (!inBrand || inBrand.includes(c.account)));
    if (!chans.length) return false;
    if (filter === "attention") return needs(p);
    if (filter === "upcoming") return chans.some((c) => c.state === "scheduled" || c.state === "posting");
    if (filter === "posted") return chans.some((c) => c.state === "posted");
    return true;
  };
  const list = posts.filter(visible);
  const weekEnd = new Date(Date.parse(today) + 7 * 86400e3).toISOString().slice(0, 10);
  const inWeek = posts.filter((p) => p.at && dayKey(p.at) >= today && dayKey(p.at) < weekEnd);
  const attention = posts.filter(needs).length;

  async function act(c: BoardChannel, action: "cancel" | "retry-comment" | "retry") {
    setBusy(c.id + action);
    const r = c.kind === "tiktok"
      ? await fetch(`/api/posts/${c.id}/${action === "retry" ? "retry" : "cancel"}`, { method: "POST" }).catch(() => null)
      : await fetch(`/api/social/posts/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy("");
    setNote(r?.ok ? (action === "cancel" ? t("{name}: cancelled.", { name: c.name }) : action === "retry" ? t("{name}: trying again within a minute.", { name: c.name }) : t("The first comment will be tried again within a minute.")) : t(d?.error ?? tx("That didn't work. Try again.")));
    router.refresh();
  }

  // One icon per app (with a count when several Pages or accounts), so a post to 10 Pages stays one tidy row.
  const icons = (p: BoardPost) => (
    <span className="bd-ics">{[...new Set(p.channels.map((c) => c.kind))].map((k) => {
      const cs = p.channels.filter((c) => c.kind === k);
      const worst = RANK.find((s) => cs.some((c) => c.state === s)) ?? "posted";
      return <span key={k} className="bd-chi" title={cs.map((c) => `${c.name}: ${t(LOOK[c.state][0])}`).join(" · ")}><BrandIcon ch={k} size={22} /><i className={`bd-d-${worst}`} />{cs.length > 1 && <em className="bd-n">{cs.length}</em>}</span>;
    })}</span>
  );
  const sub = (p: BoardPost) => {
    const bad = p.channels.filter((c) => c.state === "failed" || c.commentFailed).length;
    if (bad) return <small className="warn">{bad > 1 ? t("{n} need attention", { n: bad }) : t("{n} needs attention", { n: bad })}</small>;
    const allPosted = p.channels.every((c) => c.state === "posted");
    const posting = p.channels.some((c) => c.state === "posting");
    const n = p.channels.length;
    return <small>{allPosted ? t("All posted") : posting ? t("Posting now") : p.channels.every((c) => c.state === "draft") ? t("Draft") : t("Scheduled")} · {n > 1 ? t("{n} channels", { n }) : t("{n} channel", { n })}</small>;
  };
  const row = (p: BoardPost) => {
    const isOpen = open.has(p.key);
    return (
      <div key={p.key} className={`bd-row${isOpen ? " open" : ""}`}>
        <button type="button" className="bd-rb" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })}>
          <span className="bd-t">{p.at ? time(p.at, lang) : t("No time")}</span>
          <span className="bd-c"><b>{p.caption || t("No caption")}</b>{sub(p)}</span>
          {icons(p)}
          <span className="bd-chev" aria-hidden="true">›</span>
        </button>
        <Link className="bd-reuse" href={`/app/new?reuse=${p.key}`} title={t("New post filled in like this one")}>{t("Reuse")}</Link>
        {isOpen && (
          <div className="bd-det">
            <PostDetails postKey={p.key} />
            {p.channels.map((c) => (
              <div key={c.id} className="bd-ln">
                <BrandIcon ch={c.kind} size={20} />
                <b>{c.name}</b>
                <span className={`badge ${LOOK[c.state][1]}`}>{t(LOOK[c.state][0])}</span>
                <span className="x">{c.note}</span>
                <span className="bd-acts">
                  {c.commentFailed && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "retry-comment")}>{t("Retry comment")}</button>}
                  {c.canRetry && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "retry")}>{busy === c.id + "retry" ? t("Trying…") : t("Try again")}</button>}
                  {c.canCancel && <button type="button" className="btn-outline" disabled={!!busy} onClick={() => act(c, "cancel")}>{busy === c.id + "cancel" ? t("Cancelling…") : t("Cancel")}</button>}
                  {c.permalink && <a className="btn-outline" href={c.permalink} target="_blank" rel="noreferrer">{t("Open")}</a>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Order A (owner, 21 Oct 2026): the latest posts first, newest at the top; then what's coming up, soonest first; drafts last.
  const nowIso = new Date(now).toISOString();
  const latest = list.filter((p) => p.at && p.at <= nowIso).sort((a, b) => (b.at as string).localeCompare(a.at as string));
  const coming = list.filter((p) => p.at && p.at > nowIso).sort((a, b) => (a.at as string).localeCompare(b.at as string));
  const drafts = list.filter((p) => !p.at);
  const byDay = (ps: BoardPost[]) => ps.reduce<[string, BoardPost[]][]>((out, p) => {
    const k = dayKey(p.at as string), last = out[out.length - 1];
    if (last?.[0] === k) last[1].push(p);
    else out.push([k, [p]]);
    return out;
  }, []);
  const day = ([k, ps]: [string, BoardPost[]]) => {
    const [a, b] = dayLabel(k);
    const v = { n: ps.length, m: ps.reduce((n, p) => n + p.channels.length, 0) };
    return <div key={k} className="bd-day"><div className="bd-dh"><b>{a}</b><small>{b}</small><em>{ps.length > 1 ? t("{n} posts · {m} channels", v) : t("{n} post · {m} channels", v)}</em></div>{ps.map(row)}</div>;
  };

  return (
    <div className="bd">
      <div className="bd-top">
        <div className="bd-sum">
          <span><b>{posts.filter((p) => p.at && dayKey(p.at) === today).length}</b><small>{t("today")}</small></span>
          <span><b>{inWeek.length}</b><small>{t("next 7 days")}</small></span>
          <span><b>{inWeek.reduce((n, p) => n + p.channels.length, 0)}</b><small>{t("channel posts")}</small></span>
          <span className={attention ? "att" : ""}><b>{attention}</b><small>{t("need attention")}</small></span>
        </div>
        <div className="bd-right">
          {live && <span className="bd-live" role="status"><i aria-hidden="true" />{t("Updating live")}</span>}
          <div className="np-seg" role="tablist" aria-label={t("View")}><button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>{t("List")}</button><button type="button" role="tab" aria-selected={view === "week"} className={view === "week" ? "on" : ""} onClick={() => setView("week")}>{t("Week")}</button></div>
          <Link href="/app/new" className="np-btn">{t("New post")}</Link>
        </div>
      </div>
      <div className="bd-filt">
        <div className="np-seg" role="tablist" aria-label={t("Status")}>
          {([["all", t("All")], ["upcoming", t("Coming up")], ["posted", t("Posted")], ["attention", attention ? t("Needs attention · {n}", { n: attention }) : t("Needs attention")]] as [Filter, string][]).map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={filter === v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
        {brands.length > 0 ? (
          <div className="bd-brands" role="group" aria-label={t("Brand")}>
            {[{ id: "all", name: t("All brands") }, ...brands].map((b) => <button key={b.id} type="button" aria-pressed={brand === b.id} onClick={() => setBrand(b.id)}>{b.name}</button>)}
          </div>
        ) : kinds.length > 1 && <div className="bd-chf" role="group" aria-label={t("Channels")}>{kinds.map((k) => <button key={k} type="button" aria-pressed={!hidden.has(k)} onClick={() => setHidden((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} title={k}><BrandIcon ch={k} size={22} /></button>)}</div>}
      </div>
      {note && <p className="np-note" role="status">{note}</p>}
      {posts.length === 0 ? (
        <section className="card"><h2>{t("No posts yet")}</h2><p>{t("Schedule your first post and every channel will show here, from scheduled to posted.")}</p><Link href="/app/new" className="np-btn">{t("New post")}</Link></section>
      ) : view === "list" ? (
        <section className="card bd-list">
          {latest.length > 0 && <h2 className="bd-sec">{t("Latest")}</h2>}
          {byDay(latest.slice(0, shown)).map(day)}
          {latest.length > shown && <button type="button" className="btn-outline bd-more" onClick={() => setShown(shown + 20)}>{t("Show older posts")}</button>}
          {coming.length > 0 && <h2 className="bd-sec">{t("Coming up")}</h2>}
          {byDay(coming).map(day)}
          {drafts.length > 0 && <><h2 className="bd-sec">{t("Drafts")}</h2><div className="bd-day">{drafts.map(row)}</div></>}
          {!list.length && <p className="np-muted">{t("Nothing matches these filters.")}</p>}
        </section>
      ) : (
        <section className="card bd-weekcard"><div className="bd-week">
          {Array.from({ length: 7 }, (_, i) => new Date(Date.parse(today) + i * 86400e3).toISOString().slice(0, 10)).map((k, i) => {
            const ps = list.filter((p) => p.at && dayKey(p.at) === k).sort((a, b) => (a.at as string).localeCompare(b.at as string));
            const [a, , short] = dayLabel(k);
            return (
              <div key={k} className={`bd-col${i === 0 ? " today" : ""}`}>
                <h4>{i < 2 ? a : short}<small>{ps.length}</small></h4>
                {ps.map((p) => <button key={p.key} type="button" className={`bd-chip${needs(p) ? " att" : ""}`} title={p.caption} onClick={() => { setView("list"); setOpen((s) => new Set(s).add(p.key)); }}><b>{time(p.at as string, lang)}</b>{icons(p)}</button>)}
                {!ps.length && <small className="np-muted">—</small>}
              </div>
            );
          })}
        </div></section>
      )}
      <p className="np-muted">{t("Times are Malaysia time. A channel can be cancelled until it starts posting. Posts already live can only be edited or deleted in each app.")}</p>
    </div>
  );
}
