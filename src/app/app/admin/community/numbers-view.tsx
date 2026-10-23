"use client";

import { useState } from "react";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import type { CommunityChannel, CommunityDay, CommunityPost } from "@/modules/community/numbers.ts";
import { BrandIcon } from "../../brand-icons";
import { n } from "../../marketplace/format";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../links/links.css";
import "../admin.css";

type Platform = CommunityChannel["platform"];
const PLATFORMS: ["all" | Platform, string][] = [["all", "All"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["threads", "Threads"]];
const RANGES = [7, 28, 90];
type PostMetric = "views" | "likes" | "comments" | "shares";
const POST_METRICS: [PostMetric, string][] = [["views", "Views"], ["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares"]];
const CH_COLS = "minmax(240px, 3fr) 110px 100px 100px 100px 110px minmax(160px, 2fr)";
const POST_COLS = "minmax(280px, 3fr) 170px 90px 90px 90px 90px";
const MYT = 8 * 3600_000;
const dayKey = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
const short = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const sum = (xs: (number | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);

/** Community → Numbers: followers, views, reach and engagement per channel and per post, from the daily refresh. */
export function NumbersView({ channels, days, posts, refreshedAt, now }: { channels: CommunityChannel[]; days: CommunityDay[]; posts: CommunityPost[]; refreshedAt: string | null; now: number }) {
  const [platform, setPlatform] = useState<"all" | Platform>("all");
  const [channel, setChannel] = useState("all");
  const [range, setRange] = useState(1);
  const [sort, setSort] = useState<PostMetric>("views");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const span = RANGES[range];
  const from = dayKey(now - span * 86400_000);
  const shown = channels.filter((c) => (platform === "all" || c.platform === platform) && (channel === "all" || c.id === channel));
  const ids = new Set(shown.map((c) => c.id));
  const inRange = days.filter((d) => ids.has(d.channel) && d.day >= from);
  const byChannel = new Map(shown.map((c) => [c.id, inRange.filter((d) => d.channel === c.id)]));
  const latest = (list: CommunityDay[]) => [...list].reverse().find((d) => d.numbers.followers !== undefined)?.numbers.followers;
  const first = (list: CommunityDay[]) => list.find((d) => d.numbers.followers !== undefined)?.numbers.followers;
  const followersNow = sum(shown.map((c) => latest(byChannel.get(c.id) ?? [])));
  const followersThen = sum(shown.map((c) => first(byChannel.get(c.id) ?? [])));
  const totals: [string, number, string][] = [
    ["Followers", followersNow, followersThen ? `${followersNow - followersThen >= 0 ? "+" : ""}${n(followersNow - followersThen)} in ${span} days` : "on the selected channels"],
    ["Views", sum(inRange.map((d) => d.numbers.views)), `last ${span} days`],
    ["Reach", sum(inRange.map((d) => d.numbers.reach)), "people reached each day, added up"],
    ["Engagement", sum(inRange.map((d) => d.numbers.engagement)), "reactions, comments, shares and saves"],
  ];

  // Views by day.
  const keys = Array.from({ length: span }, (_, i) => dayKey(now - (span - i) * 86400_000));
  const bars = keys.map((k) => ({ key: k, value: sum(inRange.filter((d) => d.day === k).map((d) => d.numbers.views)) }));
  const max = Math.max(1, ...bars.map((b) => b.value));

  const postList = posts.filter((p) => ids.has(p.channel) && (!p.at || p.at >= new Date(now - span * 86400_000).toISOString()));
  const top = [...postList].sort((a, b) => (b.numbers[sort] ?? -1) - (a.numbers[sort] ?? -1)).slice(0, 50);
  const nameOf = new Map(channels.map((c) => [c.id, c]));
  const notes = shown.map((c) => [c, [...(byChannel.get(c.id) ?? [])].reverse()[0]?.numbers.note] as const).filter(([, note]) => note);

  async function refreshNow() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/community/refresh", { method: "POST" });
      const b = (await r.json().catch(() => ({}))) as { queued?: boolean; error?: string };
      setMsg(r.ok ? (b.queued ? "Refreshing: the numbers update over the next few minutes. Reload the page to see them." : "A refresh is already running.") : b.error ?? "Couldn't start the refresh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 className="nv-title">Numbers</h1>
          <p className="nv-sub">
            Your Facebook Pages, Instagram and Threads · refreshed daily{refreshedAt ? ` · last refreshed ${new Date(refreshedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" })}` : ""}
          </p>
        </div>
        <button type="button" className="nv-btn2 nv-sm nv-press" onClick={refreshNow} disabled={busy}>{busy ? "Starting…" : "Refresh now"}</button>
      </div>
      {msg && <p role="status" className="nv-sub">{msg}</p>}

      <section className="nv-up nv-card" aria-label="Filters" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div role="group" aria-label="App" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATFORMS.map(([p, label]) => (
            <button key={p} type="button" className={`nv-chip nv-press${platform === p ? " on" : ""}`} aria-pressed={platform === p} onClick={() => { setPlatform(p); setChannel("all"); }}>{label}</button>
          ))}
        </div>
        <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="nv-input" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
          <option value="all">All channels ({channels.filter((c) => platform === "all" || c.platform === platform).length})</option>
          {channels.filter((c) => platform === "all" || c.platform === platform).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.platform}</option>)}
        </select>
        <div className="nv-seg" role="group" aria-label="Date range" style={{ width: 240 }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${range * 100}%)` }} />
          {RANGES.map((d, i) => <button key={d} type="button" className={range === i ? "on" : ""} aria-pressed={range === i} onClick={() => setRange(i)}>{d} days</button>)}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="nv-card" role="note" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <b>{notes.length === 1 ? "1 channel" : `${notes.length} channels`} couldn&apos;t be read</b>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Channels connected before Community need connecting again once (Posts → New post → Channels → Connect) so Meta allows the numbers.</span>
          {[...new Set(notes.map(([, note]) => note))].map((note) => {
            const names = notes.filter(([, x]) => x === note).map(([c]) => c.name);
            return <span key={note} style={{ fontSize: 13 }}><b>{note}</b> {names.slice(0, 12).join(", ")}{names.length > 12 ? ` and ${names.length - 12} more` : ""}</span>;
          })}
        </section>
      )}

      <section className="nv-up" aria-label="Totals" style={{ animationDelay: "60ms", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        {totals.map(([label, v, sub]) => (
          <div key={label} className="nv-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
            <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{shortCount(v)}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</span>
          </div>
        ))}
      </section>

      <section className="nv-up nv-card" aria-labelledby="cmchart" style={{ animationDelay: "120ms", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="cmchart" className="nv-h2">Views by day</h2>
        <div role="img" aria-label={`Views by day, last ${span} days`} style={{ height: 200, display: "flex", alignItems: "flex-end", gap: span > 30 ? 2 : 6, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
          {bars.map((b) => (
            <span key={b.key} style={{ flex: 1, display: "flex", alignItems: "flex-end", height: "100%" }}>
              <span title={`${short(b.key)}: ${n(b.value)} views`} style={{ width: "100%", height: `${Math.max(b.value ? 2 : 0, (b.value / max) * 100)}%`, minHeight: b.value ? 3 : 0, borderRadius: "6px 6px 3px 3px", background: b.value === max ? "#00c073" : "var(--gsoft)" }} />
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
          <span>{short(keys[0])}</span><span>{short(keys[keys.length - 1])}</span>
        </div>
      </section>

      <section className="nv-up nv-card nv-scrollx" aria-labelledby="cmch" style={{ animationDelay: "180ms", padding: 18 }}>
        <h2 id="cmch" className="nv-h2" style={{ padding: "4px 4px 12px" }}>Channels</h2>
        <div role="table" aria-label="Channels" style={{ minWidth: 960 }}>
          <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: CH_COLS }}>
            {["Channel", "Followers", "Change", "Views", "Reach", "Engagement", "Note"].map((h) => <span key={h} role="columnheader">{h}</span>)}
          </div>
          {shown.map((c) => {
            const list = byChannel.get(c.id) ?? [];
            const now1 = latest(list);
            const then1 = first(list);
            const note = [...list].reverse()[0]?.numbers.note;
            return (
              <div key={c.id} role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: CH_COLS }}>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <BrandIcon ch={c.platform} size={22} />
                  <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                </span>
                <span role="cell" style={{ fontWeight: 800 }}>{now1 === undefined ? "–" : shortCount(now1)}</span>
                <span role="cell">{now1 !== undefined && then1 !== undefined ? `${now1 - then1 >= 0 ? "+" : ""}${n(now1 - then1)}` : "–"}</span>
                <span role="cell">{list.length ? shortCount(sum(list.map((d) => d.numbers.views))) : "–"}</span>
                <span role="cell">{list.length ? shortCount(sum(list.map((d) => d.numbers.reach))) : "–"}</span>
                <span role="cell">{list.length ? shortCount(sum(list.map((d) => d.numbers.engagement))) : "–"}</span>
                <span role="cell" style={{ fontSize: 12, color: "var(--muted)" }}>{note ?? (list.length ? "" : "Not read yet")}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="nv-up nv-card nv-scrollx" aria-labelledby="cmtop" style={{ animationDelay: "240ms", padding: 18 }}>
        <h2 id="cmtop" className="nv-h2" style={{ padding: "4px 4px 12px" }}>Top posts</h2>
        <div role="table" aria-label="Top posts" style={{ minWidth: 900 }}>
          <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: POST_COLS }}>
            <span role="columnheader">Post</span><span role="columnheader">Channel</span>
            {POST_METRICS.map(([m, label]) => (
              <span key={m} role="columnheader" aria-sort={sort === m ? "descending" : "none"}>
                <button type="button" className={`nv-thbtn${sort === m ? " on" : ""}`} onClick={() => setSort(m)}>{label} {sort === m ? "↓" : ""}</button>
              </span>
            ))}
          </div>
          {top.map((p) => {
            const c = nameOf.get(p.channel);
            return (
              <div key={`${p.channel}:${p.id}`} role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: POST_COLS }}>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ width: 40, height: 54, borderRadius: 8, overflow: "hidden", background: "#0d1117", flexShrink: 0 }}>
                    {p.thumb && (
                      // Meta's signed picture link, so a plain img.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "var(--text)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caption || "(no caption)"}</a>
                    ) : (
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caption || "(no caption)"}</span>
                    )}
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.at ? short(dayKey(Date.parse(p.at))) : ""}</span>
                  </span>
                </span>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", minWidth: 0 }}>
                  {c && <BrandIcon ch={c.platform} size={16} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.name ?? ""}</span>
                </span>
                {POST_METRICS.map(([m]) => <span key={m} role="cell" style={m === "views" ? { fontWeight: 800 } : undefined}>{p.numbers[m] === undefined ? "–" : shortCount(p.numbers[m]!)}</span>)}
              </div>
            );
          })}
        </div>
        {!top.length && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            {channels.length ? "No posts with numbers yet. They appear after the daily refresh, or press Refresh now." : "No Facebook, Instagram or Threads channels are connected by Admins yet."}
          </div>
        )}
      </section>
    </>
  );
}
