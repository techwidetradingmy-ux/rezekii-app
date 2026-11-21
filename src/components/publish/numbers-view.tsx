"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logos";
import { Empty, Loading, Stat, Title } from "@/components/ui";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/lang";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import type { CommunityChannel, CommunityDay, CommunityPost } from "@/modules/community/numbers.ts";
import "@/app/social.css";

type Data = { channels: CommunityChannel[]; days: CommunityDay[]; posts: CommunityPost[]; refreshedAt: string | null; now: number; hasThreads: boolean };
type Sort = "Views" | "Likes" | "Comments" | "Shares";
type App = "all" | "facebook" | "instagram" | "threads";
const KEY: Record<Sort, "views" | "likes" | "comments" | "shares"> = { Views: "views", Likes: "likes", Comments: "comments", Shares: "shares" };
const RANGES = ["7 Days", "28 Days"] as const;
const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const dayKey = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
const sum = (xs: (number | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
/** A total when Meta gave any of the values, "–" when it gave none (Threads has no daily views or reach). */
const given = (xs: (number | undefined)[]) => (xs.some((x) => x !== undefined) ? shortCount(sum(xs)) : "–");
const plus = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("en-MY")}`;
const logo = (p: CommunityChannel["platform"]) => (p === "facebook" ? "Facebook" : p === "instagram" ? "Instagram" : "Threads");

async function read(admin: boolean): Promise<Data | null> {
  try {
    const r = await fetch(admin ? "/api/admin/community" : "/api/community", { cache: "no-store" });
    return r.ok ? ((await r.json()) as Data) : null;
  } catch {
    return null;
  }
}

/**
 * Channel Numbers (owner, 9 Nov 2026): what Meta gives every app for the account's own Facebook Pages and Instagram accounts, from the
 * daily reading: followers and their change, and likes, comments and shares on the posts of the last 7 or 28 days. Accounts asked
 * for the insights permissions (see metaLevel) also get views and reach, and their Threads profiles (Meta's second review).
 */
export function NumbersView({ newPost, admin = false }: { newPost: string; admin?: boolean }) {
  const t = useT();
  const lang = useLang();
  const [data, setData] = useState<Data | null | "error">(null);
  const [round, setRound] = useState(0);
  const [app, setApp] = useState<App>("all");
  const [channel, setChannel] = useState("all");
  const [range, setRange] = useState<(typeof RANGES)[number]>("7 Days");
  const [sort, setSort] = useState<Sort>("Likes");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let live = true;
    read(admin).then((d) => {
      if (live) setData(d ?? "error");
    });
    return () => {
      live = false;
    };
  }, [round, admin]);

  // Views and reach come only with the insights permissions: shown once Meta has given any.
  const full = typeof data === "object" && !!data && (data.days.some((d) => d.numbers.views !== undefined || d.numbers.reach !== undefined) || data.posts.some((p) => p.numbers.views !== undefined));
  const tip = full ? t("Followers, views, reach, likes and comments for your channels, read daily.") : `${t("Followers, likes, comments and shares for your Facebook Pages and Instagram accounts, read daily.")} ${t("Views and reach aren't available yet.")}`;
  // Admin (owner, 21 Nov 2026, as on rezekii.com): every Admin's channels, in English.
  const head = (d?: Data) => admin ? <Title title="Community Numbers" sub="Every Admin's Facebook Pages, Instagram accounts and Threads profiles, read daily." /> : <Title title={t("Channel Numbers")} sub={d?.hasThreads && !d.channels.some((c) => c.platform === "threads") ? `${tip} ${t("Threads numbers aren't available yet.")}` : tip} />;
  if (data === null) return <div className="v2-stack v2-in" style={{ gap: 16 }}>{head()}<Loading text={t("Loading your numbers…")} /></div>;
  if (data === "error") return <div className="v2-stack v2-in" style={{ gap: 16 }}>{head()}<p className="v2-muted">{t("Couldn't load your numbers. Please refresh.")}</p></div>;
  const { channels, days, posts, refreshedAt, now } = data;
  if (!channels.length)
    return (
      <div className="v2-stack v2-in" style={{ gap: 16 }}>
        {head(data)}
        {admin ? <Empty title="No Admin Channels Yet" line="Admins' connected Facebook Pages, Instagram accounts and Threads profiles show here after the daily reading." />
          : <Empty title={t("No Facebook or Instagram Yet")} line={t("Connect a Facebook Page or Instagram account to see its followers, likes and comments here.")} href={newPost} cta={t("Connect a Channel")} />}
      </div>
    );

  const span = range === "7 Days" ? 7 : 28;
  const apps = [...new Set(channels.map((c) => c.platform))];
  const shown = channels.filter((c) => (app === "all" || c.platform === app) && (channel === "all" || c.id === channel));
  const ids = new Set(shown.map((c) => c.id));
  const from = dayKey(now - span * DAY);
  const daysOf = (id: string) => days.filter((d) => d.channel === id && d.day >= from);
  const latest = (list: CommunityDay[]) => [...list].reverse().find((d) => d.numbers.followers !== undefined)?.numbers.followers;
  const first = (list: CommunityDay[]) => list.find((d) => d.numbers.followers !== undefined)?.numbers.followers;
  const since = new Date(now - span * DAY).toISOString();
  const inRange = posts.filter((p) => ids.has(p.channel) && (!p.at || p.at >= since));
  const postsOf = (id: string) => inRange.filter((p) => p.channel === id);
  const followers = sum(shown.map((c) => latest(daysOf(c.id))));
  const before = sum(shown.map((c) => first(daysOf(c.id))));
  const inDays = shown.flatMap((c) => daysOf(c.id));
  const sorts: Sort[] = full ? ["Views", "Likes", "Comments", "Shares"] : ["Likes", "Comments", "Shares"];
  const top = [...inRange].sort((a, b) => (b.numbers[KEY[sort]] ?? -1) - (a.numbers[KEY[sort]] ?? -1)).slice(0, 30);
  const byId = new Map(channels.map((c) => [c.id, c]));
  const notes = shown.map((c) => [c, [...daysOf(c.id)].reverse()[0]?.numbers.note] as const).filter(([, note]) => note);
  const when = (iso: string) => new Date(iso).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });

  async function refreshNow() {
    setBusy(true);
    setMsg("");
    try {
      if (admin) {
        // Queues a reading of every Admin channel for the refresh timer.
        const r = await fetch("/api/admin/community/refresh", { method: "POST" });
        const b = (await r.json().catch(() => ({}))) as { queued?: boolean; error?: string };
        setMsg(!r.ok ? b.error ?? "That didn't work. Try again." : b.queued ? "Reading every Admin channel now. Numbers update in a few minutes." : "A reading is already on its way.");
        return;
      }
      const r = await fetch("/api/community", { method: "POST" });
      const b = (await r.json().catch(() => ({}))) as { recent?: boolean; read?: number; left?: number; error?: string };
      if (!r.ok) setMsg(b.error ?? t("That didn't work. Try again."));
      else if (b.recent) setMsg(t("Your numbers were read in the last 10 minutes. Try again a little later."));
      else {
        setMsg(b.left ? t("{n} channels read; the rest follow in the daily reading.", { n: b.read ?? 0 }) : t("Numbers updated."));
        setRound((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="v2-stack v2-in nm" style={{ gap: 16 }}>
      {head(data)}
      <div className="nm-top">
        {apps.length > 1 && (
          <div className="np-seg" role="group" aria-label={t("App")}>
            {(["all", ...apps] as App[]).map((a) => <button key={a} type="button" className={app === a ? "on" : undefined} aria-pressed={app === a} onClick={() => { setApp(a); setChannel("all"); }}>{a === "all" ? t("All") : logo(a)}</button>)}
          </div>
        )}
        {channels.length > 1 && (
          <select className="np-input nm-pick" aria-label={t("Channel")} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">{t("All Channels ({n})", { n: channels.filter((c) => app === "all" || c.platform === app).length })}</option>
            {channels.filter((c) => app === "all" || c.platform === app).map((c) => <option key={c.id} value={c.id}>{c.name} · {logo(c.platform)}</option>)}
          </select>
        )}
        <div className="np-seg" role="group" aria-label={t("Date range")}>
          {RANGES.map((r) => <button key={r} type="button" className={range === r ? "on" : undefined} aria-pressed={range === r} onClick={() => setRange(r)}>{t(r)}</button>)}
        </div>
        <button type="button" className="btn-outline" disabled={busy} onClick={refreshNow}>{busy ? t("Reading…") : t("Refresh Now")}</button>
      </div>
      <p className="v2-muted nm-src">{apps.includes("threads") ? (refreshedAt ? t("From Meta · read {time}", { time: when(refreshedAt) }) : t("From Meta · read daily")) : refreshedAt ? t("From Facebook and Instagram · read {time}", { time: when(refreshedAt) }) : t("From Facebook and Instagram · read daily")}</p>
      {msg && <p className="np-note" role="status">{msg}</p>}
      {notes.length > 0 && <p className="np-note nm-warn" role="note">{notes.map(([c, note]) => `${c.name}: ${t(note ?? "")}`).join(" · ")}</p>}

      <section className="nm-tiles" aria-label={t("Totals")}>
        <Stat label={t("Followers")} value={shortCount(followers)} note={before ? t("{change} in {n} days", { change: plus(followers - before), n: span }) : undefined} tone={followers - before >= 0 ? "up" : "down"} />
        {full && <Stat label={t("Views")} value={given(inDays.map((d) => d.numbers.views))} note={t("last {n} days", { n: span })} />}
        {full && <Stat label={t("Reach")} value={given(inDays.map((d) => d.numbers.reach))} note={t("people reached each day, added up")} />}
        <Stat label={t("Posts")} value={shortCount(inRange.length)} note={t("last {n} days", { n: span })} />
        <Stat label={t("Likes")} value={shortCount(sum(inRange.map((p) => p.numbers.likes)))} />
        <Stat label={t("Comments")} value={shortCount(sum(inRange.map((p) => p.numbers.comments)))} />
        <Stat label={t("Shares")} value={shortCount(sum(inRange.map((p) => p.numbers.shares)))} note={t("Facebook only")} />
      </section>

      <section className="v2-card nm-card" aria-labelledby="nmch">
        <h2 id="nmch">{t("Channels")}</h2>
        <div className="nm-scroll">
          <table className="nm-table">
            <thead><tr><th>{t("Channel")}</th><th>{t("Followers")}</th><th>{t("Net Change")}</th>{full && <><th>{t("Views")}</th><th>{t("Reach")}</th></>}<th>{t("Posts")}</th><th>{t("Likes")}</th><th>{t("Comments")}</th></tr></thead>
            <tbody>
              {shown.map((c) => {
                const list = daysOf(c.id);
                const a = latest(list);
                const b = first(list);
                const ps = postsOf(c.id);
                return (
                  <tr key={c.id}>
                    <td><span className="nm-ch"><BrandLogo name={logo(c.platform)} size={20} /><span>{c.name}</span></span></td>
                    <td className="nm-strong">{a === undefined ? "–" : shortCount(a)}</td>
                    <td>{a !== undefined && b !== undefined ? plus(a - b) : "–"}</td>
                    {full && <><td>{given(list.map((d) => d.numbers.views))}</td><td>{given(list.map((d) => d.numbers.reach))}</td></>}
                    <td>{ps.length}</td>
                    <td>{shortCount(sum(ps.map((p) => p.numbers.likes)))}</td>
                    <td>{shortCount(sum(ps.map((p) => p.numbers.comments)))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="v2-card nm-card" aria-labelledby="nmtop">
        <div className="nm-head">
          <h2 id="nmtop">{t("Top Posts")}</h2>
          <div className="np-seg" role="group" aria-label={t("Sort by")}>
            {sorts.map((s) => <button key={s} type="button" className={sort === s ? "on" : undefined} aria-pressed={sort === s} onClick={() => setSort(s)}>{t(s)}</button>)}
          </div>
        </div>
        {top.length ? (
          <ul className="nm-posts">
            {top.map((p) => {
              const c = byId.get(p.channel);
              return (
                <li key={`${p.channel}:${p.id}`}>
                  <span className="nm-th">
                    {p.thumb && (
                      // Meta's signed picture link, so a plain img.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt="" />
                    )}
                  </span>
                  <span className="nm-pt">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.caption || t("No caption")}</a> : <b>{p.caption || t("No caption")}</b>}
                    <small>{c && <BrandLogo name={logo(c.platform)} size={14} />} {c?.name}{p.at ? ` · ${when(p.at)}` : ""}</small>
                  </span>
                  <span className="nm-nums">
                    {full && <span><b>{p.numbers.views === undefined ? "–" : shortCount(p.numbers.views)}</b><small>{t("Views")}</small></span>}
                    <span><b>{p.numbers.likes === undefined ? "–" : shortCount(p.numbers.likes)}</b><small>{t("Likes")}</small></span>
                    <span><b>{p.numbers.comments === undefined ? "–" : shortCount(p.numbers.comments)}</b><small>{t("Comments")}</small></span>
                    <span><b>{p.numbers.shares === undefined ? "–" : shortCount(p.numbers.shares)}</b><small>{t("Shares")}</small></span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="v2-muted">{refreshedAt ? t("No posts in the last {n} days.", { n: span }) : t("Your numbers appear after the first daily reading, or press Refresh Now.")}</p>
        )}
      </section>
    </div>
  );
}
