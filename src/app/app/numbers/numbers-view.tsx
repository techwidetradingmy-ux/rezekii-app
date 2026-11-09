"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx } from "@/lib/i18n/lang.ts";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import type { CommunityChannel, CommunityDay, CommunityPost } from "@/modules/community/numbers.ts";
import { BrandIcon } from "../brand-icons";
import "./numbers.css";

type App = "all" | "facebook" | "instagram";
type Sort = "likes" | "comments" | "shares";
const RANGES = [7, 28];
const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const dayKey = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
const sum = (xs: (number | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
const plus = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString("en-US")}`;

/**
 * Posts → Numbers: what Meta gives every app for the person's own Facebook Pages and Instagram accounts, from the daily
 * reading: followers and their change, and likes, comments and shares on the posts of the last 7 or 28 days.
 */
export function NumbersView({ channels, days, posts, refreshedAt, now, hasThreads }: { channels: CommunityChannel[]; days: CommunityDay[]; posts: CommunityPost[]; refreshedAt: string | null; now: number; hasThreads: boolean }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [app, setApp] = useState<App>("all");
  const [channel, setChannel] = useState("all");
  const [range, setRange] = useState(0);
  const [sort, setSort] = useState<Sort>("likes");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const span = RANGES[range];

  if (!channels.length)
    return (
      <section className="card">
        <p>{t("Connect a Facebook Page or Instagram account to see its followers, likes and comments here.")}</p>
        <Link href="/app/new" className="np-btn nm-self">{t("Connect a channel")}</Link>
        {hasThreads && <p className="np-muted">{t("Threads numbers aren't available yet.")}</p>}
      </section>
    );

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
  const tiles: [string, string, string][] = [
    [t("Followers"), shortCount(followers), before ? t("{change} in {n} days", { change: plus(followers - before), n: span }) : t("on these channels")],
    [t("Posts"), shortCount(inRange.length), t("last {n} days", { n: span })],
    [t("Likes"), shortCount(sum(inRange.map((p) => p.numbers.likes))), t("Facebook reactions and Instagram likes")],
    [t("Comments"), shortCount(sum(inRange.map((p) => p.numbers.comments))), t("on those posts")],
    [t("Shares"), shortCount(sum(inRange.map((p) => p.numbers.shares))), t("Facebook only")],
  ];
  const top = [...inRange].sort((a, b) => (b.numbers[sort] ?? -1) - (a.numbers[sort] ?? -1)).slice(0, 30);
  const byId = new Map(channels.map((c) => [c.id, c]));
  const notes = shown.map((c) => [c, [...daysOf(c.id)].reverse()[0]?.numbers.note] as const).filter(([, note]) => note);
  const when = (iso: string) => new Date(iso).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });

  async function refreshNow() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/community/refresh", { method: "POST" });
      const b = (await r.json().catch(() => ({}))) as { recent?: boolean; read?: number; left?: number; error?: string };
      if (!r.ok) setMsg(t(b.error ?? tx("That didn't work. Try again.")));
      else if (b.recent) setMsg(t("Your numbers were read in the last 10 minutes. Try again a little later."));
      else {
        setMsg(b.left ? t("{n} channels read; the rest follow in the daily reading.", { n: b.read ?? 0 }) : t("Numbers updated."));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nm">
      <div className="nm-top">
        {apps.length > 1 && (
          <div className="np-seg" role="tablist" aria-label={t("App")}>
            {(["all", ...apps] as App[]).map((a) => <button key={a} type="button" role="tab" aria-selected={app === a} className={app === a ? "on" : ""} onClick={() => { setApp(a); setChannel("all"); }}>{a === "all" ? t("All") : a === "facebook" ? "Facebook" : "Instagram"}</button>)}
          </div>
        )}
        {channels.length > 1 && (
          <select className="np-input nm-pick" aria-label={t("Channel")} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">{t("All channels ({n})", { n: channels.filter((c) => app === "all" || c.platform === app).length })}</option>
            {channels.filter((c) => app === "all" || c.platform === app).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.platform === "facebook" ? "Facebook" : "Instagram"}</option>)}
          </select>
        )}
        <div className="np-seg" role="tablist" aria-label={t("Date range")}>
          {RANGES.map((d, i) => <button key={d} type="button" role="tab" aria-selected={range === i} className={range === i ? "on" : ""} onClick={() => setRange(i)}>{t("{n} days", { n: d })}</button>)}
        </div>
        <button type="button" className="btn-outline" disabled={busy} onClick={refreshNow}>{busy ? t("Reading…") : t("Refresh now")}</button>
      </div>
      <p className="np-muted">
        {refreshedAt ? t("Read daily from Facebook and Instagram · last read {time}", { time: when(refreshedAt) }) : t("Read daily from Facebook and Instagram")}
        {" · "}{t("Views and reach aren't available yet.")}{hasThreads ? ` ${t("Threads numbers aren't available yet.")}` : ""}
      </p>
      {msg && <p className="np-note" role="status">{msg}</p>}
      {notes.length > 0 && (
        <p className="np-note nm-warn" role="note">{notes.map(([c, note]) => `${c.name}: ${t(note ?? "")}`).join(" · ")}</p>
      )}

      <section className="nm-tiles" aria-label={t("Totals")}>
        {tiles.map(([label, v, sub]) => (
          <div key={label} className="nm-tile"><small>{label}</small><b>{v}</b><span>{sub}</span></div>
        ))}
      </section>

      <section className="card nm-card" aria-labelledby="nmch">
        <h2 id="nmch">{t("Channels")}</h2>
        <div className="nm-scroll">
          <table className="nm-table">
            <thead><tr><th>{t("Channel")}</th><th>{t("Followers")}</th><th>{t("Change")}</th><th>{t("Posts")}</th><th>{t("Likes")}</th><th>{t("Comments")}</th></tr></thead>
            <tbody>
              {shown.map((c) => {
                const list = daysOf(c.id);
                const a = latest(list);
                const b = first(list);
                const ps = postsOf(c.id);
                return (
                  <tr key={c.id}>
                    <td><span className="nm-ch"><BrandIcon ch={c.platform} size={20} /><span>{c.name}</span></span></td>
                    <td className="nm-strong">{a === undefined ? "–" : shortCount(a)}</td>
                    <td>{a !== undefined && b !== undefined ? plus(a - b) : "–"}</td>
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

      <section className="card nm-card" aria-labelledby="nmtop">
        <div className="nm-head">
          <h2 id="nmtop">{t("Top posts")}</h2>
          <div className="np-seg" role="tablist" aria-label={t("Sort by")}>
            {([["likes", t("Likes")], ["comments", t("Comments")], ["shares", t("Shares")]] as [Sort, string][]).map(([s, l]) => <button key={s} type="button" role="tab" aria-selected={sort === s} className={sort === s ? "on" : ""} onClick={() => setSort(s)}>{l}</button>)}
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
                    <small>{c && <BrandIcon ch={c.platform} size={14} />} {c?.name}{p.at ? ` · ${when(p.at)}` : ""}</small>
                  </span>
                  <span className="nm-nums">
                    <span><b>{p.numbers.likes === undefined ? "–" : shortCount(p.numbers.likes)}</b><small>{t("Likes")}</small></span>
                    <span><b>{p.numbers.comments === undefined ? "–" : shortCount(p.numbers.comments)}</b><small>{t("Comments")}</small></span>
                    <span><b>{p.numbers.shares === undefined ? "–" : shortCount(p.numbers.shares)}</b><small>{t("Shares")}</small></span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="np-muted">{refreshedAt ? t("No posts in the last {n} days.", { n: span }) : t("Your numbers appear after the first daily reading, or press Refresh now.")}</p>
        )}
      </section>
    </div>
  );
}
