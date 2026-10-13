"use client";

import { useState } from "react";
import type { VideoRow } from "@/modules/admin/videos.ts";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import { n } from "../../marketplace/format";
import { downloadCsv } from "../../links/file-tools";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../links/links.css";
import "../admin.css";

type Metric = "views" | "likes" | "comments" | "shares";
const METRICS: [Metric, string][] = [["views", "Views"], ["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares"]];
const RANGES = [7, 30, 90];
const COLS = "minmax(280px, 3fr) 170px 120px 90px 90px 90px 90px";
const MYT = 8 * 3600_000;
const dayKey = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
const short = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Video stats for every connected account, as designed in the mockup (Stats). Numbers come from the daily refresh. */
export function StatsView({ rows, refreshedAt, now }: { rows: VideoRow[]; refreshedAt: string | null; now: number }) {
  const [acc, setAcc] = useState("all");
  const [range, setRange] = useState(1);
  const [sort, setSort] = useState<Metric>("views");
  const [dir, setDir] = useState(-1);
  const days = RANGES[range];
  const accounts = [...new Map(rows.map((r) => [r.openId, r.handle])).entries()];
  const inAcc = rows.filter((r) => acc === "all" || r.openId === acc);
  const posted = (r: VideoRow) => (r.at ? Date.parse(r.at) : 0);
  const cur = inAcc.filter((r) => posted(r) >= now - days * 86400_000);
  const prev = inAcc.filter((r) => posted(r) < now - days * 86400_000 && posted(r) >= now - 2 * days * 86400_000);
  const sum = (list: VideoRow[], m: Metric) => list.reduce((s, r) => s + r[m], 0);

  // Views by the day the video was posted (weekly buckets for 90 days).
  const bucket = days === 90 ? 7 : 1;
  const nBars = Math.ceil(days / bucket);
  const start = Date.parse(`${dayKey(now - (days - 1) * 86400_000)}T00:00:00Z`) - MYT;
  const bars = Array.from({ length: nBars }, (_, i) => {
    const from = start + i * bucket * 86400_000;
    const to = from + bucket * 86400_000;
    return { key: dayKey(from), end: dayKey(to - 86400_000), value: cur.filter((r) => posted(r) >= from && posted(r) < to).reduce((s, r) => s + r.views, 0) };
  });
  const max = Math.max(1, ...bars.map((b) => b.value));
  const top = [...cur].sort((a, b) => (a[sort] - b[sort]) * dir).slice(0, 50);
  const exportCsv = () =>
    downloadCsv("rezekii-video-stats.csv", [["Posted", "Account", "Video", "Posted with", "Views", "Likes", "Comments", "Shares", "Link"], ...[...cur].sort((a, b) => posted(b) - posted(a)).map((r) => [r.at, r.handle, r.title, r.viaRezekii ? "Rezekii" : "Elsewhere", r.views, r.likes, r.comments, r.shares, r.url])]);

  return (
    <>
      <div>
        <h1 className="nv-title">Video stats</h1>
        <p className="nv-sub">
          Every public video on connected accounts, whoever posted it · refreshed daily · 90 days kept{refreshedAt ? ` · last refreshed ${new Date(refreshedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" })}` : ""}
        </p>
      </div>

      <section className="nv-up nv-card" aria-label="Filters" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div className="nv-noscroll" role="group" aria-label="Account" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 220 }}>
          {[["all", "All accounts"] as [string, string], ...accounts].map(([id, label]) => (
            <button key={id} type="button" className={`nv-chip nv-press${acc === id ? " on" : ""}`} aria-pressed={acc === id} onClick={() => setAcc(id)}>{label}</button>
          ))}
        </div>
        <div className="nv-seg" role="group" aria-label="Date range" style={{ width: 240 }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${range * 100}%)` }} />
          {RANGES.map((d, i) => <button key={d} type="button" className={range === i ? "on" : ""} aria-pressed={range === i} onClick={() => setRange(i)}>{d} days</button>)}
        </div>
        <button type="button" className="nv-btn2 nv-sm nv-press" onClick={exportCsv} disabled={!cur.length}>Export CSV</button>
      </section>

      <section className="nv-up" aria-label="Totals" style={{ animationDelay: "60ms", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        {METRICS.map(([m, label]) => {
          const v = sum(cur, m);
          const p = sum(prev, m);
          const delta = p ? Math.round(((v - p) / p) * 100) : null;
          return (
            <div key={m} className="nv-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{shortCount(v)}</span>
                {delta !== null && <span className={`nv-badge ${delta >= 0 ? "b-green" : "b-red"}`}>{delta >= 0 ? "+" : ""}{delta}%</span>}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>on {n(cur.length)} {cur.length === 1 ? "video" : "videos"} posted in the last {days} days{delta !== null ? ` · vs the ${days} days before` : ""}</span>
            </div>
          );
        })}
      </section>

      <section className="nv-up nv-card" aria-labelledby="stchart" style={{ animationDelay: "120ms", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
          <h2 id="stchart" className="nv-h2">Views by {bucket === 7 ? "week" : "day"} posted</h2>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Each bar adds up the views of the videos posted that {bucket === 7 ? "week" : "day"}</span>
        </div>
        <div role="img" aria-label={`Views by ${bucket === 7 ? "week" : "day"} posted, last ${days} days`} style={{ height: 220, display: "flex", alignItems: "flex-end", gap: days === 30 ? 4 : 10, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
          {bars.map((b) => (
            <span key={b.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" }}>
              <span title={`${short(b.key)}${bucket === 7 ? ` – ${short(b.end)}` : ""}: ${n(b.value)} views`} style={{ width: "100%", maxWidth: 44, height: `${Math.max(b.value ? 2 : 0, (b.value / max) * 100)}%`, minHeight: b.value ? 3 : 0, borderRadius: "8px 8px 4px 4px", background: b.value === max ? "#00c073" : "var(--gsoft)", transition: "height .6s cubic-bezier(.2,.7,.2,1)" }} />
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
          <span>{short(bars[0].key)}</span><span>{short(bars[Math.floor(bars.length / 2)].key)}</span><span>{short(bars[bars.length - 1].end)}</span>
        </div>
      </section>

      <section className="nv-up nv-card nv-scrollx" aria-labelledby="sttop" style={{ animationDelay: "180ms", padding: 18 }}>
        <h2 id="sttop" className="nv-h2" style={{ padding: "4px 4px 12px" }}>Top videos</h2>
        <div role="table" aria-label="Top videos" style={{ minWidth: 960 }}>
          <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: COLS }}>
            <span role="columnheader">Video</span><span role="columnheader">Account</span><span role="columnheader">Posted with</span>
            {METRICS.map(([m, label]) => (
              <span key={m} role="columnheader" aria-sort={sort === m ? (dir < 0 ? "descending" : "ascending") : "none"}>
                <button type="button" className={`nv-thbtn${sort === m ? " on" : ""}`} onClick={() => { if (sort === m) setDir(-dir); else { setSort(m); setDir(-1); } }}>{label} {sort === m ? (dir < 0 ? "↓" : "↑") : ""}</button>
              </span>
            ))}
          </div>
          {top.map((v) => (
            <div key={v.id} role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: COLS }}>
              <span role="cell" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ width: 40, height: 54, borderRadius: 8, overflow: "hidden", background: "#0d1117", flexShrink: 0 }}>
                  {v.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  {v.url ? (
                    <a href={v.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "var(--text)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</a>
                  ) : (
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{v.at ? short(dayKey(Date.parse(v.at))) : ""}</span>
                </span>
              </span>
              <span role="cell" style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.handle}</span>
              <span role="cell"><span className={`nv-badge ${v.viaRezekii ? "b-green" : "b-gray"}`}>{v.viaRezekii ? "Rezekii" : "Elsewhere"}</span></span>
              <span role="cell" style={{ fontWeight: 800 }}>{shortCount(v.views)}</span>
              <span role="cell">{shortCount(v.likes)}</span>
              <span role="cell">{shortCount(v.comments)}</span>
              <span role="cell">{shortCount(v.shares)}</span>
            </div>
          ))}
        </div>
        {!top.length && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>{rows.length ? `No public videos posted in the last ${days} days on this account.` : "No video numbers yet. They appear after the daily refresh reads each connected account's public videos."}</div>}
      </section>
    </>
  );
}
