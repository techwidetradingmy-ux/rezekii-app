"use client";

import { useEffect, useRef, useState } from "react";
import type { Band, TopResult, TopRow } from "@/modules/rankings/boards.ts";
import { LevelFace } from "../../tts-ring";
import { Crown, Medal } from "./rank-icons";

const BAND_TABS: [Band, string][] = [["top", "TikTok top 100"], ["10k", "RM10K+"], ["1k", "RM1K – 10K"], ["100", "RM100 – 1K"], ["0", "RM0 – 100"]];
const GMV_FILTER: [string, string][] = [["all", "All"], ["exact", "Exact"], ["range", "Range only"]];
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const n = (v: number) => v.toLocaleString("en-US");

/** A sort heading with ▲▼: the first click sorts high to low, the next low to high. */
function SortHead({ label, k, sort, dir, onSort }: { label: string; k: string; sort: string; dir: string; onSort: (k: string, dir: string) => void }) {
  const on = sort === k;
  return (
    <button type="button" className={`tc-sort ${on ? "on" : ""}`} onClick={() => onSort(k, on && dir === "d" ? "a" : "d")} aria-label={`Sort by ${label}${on ? (dir === "d" ? ", high to low" : ", low to high") : ""}`}>
      {label}
      <span className="tc-ar" aria-hidden="true"><b className={on && dir === "a" ? "on" : ""}>▲</b><b className={on && dir === "d" ? "on" : ""}>▼</b></span>
    </button>
  );
}

function Gmv({ r }: { r: TopRow }) {
  return (
    <span className="tc-gmv">
      <b>{r.gmv}</b>
      {r.exact ? <span className="nv-badge b-green">Exact</span> : <small>{r.rank ? "TikTok's range" : "TikTok's band"}</small>}
    </span>
  );
}

function Contact({ r }: { r: TopRow }) {
  if (!r.wa && !r.em) return <span className="tc-none">–</span>;
  return (
    <span className="tc-contact">
      {r.wa && <span className="tc-ic tc-wa" title="WhatsApp in bio">WA</span>}
      {r.em && <span className="tc-ic tc-em" title="Email in bio">@</span>}
    </span>
  );
}

/**
 * Top creators, last 30 days, affiliates only (owner, 14 Oct 2026, "build all together"): B's top-3 cards, C's band tabs (TikTok's
 * affiliate top 100, then the Creator Marketplace by TikTok's GMV bands), A's sortable list or gallery with filters and search.
 */
export function TopCreators({ onOpen }: { onOpen: (user: string) => void }) {
  const [band, setBand] = useState<Band>("top");
  const [sort, setSort] = useState("gmv");
  const [dir, setDir] = useState("d");
  const [gmv, setGmv] = useState("all");
  const [wa, setWa] = useState(false);
  const [em, setEm] = useState(false);
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(1);
  const [view, setView] = useState<"list" | "gallery">("list");
  const [d, setD] = useState<TopResult | null>(null);
  const [error, setError] = useState("");
  const ask = useRef(0);

  useEffect(() => {
    const id = ++ask.current;
    const t = setTimeout(() => {
      const p = new URLSearchParams({ band, sort, dir, gmv, pg: String(pg) });
      if (wa) p.set("wa", "1");
      if (em) p.set("em", "1");
      if (q.trim()) p.set("q", q.trim());
      fetch(`/api/rankings/top?${p}`)
        .then(async (r) => { const x = await r.json(); if (id !== ask.current) return; if (!r.ok) setError(x.error || "Top creators could not load."); else { setError(""); setD(x); } })
        .catch(() => id === ask.current && setError("Top creators could not load. Refresh the page to try again."));
    }, q ? 220 : 0);
    return () => clearTimeout(t);
  }, [band, sort, dir, gmv, wa, em, q, pg]);

  const reset = (fn: () => void) => { fn(); setPg(1); };
  const onSort = (k: string, nd: string) => reset(() => { setSort(k); setDir(nd); });
  const start = band === "top" ? 3 : 0;
  const rows = d ? (band === "top" && sort === "gmv" && dir === "d" && !q && gmv === "all" && !wa && !em ? d.rows.slice(start) : d.rows) : [];
  const offset = rows === d?.rows ? 0 : start;

  return (
    <div className="tc-wrap">
      {d && d.hero.length > 0 && (
        <div className="tc-hero" aria-label="TikTok's top 3 affiliate creators, last 30 days">
          {[d.hero[1], d.hero[0], d.hero[2]].filter(Boolean).map((r) => (
            <button key={r.user} type="button" className={`tc-h tc-h${r.rank} nv-up`} onClick={() => onOpen(r.user)} style={{ animationDelay: `${r.rank === 1 ? 0 : r.rank === 2 ? 90 : 180}ms` }} aria-label={`#${r.rank} @${r.user}: open profile`}>
              <span className="tc-hicon">{r.rank === 1 ? <Crown size={34} /> : <Medal place={r.rank as 2 | 3} size={24} />}</span>
              <LevelFace lv={r.lv} size={r.rank === 1 ? 96 : 84} img={r.avatar} name={r.user} />
              <b className="tc-ellip" style={{ marginTop: 10, fontSize: 17, maxWidth: "100%" }}>@{r.user}</b>
              <span className="tc-ellip" style={{ fontSize: 13, color: "var(--muted)", maxWidth: "100%" }}>{r.nick}</span>
              <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{r.gmv}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{r.exact ? "Exact · " : ""}{short(r.fol)} followers</span>
            </button>
          ))}
        </div>
      )}

      <section className="nv-card tc-card" aria-label="Top creators, last 30 days">
        <div className="tc-tabs nv-noscroll" role="group" aria-label="GMV band">
          {BAND_TABS.map(([k, label]) => (
            <button key={k} type="button" className={`nv-chip nv-press ${band === k ? "on" : ""}`} aria-pressed={band === k} onClick={() => reset(() => { setBand(k); if (k !== "top" && sort === "gmv") setDir("d"); })}>
              {label} <span style={{ opacity: 0.7 }}>{d ? n(d.counts[k]) : ""}</span>
            </button>
          ))}
        </div>

        <div className="tc-tools">
          <div className="tc-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" className="nv-input" aria-label="Search creators by username or name" placeholder="Search creators" value={q} onChange={(e) => reset(() => setQ(e.target.value))} />
          </div>
          <div className="tc-seg" role="group" aria-label="GMV figures">
            {GMV_FILTER.map(([k, label]) => <button key={k} type="button" className={gmv === k ? "on" : ""} aria-pressed={gmv === k} onClick={() => reset(() => setGmv(k))}>{label}</button>)}
          </div>
          <button type="button" className={`nv-chip nv-press ${wa ? "on" : ""}`} aria-pressed={wa} onClick={() => reset(() => setWa(!wa))}>WhatsApp</button>
          <button type="button" className={`nv-chip nv-press ${em ? "on" : ""}`} aria-pressed={em} onClick={() => reset(() => setEm(!em))}>Email</button>
          <span style={{ flex: "1 1 0" }} />
          <div className="tc-seg" role="group" aria-label="View">
            {(["list", "gallery"] as const).map((v) => (
              <button key={v} type="button" className={view === v ? "on" : ""} aria-pressed={view === v} onClick={() => setView(v)}>
                {v === "list" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>}
                {v === "list" ? "List" : "Gallery"}
              </button>
            ))}
          </div>
        </div>

        <div className="tc-sortbar">
          <span className="nv-cap">Sort</span>
          <SortHead label="GMV" k="gmv" sort={sort} dir={dir} onSort={onSort} />
          <SortHead label="Exact GMV first" k="exact" sort={sort} dir={dir} onSort={onSort} />
          <SortHead label="Followers" k="fol" sort={sort} dir={dir} onSort={onSort} />
          <span className="tc-count">{d ? `${n(d.total)} ${d.total === 1 ? "creator" : "creators"}` : ""}</span>
        </div>

        {error && <p className="np-error" role="alert">{error}</p>}
        {!d && !error && <span className="tc-load"><span className="nv-spin" aria-hidden="true" />Loading top creators…</span>}
        {d && d.total === 0 && <span className="tc-load">No creators match. Try fewer filters.</span>}

        {d && view === "list" && rows.length > 0 && (
          <div className="tc-list">
            <div className="tc-row tc-headrow" aria-hidden="true"><span>#</span><span>Creator</span><span>GMV, 30 days</span><span>Followers</span><span>Contact</span></div>
            {rows.map((r, i) => (
              <button key={r.user} type="button" className="tc-row" onClick={() => onOpen(r.user)} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <span className="tc-pos">{band === "top" && sort === "gmv" && r.rank ? r.rank : i + 1 + offset}</span>
                <span className="tc-who">
                  <LevelFace lv={r.lv} size={42} img={r.avatar} name={r.user} badge={false} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <strong className="tc-ellip">@{r.user}</strong>
                    <span className="tc-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{r.nick}{r.lv != null ? ` · TikTok Shop Lv${r.lv}` : ""}{band !== "top" && r.rank ? ` · #${r.rank} on TikTok` : ""}</span>
                  </span>
                </span>
                <Gmv r={r} />
                <span className="tc-fol">{short(r.fol)}</span>
                <Contact r={r} />
              </button>
            ))}
          </div>
        )}

        {d && view === "gallery" && rows.length > 0 && (
          <div className="tc-grid">
            {rows.map((r, i) => (
              <button key={r.user} type="button" className="tc-gcard nv-up" onClick={() => onOpen(r.user)} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <LevelFace lv={r.lv} size={56} img={r.avatar} name={r.user} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>#{band === "top" && sort === "gmv" && r.rank ? r.rank : i + 1 + offset}</span>
                  <b className="tc-ellip">@{r.user}</b>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><b style={{ fontVariantNumeric: "tabular-nums", color: "var(--gink)" }}>{r.gmv}</b>{r.exact && <span className="nv-badge b-green">Exact</span>}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>{short(r.fol)} followers <Contact r={r} /></span>
                </span>
              </button>
            ))}
          </div>
        )}

        {d && d.rows.length < d.total && (
          <div className="tc-more">
            <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setPg(pg + 1)}>{`Show ${Math.min(48, d.total - d.rows.length)} more`}</button>
            <span>{`Showing ${n(d.rows.length)} of ${n(d.total)}`}</span>
          </div>
        )}
        <p className="tc-foot">
          Affiliate creators only; shop accounts are on Top sellers. {band === "top" ? "TikTok's 30-day list of the top affiliate creators in Malaysia, with the RM range TikTok gives (creators in both its RM and US$ lists)." : "TikTok Creator Marketplace, with each creator's GMV band as TikTok shows it."} Exact figures are what creators share, converted from US$ at TikTok&apos;s rate.
        </p>
      </section>
    </div>
  );
}
