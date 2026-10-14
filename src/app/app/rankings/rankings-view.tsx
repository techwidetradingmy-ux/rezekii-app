"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardMonth } from "@/modules/rankings/leaderboard.ts";
import type { ListResult } from "@/modules/rankings/query.ts";
import type { BestVideo, CreatorRow, Detail, FindRow } from "@/modules/rankings/build.ts";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { DailyTop100 } from "./daily-top100";
import "../marketplace/marketplace.css";
import "../levels/levels.css";
import "./rankings.css";

const CAT: Record<string, string> = {
  "600001": "Home Supplies", "600024": "Kitchenware", "600154": "Textiles & Soft Furnishings", "600942": "Household Appliances", "601152": "Womenswear", "601303": "Muslim Fashion",
  "601352": "Shoes", "601450": "Beauty & Personal Care", "601739": "Phones & Electronics", "601755": "Computers & Office", "602118": "Pet Supplies", "602284": "Baby & Maternity",
  "603014": "Sports & Outdoor", "604206": "Toys & Hobbies", "604453": "Furniture", "604579": "Tools & Hardware", "604968": "Home Improvement", "605196": "Automotive & Motorcycle",
  "605248": "Fashion Accessories", "700437": "Food & Beverages", "700645": "Health", "802184": "Kids' Fashion", "824328": "Menswear", "824584": "Luggage & Bags",
  "951432": "Collectibles", "953224": "Jewellery", "856720": "Pre-Owned", "801928": "Books & Media",
};
const COL = ["#00874f", "#7c3aed", "#e8005a", "#0e7490", "#f2a93b", "#1d4ed8", "#b45309", "#0f766e", "#9333ea", "#be123c"];
const LV: Record<string, string> = { gold: "b-amber", silver: "b-gray", bronze: "b-green" };
const LVN: Record<string, string> = { gold: "Gold", silver: "Silver", bronze: "Bronze" };
const SLOTS = ["1 day", "7 days", "30 days"];
// Index 5 (Daily Top 100 Creators) is shown first: the leaderboard.
const VIEWS = ["Top creators", "Top products", "Top videos", "Top LIVEs", "Find creators", "Daily Top 100 Creators"];
const VIEW_ORDER = [5, 0, 1, 2, 3, 4];
const SORTS: [string, string][][] = [
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["fol-d", "Followers: high to low"], ["fol-a", "Followers: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["rat-d", "Rating: high to low"], ["rat-a", "Rating: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["vw-d", "Views: high to low"], ["vw-a", "Views: low to high"]],
  [["gmv-d", "GMV: high to low"], ["gmv-a", "GMV: low to high"], ["len-d", "Length: longest first"], ["len-a", "Length: shortest first"]],
];
const FIND_FILTERS = ["10k+ followers", "Mostly video", "Mostly LIVE", "Shares exact GMV"];
const MORE: [string, "wa" | "em" | "x"][] = [["Has WhatsApp", "wa"], ["Has email", "em"], ["Shares exact GMV", "x"]];

const n = (v: number) => Math.round(v).toLocaleString("en-US");
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));
const band = (lo: number, hi: number, conv?: boolean | number) => (lo || hi ? `${conv ? "≈" : ""}RM${big(lo)} – ${big(hi)}` : "–");
const rmx = (v: number) => `RM${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v)}`;
const usd = (v: number) => `US$${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v)}`;
const hours = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m` : `${Math.round(sec / 60)}m`);
const rmWhole = (v: number) => `RM${Math.round(v).toLocaleString("en-US")}`;
const fmtDay = (iso: string | null) => { if (!iso) return ""; const [, m, d] = iso.split("-").map(Number); return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`; };

function Face({ src, name, i, size }: { src: string | null | undefined; name: string; i: number; size: number }) {
  return src ? (
    <span className="rk-face rk-photo" aria-hidden="true" style={{ width: size, height: size, backgroundImage: `url("${src}")` }} />
  ) : (
    <span className="rk-face" aria-hidden="true" style={{ width: size, height: size, background: COL[(i + 3) % COL.length] }}>{(name[0] || "?").toUpperCase()}</span>
  );
}
const Chev = () => <svg className="fb-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
const Tick16 = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="m5 12 5 5 9-10" /></svg>;
const Close = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;

type Panel = { user: string; row: CreatorRow | null; det: Detail | null; vid: { id: string; v: BestVideo } | null; nDays: number; first: string | null; last: string | null; rate30: number };
type Video = { id: string; title: string; seconds: number; stats: number[]; products: string[]; lo: number; hi: number; conv: boolean; posted: string };

/** The Rankings page from the mockup: Rezekii creators' monthly leaderboard, and TikTok Shop Malaysia's best-seller lists. */
/** "2026-10-12" as "12 Oct": a list TikTok published later than the others shows its own day. */
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function RankingsView({ board, you, asOf }: { board: BoardMonth[]; you: string | null; asOf: string | null }) {
  const { toast, flash } = useToast();
  const [tab, setTab] = useState(0);
  const [month, setMonth] = useState(0);
  const [mview, setMview] = useState(5);
  const [slot, setSlot] = useState(2);
  const [ctype, setCtype] = useState(0);
  const [cat, setCat] = useState("");
  const [more, setMore] = useState({ wa: false, em: false, x: false });
  const [sort, setSort] = useState("gmv-d");
  const [pg, setPg] = useState(1);
  const [pop, setPop] = useState<"" | "cat" | "more" | "sort">("");
  const [popQ, setPopQ] = useState("");
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [f, setF] = useState([false, false, false, false]);
  const [fsort, setFsort] = useState("gmv");
  const [fpg, setFpg] = useState(1);
  const [found, setFound] = useState<{ total: number; rows: FindRow[]; all?: number } | null>(null);
  const [cp, setCp] = useState<{ user: string; data: Panel | null } | null>(null);
  const [cpOut, setCpOut] = useState(false);
  const [vp, setVp] = useState<{ id: string; data: Video | null } | null>(null);
  const [vpOut, setVpOut] = useState(false);
  const [vpPlay, setVpPlay] = useState(false);
  const ask = useRef(0);

  // The TikTok lists come from the server one view at a time.
  const listKey = `${mview}|${slot}|${ctype}|${cat}|${more.wa}|${more.em}|${more.x}|${sort}|${pg}`;
  useEffect(() => {
    if (tab !== 1 || mview > 3) return;
    const id = ++ask.current;
    const p = new URLSearchParams({ view: String(mview), slot: String(slot), ctype: String(ctype), sort, pg: String(pg) });
    if (cat) p.set("cat", cat);
    for (const k of ["wa", "em", "x"] as const) if (more[k]) p.set(k, "1");
    fetch(`/api/rankings/list?${p}`)
      .then(async (r) => { const d = await r.json(); if (id !== ask.current) return; if (!r.ok) setError(d.error || "The rankings could not load."); else { setError(""); setData(d); } })
      .catch(() => id === ask.current && setError("The rankings could not load. Refresh the page to try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, listKey]);
  const findKey = `${q}|${f.join("")}|${fsort}|${fpg}`;
  useEffect(() => {
    if (tab !== 1 || mview !== 4) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams({ q, f: f.map((v) => (v ? "1" : "0")).join(""), sort: fsort, pg: String(fpg) });
      fetch(`/api/rankings/find?${p}`).then((r) => r.json()).then((d) => setFound((prev) => ({ ...d, all: !q && !f.some(Boolean) ? d.total : prev?.all ?? d.total }))).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mview, findKey]);

  const openCp = (user: string) => {
    setCpOut(false);
    setCp({ user, data: null });
    fetch(`/api/rankings/creator?u=${encodeURIComponent(user)}`).then((r) => r.json()).then((d) => setCp((c) => (c?.user === user ? { user, data: d } : c))).catch(() => {});
  };
  const closeCp = () => { setCpOut(true); setTimeout(() => { setCp(null); setCpOut(false); }, 250); };
  const openVp = (id: string) => {
    setVpOut(false);
    setVpPlay(false);
    setVp({ id, data: null });
    fetch(`/api/rankings/video?id=${id}`).then((r) => r.json()).then((d) => setVp((v) => (v?.id === id ? { id, data: d } : v))).catch(() => {});
  };
  const closeVp = () => { setVpOut(true); setTimeout(() => { setVp(null); setVpOut(false); setVpPlay(false); }, 220); };
  useEffect(() => {
    if (!cp && !vp) return;
    const onKey = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (vp) closeVp(); else closeCp(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pickView = (i: number) => { setMview(i); setPg(1); setSort("gmv-d"); setPop(""); setCat(""); setData(null); };
  const reset = (fn: () => void) => { fn(); setPg(1); setPop(""); setPopQ(""); };

  // ---- Rezekii leaderboard ----
  const cur = board[month]?.rows ?? [];
  const prev = board[month + 1]?.rows ?? null;
  const live = month === 0;
  const myRank = you ? cur.findIndex((c) => c.handle === you) : -1;
  const podium = [1, 0, 2].filter((i) => cur[i]);

  // ---- TikTok lists ----
  const sorts = SORTS[Math.min(mview, 3)];
  const head = (k: string, label: string) => {
    const on = sort.startsWith(`${k}-`), desc = sort === `${k}-d`;
    return { cls: on ? "on" : "", arrow: on ? (desc ? "↓" : "↑") : "↕", go: () => { setSort(on && desc ? `${k}-a` : `${k}-d`); setPop(""); },
      aria: `Sort by ${label}${on ? (desc ? " (now high to low, click for low to high)" : " (now low to high, click for high to low)") : ""}` };
  };
  const g = head("gmv", "GMV");
  const xk = sorts[2][0].split("-")[0];
  const x = head(xk, sorts[2][1].split(":")[0]);
  const gmvHead = `GMV, ${SLOTS[slot]}`;
  const pq = popQ.trim().toLowerCase();
  const catOpts: [string, number][] = data ? ([["", data.view === 1 ? data.total + (cat ? 0 : 0) : data.ctypes[0]], ...data.cats] as [string, number][]).filter(([c]) => !pq || (c ? CAT[c] ?? c : "all").toLowerCase().includes(pq)) : [];
  const allCount = data ? (data.view === 1 ? data.cats.reduce((a, c) => a + c[1], 0) : data.ctypes[0]) : 0;
  const rate = data ? data.rate30 : 4.08;
  const footNote = data
    ? `${data.view === 0 && data.slot !== "1D" ? `#1–${data.tier1} use TikTok's own ${data.slot === "7D" ? "7" : "30"}-day figures; the rest add up TikTok's daily figures (days in a daily top 100). ` : ""}` +
      `${data.view === 1 ? "TikTok ranks the top 100 in each of 28 categories; with a category chosen, the order is TikTok's own. For 7 and 30 days, products past each top 100 come from TikTok's daily lists added up (marked Daily figures). " : ""}` +
      "Numbers show the position in the list you are viewing. " +
      `${data.conv ? `${data.conv} ${data.conv === 1 ? "amount" : "amounts"} marked ≈ are converted from US$ at TikTok's rate. ` : ""}` +
      `${data.view === 0 && data.slot === "30D" ? `Exact figures are converted from US$ at RM${rate.toFixed(2)}. ` : ""}` +
      `${data.dropped ? `Left out: ${data.dropped} from TikTok's RM list that are missing from its US$ list.` : "TikTok's RM and US$ lists match."}`
    : "";
  const listNote = mview === 0 && more.x && slot !== 2 ? "Exact figures cover the last 30 days, so this view shows TikTok's range. Switch to 30 days to see them." : slot === 2 && (mview === 2 || mview === 3) ? "TikTok's documentation says its 30-day video and LIVE lists cover the last 14 days." : "";
  const hasActive = (mview === 0 && (!!cat || more.wa || more.em || more.x)) || (mview === 1 && !!cat);
  const moreOn = [more.wa, more.em, more.x].filter(Boolean).length;
  const left = data ? data.total - data.shown : 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="nv-seg" role="group" aria-label="Which ranking" style={{ width: 420, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: `translateX(${tab * 100}%)` }} />
          {["Rezekii creators", "TikTok marketplace"].map((label, i) => <button key={label} type="button" className={tab === i ? "on" : ""} aria-pressed={tab === i} onClick={() => setTab(i)}>{label}</button>)}
        </div>

        {tab === 0 && (
          <>
            <section className="nv-card" aria-labelledby="rkm" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", justifyContent: "space-between" }}>
                <h2 id="rkm" className="nv-h2">Leaderboard for {board[month]?.label}</h2>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: live ? "var(--gink)" : "var(--muted)" }}>
                  <span className={live ? "nv-dot" : "nv-doto"} aria-hidden="true" />{live ? `Live · updates every day · final on ${board[0]?.final}` : `Final · locked on ${board[month]?.final}`}
                </span>
              </div>
              <div className="rk-months nv-noscroll" role="group" aria-label="Month">
                {board.map((m, i) => (
                  <button key={m.key} type="button" className={`nv-chip nv-press ${month === i ? "on" : ""}`} aria-pressed={month === i} onClick={() => setMonth(i)}>
                    {i === 0 && <span className="nv-dot" aria-hidden="true" />}{i === 0 ? `${m.label} · Live` : m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {[
                  { label: "GMV by Rezekii creators", value: rmWhole(cur.reduce((a, c) => a + c.gmv, 0)), note: live ? "So far this month" : "Whole month" },
                  { label: "Videos posted", value: n(cur.reduce((a, c) => a + c.videos, 0)), note: "For Techwide campaign products" },
                  { label: "Your rank", value: myRank >= 0 ? `#${myRank + 1}` : "—", note: myRank >= 0 ? `Out of ${cur.length} creators` : "Sign in with TikTok to be ranked" },
                ].map((st) => (
                  <div key={st.label} className="rk-stat"><span className="nv-cap">{st.label}</span><span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{st.value}</span><span style={{ fontSize: 13, color: "var(--muted)" }}>{st.note}</span></div>
                ))}
              </div>
            </section>

            {podium.length > 0 && (
              <section className="nv-card" aria-label="Top three" style={{ padding: "26px 22px 0", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-end", maxWidth: 720, margin: "0 auto" }}>
                  {podium.map((idx, pos) => {
                    const c = cur[idx];
                    const p = [1, 0, 2].indexOf(idx);
                    return (
                      <div key={c.handle} className="rk-col">
                        <a className="rk-who rk-link" href={`https://www.tiktok.com/${c.handle}`} target="_blank" rel="noopener" aria-label={`Open ${c.handle} on TikTok`} style={{ animationDelay: `${350 + pos * 120}ms` }}>
                          {idx === 0 && <svg className="rk-crown" width="34" height="26" viewBox="0 0 34 26" aria-hidden="true"><path d="M3 22 1 6l9 7 7-12 7 12 9-7-2 16z" fill="#f2c230" stroke="#a86e00" strokeWidth="1.5" strokeLinejoin="round" /></svg>}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.avatar ? <img className="rk-av" src={c.avatar} alt="" /> : <span className="rk-av" style={{ background: COL[idx % COL.length] }}>{c.handle[1]?.toUpperCase()}</span>}
                          <strong style={{ fontSize: 15, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.handle}</strong>
                          <span className={`nv-badge ${LV[c.level]}`}>{LVN[c.level]}</span>
                          <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rmWhole(c.gmv)}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>GMV</span>
                        </a>
                        <div className="rk-bar" style={{ height: ["150px", "200px", "120px"][p], background: ["linear-gradient(180deg,#c7d1d7,#7e8f99)", "linear-gradient(180deg,#f7d354,#c08a0a)", "linear-gradient(180deg,#e0a06d,#9a5a2c)"][p], animationDelay: `${pos * 120}ms` }}>{idx + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="nv-card" aria-label="Full ranking" style={{ padding: "18px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="rk-row rk-head" style={{ animation: "none" }}><span>#</span><span>Creator</span><span>GMV</span><span className="rk-hide">Videos</span><span className="rk-hide">vs last month</span></div>
              {cur.length === 0 && <span style={{ padding: "18px 14px", color: "var(--muted)" }}>No Rezekii creators have TikTok data yet. Creators appear here after they sign in with TikTok.</span>}
              {cur.map((c, i) => {
                const was = prev ? prev.findIndex((p) => p.handle === c.handle) : -1;
                const move = was < 0 ? 0 : was - i;
                return (
                  <div key={c.handle} className={`rk-row ${c.handle === you ? "rk-you" : ""}`} style={{ animationDelay: `${200 + i * 50}ms` }}>
                    <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <a className="rk-link" href={`https://www.tiktok.com/${c.handle}`} target="_blank" rel="noopener" aria-label={`Open ${c.handle} on TikTok`} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.avatar ? <img className="rk-pic" src={c.avatar} alt="" style={{ width: 36, height: 36 }} /> : <span style={{ width: 36, height: 36, borderRadius: "50%", background: COL[i % COL.length], color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{c.handle[1]?.toUpperCase()}</span>}
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.handle}{c.handle === you ? " (signed in)" : ""}</strong>
                        <span className={`nv-badge ${LV[c.level]}`} style={{ alignSelf: "flex-start", marginTop: 2 }}>{LVN[c.level]}</span>
                      </span>
                    </a>
                    <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rmWhole(c.gmv)}</span>
                    <span className="rk-hide" style={{ fontSize: 14, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{`${c.videos} ${c.videos === 1 ? "video" : "videos"}`}</span>
                    <span className="rk-hide" style={{ fontWeight: 800, color: move > 0 ? "var(--gink)" : move < 0 ? "var(--red)" : "var(--muted)" }}>{!prev ? "—" : move > 0 ? `▲ ${move}` : move < 0 ? `▼ ${Math.abs(move)}` : "—"}</span>
                  </div>
                );
              })}
              <p style={{ margin: "8px 14px 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                Sales through Techwide&apos;s TAP campaign links, from TikTok&apos;s campaign data, for creators signed in to Rezekii with TikTok. A new leaderboard starts on the 1st of each month.
              </p>
            </section>
          </>
        )}

        {tab === 1 && (
          <>
            <div className="nv-noscroll" role="group" aria-label="Marketplace view" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {VIEW_ORDER.map((i) => <button key={VIEWS[i]} type="button" className={`nv-chip nv-press ${mview === i ? "on" : ""}`} aria-pressed={mview === i} onClick={() => pickView(i)}>{VIEWS[i]}</button>)}
            </div>
            {error && <p className="np-error" role="alert">{error}</p>}
            {mview === 5 && <DailyTop100 />}

            {mview < 4 && (
              <section className="nv-card" aria-label={`${["Bestselling creators", "Bestselling products", "Bestselling videos", "Bestselling LIVEs"][mview]} · TikTok Shop Malaysia`} style={{ padding: "18px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "0 14px 10px" }}>
                  <strong style={{ fontSize: 17 }}>{["Bestselling creators", "Bestselling products", "Bestselling videos", "Bestselling LIVEs"][mview]} · TikTok Shop Malaysia{data && asOf && data.asOf < asOf ? ` · ${dayLabel(data.asOf)}` : ""}</strong>
                  <div className="nv-seg" role="group" aria-label="Period" style={{ width: 300, maxWidth: "100%" }}>
                    <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${slot * 100}%)` }} />
                    {SLOTS.map((label, i) => <button key={label} type="button" className={slot === i ? "on" : ""} aria-pressed={slot === i} onClick={() => reset(() => setSlot(i))}>{label}</button>)}
                  </div>
                </div>
                <div className="fb" style={{ padding: "0 14px 12px" }}>
                  <div className="fb-row">
                    {mview === 0 && (
                      <div className="nv-seg" role="group" aria-label="Creator type" style={{ width: 330, maxWidth: "100%" }}>
                        <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${ctype * 100}%)` }} />
                        {["All", "Video", "LIVE"].map((label, i) => <button key={label} type="button" className={ctype === i ? "on" : ""} aria-pressed={ctype === i} onClick={() => reset(() => setCtype(i))}>{`${label} ${data ? n(data.ctypes[i]) : ""}`}</button>)}
                      </div>
                    )}
                    {(mview === 0 || mview === 1) && (
                      <div className="fb-dd">
                        <button type="button" className={`fb-btn ${cat ? "on" : ""}`} aria-haspopup="listbox" aria-expanded={pop === "cat"} onClick={() => { setPop(pop === "cat" ? "" : "cat"); setPopQ(""); }}><span className="fb-lab">Category</span><span className="fb-val">{cat ? CAT[cat] ?? cat : "All"}</span><Chev /></button>
                        {pop === "cat" && (
                          <>
                            <button type="button" className="fb-shield" aria-label="Close menu" onClick={() => setPop("")} />
                            <div className="fb-pop" role="dialog" aria-label="Category">
                              <input type="search" className="fb-psearch" aria-label="Search categories" placeholder="Search categories" value={popQ} onChange={(e) => setPopQ(e.target.value)} autoFocus />
                              <div className="fb-list" role="listbox" aria-label="Category">
                                {catOpts.map(([c, count]) => (
                                  <button key={c || "all"} type="button" role="option" aria-selected={cat === c} className={`fb-opt ${cat === c ? "on" : ""}`} onClick={() => reset(() => setCat(c))}>
                                    <span className="fb-name">{c ? CAT[c] ?? c : "All"}</span><span className="fb-n">{n(c ? count : allCount)}</span>{cat === c && <Tick16 />}
                                  </button>
                                ))}
                                {!!pq && catOpts.length === 0 && <span className="fb-empty">No category matches.</span>}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {mview === 0 && (
                      <div className="fb-dd">
                        <button type="button" className={`fb-btn ${moreOn ? "on" : ""}`} aria-haspopup="listbox" aria-expanded={pop === "more"} onClick={() => setPop(pop === "more" ? "" : "more")}><span className="fb-lab">Filters</span><span className="fb-val">{moreOn ? `${moreOn} on` : "None"}</span><Chev /></button>
                        {pop === "more" && (
                          <>
                            <button type="button" className="fb-shield" aria-label="Close menu" onClick={() => setPop("")} />
                            <div className="fb-pop" role="dialog" aria-label="Filters">
                              <div className="fb-list" role="listbox" aria-label="Filters" aria-multiselectable="true">
                                {MORE.map(([label, k]) => (
                                  <button key={k} type="button" role="option" aria-selected={more[k]} className={`fb-opt ${more[k] ? "on" : ""}`} onClick={() => { setMore({ ...more, [k]: !more[k] }); setPg(1); }}>
                                    <span className="fb-tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
                                    <span className="fb-name">{label}</span><span className="fb-n">{data ? n(data.more[k]) : ""}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <span style={{ flex: "1 1 0" }} />
                    <div className="fb-dd">
                      <button type="button" className="fb-btn" aria-haspopup="listbox" aria-expanded={pop === "sort"} onClick={() => setPop(pop === "sort" ? "" : "sort")}><span className="fb-lab">Sort</span><span className="fb-val">{(sorts.find(([v]) => v === sort) ?? sorts[0])[1]}</span><Chev /></button>
                      {pop === "sort" && (
                        <>
                          <button type="button" className="fb-shield" aria-label="Close menu" onClick={() => setPop("")} />
                          <div className="fb-pop right fit" role="dialog" aria-label="Sort">
                            <div className="fb-list" role="listbox" aria-label="Sort">
                              {sorts.map(([v, label]) => <button key={v} type="button" role="option" aria-selected={sort === v} className={`fb-opt ${sort === v ? "on" : ""}`} onClick={() => { setSort(v); setPop(""); }}><span className="fb-name">{label}</span>{sort === v && <Tick16 />}</button>)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {hasActive && (
                    <div className="fb-chips">
                      {cat && <Chip label={`Category: ${CAT[cat] ?? cat}`} aria="Remove category filter" onRemove={() => reset(() => setCat(""))} />}
                      {mview === 0 && MORE.map(([label, k]) => more[k] && <Chip key={k} label={label} aria={`Remove ${label}`} onRemove={() => { setMore({ ...more, [k]: false }); setPg(1); }} />)}
                      <button type="button" className="nv-link" onClick={() => reset(() => { setCat(""); setMore({ wa: false, em: false, x: false }); })} style={{ fontSize: 13 }}>Clear all</button>
                    </div>
                  )}
                </div>
                {listNote && <p style={{ margin: 0, padding: "0 14px 12px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{listNote}</p>}
                {!data && !error && <span style={{ padding: "18px 14px", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><span className="nv-spin" aria-hidden="true" />Loading TikTok&apos;s lists…</span>}

                {data?.creators && (
                  <>
                    <div className="rk-row rk-crow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>Creator</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide">Top video</span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>Followers<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                      <span className="rk-hide">Contact</span>
                    </div>
                    {data.creators.length === 0 && <span style={{ padding: "18px 14px", color: "var(--muted)" }}>No creators match these filters for this period.</span>}
                    {data.creators.map(({ row, det, vid }, i) => {
                      const [, user, nick, fol, , lo, hi, conv, tier, nd] = row;
                      const c0 = det?.c?.[0] ? CAT[det.c[0]] : "";
                      const gm = det?.x ? { gmv: rmx(det.x), exact: true, note: "" } : { gmv: band(lo, hi, conv), exact: false, note: tier === 2 ? `Daily figures, ${nd} ${nd === 1 ? "day" : "days"}` : conv ? "Converted from TikTok's US$ range" : "TikTok's range" };
                      return (
                        <div key={user} className="rk-row rk-crow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                          <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                          <button type="button" className="rk-who2" onClick={() => openCp(user)} aria-label={`Details for @${user}`}>
                            <Face src={det?.a} name={user} i={i} size={40} />
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <strong className="rk-ellip">@{user}</strong>
                              <span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{nick}{c0 ? ` · ${c0}` : ""}{det && det.vs >= 0 ? ` · ${det.vs >= 50 ? `Video ${det.vs}` : `LIVE ${100 - det.vs}`}%` : ""}</span>
                            </span>
                          </button>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{gm.gmv}</span>
                            {gm.exact ? <span className="nv-badge b-green" style={{ alignSelf: "flex-start" }}>Exact</span> : <span style={{ fontSize: 12, color: "var(--muted)" }}>{gm.note}</span>}
                          </span>
                          <span className="rk-hide" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            {vid ? (
                              <button type="button" className="rk-who2" onClick={() => openVp(vid.id)} aria-label={`Watch @${user}'s best-selling video on TikTok`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                                <strong style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>▶ {vid.hi ? band(vid.lo, vid.hi) : `Best day ${rmx(vid.peak)}`}</strong>
                                <span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)", maxWidth: "100%" }}>{`${short(vid.views)} views · ${vid.posted}`}</span>
                              </button>
                            ) : <span style={{ fontSize: 12, color: "var(--muted)" }}>–</span>}
                          </span>
                          <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{short(fol)}</span>
                          <span className="rk-hide" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {det?.em && <button type="button" className="rk-em nv-press" onClick={() => { const em = det.em; navigator.clipboard?.writeText(em).then(() => flash(`Email copied: ${em}`), () => flash(em)); }} aria-label={`Copy email for @${user}`}>Email</button>}
                            {det?.wa && <a className="rk-wa nv-press" href={`https://wa.me/${det.wa}`} target="_blank" rel="noopener" aria-label={`WhatsApp @${user}`}>WhatsApp</a>}
                            <a className="nv-link" href={`https://www.tiktok.com/@${user}`} target="_blank" rel="noopener" style={{ fontSize: 13 }}>Profile</a>
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}

                {data?.products && (
                  <>
                    <div className="rk-row rk-vrow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>Product</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide">Shop</span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>Rating<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                    </div>
                    {data.products.map(({ row, meta }, i) => {
                      const [, lo, hi, conv, , tier, nd] = row;
                      const [id, name, shop, rating, pcat, img] = meta;
                      return (
                        <div key={id} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                          <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                          <a href={`https://shop.tiktok.com/view/product/${id}?region=MY`} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                            <span className="rk-thumb rk-photo" aria-hidden="true" style={img ? { backgroundImage: `url("${img.replace(/~tplv-([a-z0-9]+)-origin-jpeg\.jpeg/, "~tplv-$1-resize-webp:300:300.webp")}")` } : undefined} />
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">{name}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{CAT[pcat] ?? ""}</span></span>
                          </a>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{tier === 2 ? `Daily figures, ${nd} ${nd === 1 ? "day" : "days"}` : "TikTok's range"}</span></span>
                          <span className="rk-hide rk-ellip" style={{ color: "var(--muted)" }}>{shop}</span>
                          <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>★ {rating ? rating.toFixed(1) : "–"}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {data?.videos && (
                  <>
                    <div className="rk-row rk-vrow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>Video</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>Views · likes<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                      <span className="rk-hide">Posted</span>
                    </div>
                    {data.videos.map(([, id, nick, dur, views, likes, , , lo, hi, date, prods, conv], i) => (
                      <div key={id} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                        <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                        <button type="button" className="rk-who2" onClick={() => openVp(id)} aria-label={`Play video by ${nick}`}>
                          <span className="rk-thumb" aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#ffffff" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">{`Video by ${nick} · ${dur}s`}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{prods.length ? `Sells: ${prods.join(" · ")}` : "No product tagged"}</span></span>
                        </button>
                        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{`${short(views)} views · ${short(likes)} likes`}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)" }}>{date}</span>
                      </div>
                    ))}
                  </>
                )}

                {data?.lives && (
                  <>
                    <div className="rk-row rk-vrow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>LIVE</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>Length<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                      <span className="rk-hide">Started</span>
                    </div>
                    {data.lives.map(([, user, nick, title, dur, date, lo, hi, avatar, conv], i) => (
                      <div key={`${user}-${i}`} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                        <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                        <a href={`https://www.tiktok.com/@${user}`} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                          <Face src={avatar} name={user} i={i} size={40} />
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">@{user}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{title || nick}</span></span>
                        </a>
                        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{hours(dur)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)" }}>{date}</span>
                      </div>
                    ))}
                  </>
                )}

                {data && <p style={{ margin: 0, padding: "10px 14px 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{footNote}</p>}
                {data && left > 0 && (
                  <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setPg(pg + 1)}>{`Show ${Math.min(50, left)} more`}</button>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{`Showing ${n(data.shown)} of ${n(data.total)}`}</span>
                  </div>
                )}
              </section>
            )}

            {mview === 4 && (
              <section className="nv-card" aria-label="Find creators" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="search" className="nv-input" aria-label="Search creators by username or name" placeholder="Search by username or name" value={q} onChange={(e) => { setQ(e.target.value); setFpg(1); }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {FIND_FILTERS.map((label, i) => <button key={label} type="button" className={`nv-chip nv-press ${f[i] ? "on" : ""}`} aria-pressed={f[i]} onClick={() => { setF(f.map((v, j) => (j === i ? !v : v))); setFpg(1); }}>{label}</button>)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    {found ? (found.total ? `${found.total.toLocaleString("en-US")}${found.all && found.total < found.all ? ` of ${found.all.toLocaleString("en-US")} creators match` : " creators on TikTok Creator Marketplace"} · showing ${Math.min(found.rows.length, found.total).toLocaleString("en-US")}` : "No creators match. Try fewer filters.") : "Loading…"}
                  </span>
                  <div role="group" aria-label="Sort creators" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Sort</span>
                    {[["gmv", "GMV"], ["fol", "Followers"]].map(([v, label]) => <button key={v} type="button" className={`nv-chip nv-press ${fsort === v ? "on" : ""}`} aria-pressed={fsort === v} onClick={() => { setFsort(v); setFpg(1); }}>{label}</button>)}
                  </div>
                </div>
                <div className="rk-cards">
                  {found?.rows.map(([handle, nick, fol, gmv, vp2, views, , avatar], i) => (
                    <div key={handle} className="rk-card" style={{ animationDelay: `${Math.min(i % 24, 12) * 40}ms` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {avatar ? <span className="rk-face rk-photo" aria-hidden="true" style={{ width: 44, height: 44, backgroundImage: `url("${avatar}")` }} /> : <span style={{ width: 44, height: 44, borderRadius: "50%", background: COL[(i + 1) % COL.length], color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{(handle[1] || "?").toUpperCase()}</span>}
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</strong><span style={{ fontSize: 13, color: "var(--muted)" }}>{nick} · {short(fol)} followers</span></span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span className="nv-cap">GMV, 30 days</span><span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{gmv}</span></div>
                      <div className="rk-split" aria-hidden="true"><span style={{ width: `${vp2 < 0 ? 0 : vp2}%`, background: "#00c073" }} /><span style={{ width: `${vp2 < 0 ? 0 : 100 - vp2}%`, background: "#7c3aed" }} /></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}><span>Video {vp2 < 0 ? 0 : vp2}%</span><span>LIVE {vp2 < 0 ? 0 : 100 - vp2}%</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--muted)" }}><span>{views} avg video views</span><a className="nv-link" href={`https://www.tiktok.com/${handle}`} target="_blank" rel="noopener">View on TikTok</a></div>
                    </div>
                  ))}
                </div>
                {found && found.rows.length < found.total && <div style={{ display: "flex", justifyContent: "center" }}><button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setFpg(fpg + 1)}>{`Show ${Math.min(48, found.total - found.rows.length)} more`}</button></div>}
              </section>
            )}
          </>
        )}
      </div>

      {cp && <CreatorPanel cp={cp} out={cpOut} onClose={closeCp} onPlay={openVp} />}
      {vp && (
        <>
          <button type="button" aria-label="Close video" className={`nv-dim ${vpOut ? "out" : ""}`} onClick={closeVp} style={{ zIndex: 60 }} />
          <div role="dialog" aria-modal="true" aria-labelledby="rkvpt" className={`rk-vp ${vpOut ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <strong id="rkvpt" className="rk-ellip" style={{ fontSize: 15 }}>{vp.data?.title ?? "Video"}</strong>
              <button type="button" className="nv-press" aria-label="Close video" onClick={closeVp} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Close /></button>
            </div>
            <div className="rk-vp-frame" style={vpPlay ? { padding: 0 } : undefined}>
              {vpPlay ? (
                <iframe title={vp.data?.title ?? "TikTok video"} src={`https://www.tiktok.com/player/v1/${vp.id}?autoplay=1&rel=0`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" style={{ width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />
              ) : (
                <>
                  <button type="button" className="rk-vp-play" onClick={() => setVpPlay(true)} aria-label="Play video"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></button>
                  <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>{vp.data ? `${vp.data.seconds} seconds` : ""}</span>
                </>
              )}
            </div>
            <div className="rk-vp-stats">
              {(["Views", "Likes", "Comments", "Shares"] as const).map((k, i) => <div key={k}><span>{vp.data ? short(vp.data.stats[i] ?? 0) : "–"}</span><span>{k}</span></div>)}
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--body)" }}>{vp.data ? (vp.data.products.length ? `Sells: ${vp.data.products.join(" · ")}` : "No product tagged") : ""}</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
              <span>{vp.data ? [vp.data.posted ? `Posted ${vp.data.posted}` : "", vp.data.hi ? `GMV ${band(vp.data.lo, vp.data.hi, vp.data.conv)}` : ""].filter(Boolean).join(" · ") : ""}</span>
              <a className="nv-link" href={`https://www.tiktok.com/@/video/${vp.id}`} target="_blank" rel="noopener" style={{ fontSize: 13 }}>Open on TikTok</a>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
      {asOf && <span hidden>{asOf}</span>}
    </>
  );
}

function Chip({ label, aria, onRemove }: { label: string; aria: string; onRemove: () => void }) {
  return (
    <span className="fb-chip">
      <span>{label}</span>
      <button type="button" className="fb-x" aria-label={aria} onClick={onRemove}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </span>
  );
}

/** The mockup's creator panel: TikTok Creator Marketplace profile, last 30 days. */
function CreatorPanel({ cp, out, onClose, onPlay }: { cp: { user: string; data: Panel | null }; out: boolean; onClose: () => void; onPlay: (id: string) => void }) {
  const p = cp.data;
  const d = p?.det;
  const row = p?.row;
  const split = d ? d.vg + d.lg : 0;
  const vpc = split && d ? Math.round((d.vg / split) * 100) : 0;
  const v = p?.vid?.v;
  const peak = v ? Math.max(1, ...v[11].map((r) => r[2])) : 1;
  const nDays = p?.nDays ?? 1;
  const X = (di: number) => (4 + (di * 292) / Math.max(1, nDays - 1)).toFixed(1);
  const Y = (val: number) => (84 - (val / peak) * 76).toFixed(1);
  const bars = v ? v[11].map(([di, lo, hi]) => `M${X(di)} ${Y(hi)} V${Math.max(+Y(lo), +Y(hi) + 2).toFixed(1)}`).join(" ") : "M0 0";
  const audience = d ? [d.f || d.m ? `Female ${d.f}% · Male ${d.m}%${d.f + d.m < 98 ? ` · not stated ${100 - d.f - d.m}%` : ""}` : "", d.age ? `Most common age ${d.age}` : "", d.loc ? `Top places: ${d.loc}` : ""].filter(Boolean).join(". ") : "";
  return (
    <>
      <button type="button" aria-label="Close" className={`nv-dim ${out ? "out" : ""}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="rkcpt" className={`nv-panel ${out ? "out" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}><span className="nv-dot" aria-hidden="true" />TikTok Creator Marketplace · last 30 days</span>
          <button type="button" className="nv-press" aria-label="Close" onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Close /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Face src={d?.a} name={cp.user} i={0} size={72} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h3 id="rkcpt" className="rk-ellip" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>@{cp.user}</h3>
            <span className="rk-ellip" style={{ fontSize: 14, color: "var(--muted)" }}>{row ? `${row[2]} · ${short(row[3])} followers` : d?.nick ?? ""}</span>
          </span>
        </div>
        {!p && <span style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><span className="nv-spin" aria-hidden="true" />Loading…</span>}
        {p && (
          <>
            {d && d.c.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{d.c.map((c) => <span key={c} className="nv-badge b-gray">{CAT[c] ?? c}</span>)}</div>}
            <div style={{ background: "var(--gsoft)", borderRadius: 18, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gink)" }}>{d?.x ? "GMV, last 30 days · exact, shared by the creator" : "GMV, last 30 days · TikTok band"}</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: "var(--gink)", fontVariantNumeric: "tabular-nums" }}>{d?.x ? rmx(d.x) : d?.band || "–"}</span>
              <span style={{ fontSize: 13, color: "var(--gink)" }}>{d?.x ? `TikTok gives exact figures in US$ only: ${usd(d.xu)}, converted at TikTok's rate of RM${p.rate30.toFixed(2)} per US$.` : "This creator keeps the exact figure private, so TikTok shows a band."}</span>
            </div>
            {split > 0 && d && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="rk-split" aria-hidden="true"><span style={{ width: `${vpc}%`, background: "#00c073" }} /><span style={{ width: `${100 - vpc}%`, background: "#7c3aed" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}><span>Video {vpc}% · {rmx(d.vg)}</span><span>LIVE {100 - vpc}% · {rmx(d.lg)}</span></div>
              </div>
            )}
            {v && p.vid ? (
              <div style={{ border: "1.5px solid var(--border)", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span className="nv-cap">Best-selling video</span><button type="button" className="nv-link" onClick={() => onPlay(p.vid!.id)} style={{ fontSize: 13 }}>▶ Play</button></div>
                <span style={{ fontSize: 14, lineHeight: 1.45 }}>{v[7].length ? `Sells: ${v[7].join(" · ")}` : "No product tagged"}</span>
                <div className="rk-kv">
                  {([["Posted", v[4]], ["Age", `${v[5]} ${v[5] === 1 ? "day" : "days"}`], ["GMV, 30-day list", v[9] ? band(v[8], v[9]) : "Not in top 100"], ["Days in daily top 100", `${v[10]} of ${nDays}`], ["Views", short(v[0])], ["Likes", short(v[1])]] as [string, string][]).map(([k, val]) => <div key={k}><span>{k}</span><span>{val}</span></div>)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{`Daily GMV (TikTok's range), last ${nDays} ${nDays === 1 ? "day" : "days"}`}</span>
                  <svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none" role="img" aria-label={`Daily GMV for this video on ${v[10]} of the last ${nDays} days, best day ${rmx(peak)}`} style={{ display: "block", background: "var(--surface2)", borderRadius: 12 }}>
                    <path d="M4 84 H296" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <path d={bars} fill="none" stroke="#00c073" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}><span>{fmtDay(p.first)}</span><span>Best day {rmx(peak)}</span><span>{fmtDay(p.last)}</span></div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{`No video from this creator reached TikTok's daily top 100 in the last ${nDays} ${nDays === 1 ? "day" : "days"}.`}</span>
            )}
            <div className="rk-kv">
              {([["Units sold", d?.u ? short(d.u) : "–"], ["Avg commission", d?.com ? `${d.com / 100}%` : "–"], ["Brands worked with", d?.br ? short(d.br) : "–"], ["Products promoted", d?.pr ? short(d.pr) : "–"], ["Sales videos", short(d?.ev ?? 0)], ["Sales LIVEs", short(d?.el ?? 0)]] as [string, string][]).map(([k, val]) => <div key={k}><span>{k}</span><span>{val}</span></div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="nv-cap">Audience</span><span style={{ fontSize: 14, lineHeight: 1.5 }}>{audience || "TikTok has no audience data for this creator."}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="nv-cap">Contact</span>
              {d?.wa && <a className="rk-wa nv-press" href={`https://wa.me/${d.wa}`} target="_blank" rel="noopener" style={{ alignSelf: "flex-start", height: 40, padding: "0 16px" }}>WhatsApp +{d.wa}</a>}
              {d?.em && <span style={{ fontSize: 14 }}>Email: <strong style={{ userSelect: "all" }}>{d.em}</strong></span>}
              {d?.ig && <a className="nv-link" href={`https://www.instagram.com/${d.ig}`} target="_blank" rel="noopener">Instagram @{d.ig}</a>}
              {!d?.wa && !d?.em && !d?.ig && <span style={{ fontSize: 14, color: "var(--muted)" }}>No phone, email or Instagram in their TikTok bio.</span>}
            </div>
            {d?.bio && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="nv-cap">Bio</span><span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--body)" }}>{d.bio}</span></div>}
            <a href={`https://www.tiktok.com/@${cp.user}`} target="_blank" rel="noopener" className="nv-btn nv-press nv-cta" style={{ height: 52 }}>Open TikTok profile</a>
          </>
        )}
      </div>
    </>
  );
}
