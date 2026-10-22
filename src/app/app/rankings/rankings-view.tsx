"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx, type Lang } from "@/lib/i18n/lang.ts";
import type { BoardMonth } from "@/modules/rankings/leaderboard.ts";
import type { ListResult } from "@/modules/rankings/query.ts";
import type { BestVideo, CreatorRow, Detail } from "@/modules/rankings/build.ts";
import { LevelFace } from "../../tts-ring";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { DailyTop100 } from "./daily-top100";
import { Crown } from "./rank-icons";
import { TopCreators } from "./top-creators";
import { TopSellers } from "./top-sellers";
import "../marketplace/marketplace.css";
import "../levels/levels.css";
import "./rankings.css";

const CAT: Record<string, string> = {
  "600001": tx("Home Supplies"), "600024": tx("Kitchenware"), "600154": tx("Textiles & Soft Furnishings"), "600942": tx("Household Appliances"), "601152": tx("Womenswear"), "601303": tx("Muslim Fashion"),
  "601352": tx("Shoes"), "601450": tx("Beauty & Personal Care"), "601739": tx("Phones & Electronics"), "601755": tx("Computers & Office"), "602118": tx("Pet Supplies"), "602284": tx("Baby & Maternity"),
  "603014": tx("Sports & Outdoor"), "604206": tx("Toys & Hobbies"), "604453": tx("Furniture"), "604579": tx("Tools & Hardware"), "604968": tx("Home Improvement"), "605196": tx("Automotive & Motorcycle"),
  "605248": tx("Fashion Accessories"), "700437": tx("Food & Beverages"), "700645": tx("Health"), "802184": tx("Kids' Fashion"), "824328": tx("Menswear"), "824584": tx("Luggage & Bags"),
  "951432": tx("Collectibles"), "953224": tx("Jewellery"), "856720": tx("Pre-Owned"), "801928": tx("Books & Media"),
};
const COL = ["#00874f", "#7c3aed", "#e8005a", "#0e7490", "#f2a93b", "#1d4ed8", "#b45309", "#0f766e", "#9333ea", "#be123c"];
const LV: Record<string, string> = { gold: "b-amber", silver: "b-gray", bronze: "b-green" };
const LVN: Record<string, string> = { gold: tx("Gold"), silver: tx("Silver"), bronze: tx("Bronze") };
const SLOTS = [tx("1 day"), tx("7 days"), tx("30 days")];
/**
 * The TikTok marketplace views (owner, 14 Oct 2026): Daily Top 100 first; Top creators joins TikTok's affiliate top 100 with
 * the Creator Marketplace (it replaces Find creators); shop accounts are on Top sellers. Products, videos and LIVEs use TikTok's
 * lists (list views 1-3).
 */
const VIEWS: [View, string][] = [["daily", tx("Daily Top 100")], ["creators", tx("Top creators")], ["sellers", tx("Top sellers")], ["products", tx("Top products")], ["videos", tx("Top videos")], ["lives", tx("Top LIVEs")]];
type View = "daily" | "creators" | "sellers" | "products" | "videos" | "lives";
const LIST_VIEW: Partial<Record<View, 1 | 2 | 3>> = { products: 1, videos: 2, lives: 3 };
const SORTS: [string, string][][] = [
  [],
  [["gmv-d", tx("GMV: high to low")], ["gmv-a", tx("GMV: low to high")], ["rat-d", tx("Rating: high to low")], ["rat-a", tx("Rating: low to high")]],
  [["gmv-d", tx("GMV: high to low")], ["gmv-a", tx("GMV: low to high")], ["vw-d", tx("Views: high to low")], ["vw-a", tx("Views: low to high")]],
  [["gmv-d", tx("GMV: high to low")], ["gmv-a", tx("GMV: low to high")], ["len-d", tx("Length: longest first")], ["len-a", tx("Length: shortest first")]],
];
/** The heading of each TikTok list (products, videos, LIVEs). */
const LIST_TITLES = ["", tx("Bestselling products"), tx("Bestselling videos"), tx("Bestselling LIVEs")];
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** A day saved by the daily build as "16 Sep" or "16 Sep 2026", in the reader's language ("9月16日", "2026年9月16日"). */
const localDay = (s: string, lang: Lang) => {
  const m = lang === "zh" ? /^(\d{1,2}) ([A-Z][a-z]{2})(?: (\d{4}))?$/.exec(s.trim()) : null;
  const mo = m ? MON3.indexOf(m[2]) + 1 : 0;
  return m && mo ? `${m[3] ? `${m[3]}年` : ""}${mo}月${m[1]}日` : s;
};

const n = (v: number) => Math.round(v).toLocaleString("en-US");
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));
const band = (lo: number, hi: number, conv?: boolean | number) => (lo || hi ? `${conv ? "≈" : ""}RM${big(lo)} – ${big(hi)}` : "–");
const rmx = (v: number) => `RM${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v)}`;
const usd = (v: number) => `US$${v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v)}`;
const hours = (sec: number, lang: Lang) =>
  lang === "zh"
    ? sec >= 3600 ? `${Math.floor(sec / 3600)} 小时 ${Math.round((sec % 3600) / 60)} 分钟` : `${Math.round(sec / 60)} 分钟`
    : sec >= 3600 ? `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m` : `${Math.round(sec / 60)}m`;
const rmWhole = (v: number) => `RM${Math.round(v).toLocaleString("en-US")}`;
/** TikTok Shop's product photo at 300px instead of the full-size original. */
const small = (img: string) => img.replace(/~tplv-([a-z0-9]+)-origin-jpeg\.jpeg/, "~tplv-$1-resize-webp:300:300.webp");
const fmtDay = (iso: string | null, lang: Lang) => { if (!iso) return ""; const [, m, d] = iso.split("-").map(Number); return lang === "zh" ? `${m}月${d}日` : `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`; };

const Chev = () => <svg className="fb-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
const Tick16 = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="m5 12 5 5 9-10" /></svg>;
const Close = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;

type Panel = { user: string; row: CreatorRow | null; det: Detail | null; vid: { id: string; v: BestVideo } | null; nDays: number; first: string | null; last: string | null; rate30: number; lv: number | null };
type Video = { id: string; title: string; seconds: number; stats: number[]; products: string[]; lo: number; hi: number; conv: boolean; posted: string };

/** The Rankings page from the mockup: Rezekii creators' monthly leaderboard, and TikTok Shop Malaysia's best-seller lists. */
/** "2026-10-12" as "12 Oct": a list TikTok published later than the others shows its own day. */
const dayLabel = (d: string, lang: Lang) => new Date(`${d}T00:00:00Z`).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", timeZone: "UTC" });

export function RankingsView({ board, you, asOf }: { board: BoardMonth[]; you: string | null; asOf: string | null }) {
  const t = useT();
  const lang = useLang();
  const { toast } = useToast();
  const [tab, setTab] = useState(0);
  const [month, setMonth] = useState(0);
  const [mview, setMview] = useState<View>("daily");
  const lview = LIST_VIEW[mview] ?? 0;
  const [slot, setSlot] = useState(2);
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("gmv-d");
  const [pg, setPg] = useState(1);
  const [pop, setPop] = useState<"" | "cat" | "more" | "sort">("");
  const [popQ, setPopQ] = useState("");
  const [data, setData] = useState<ListResult | null>(null);
  const [error, setError] = useState("");
  const [cp, setCp] = useState<{ user: string; data: Panel | null } | null>(null);
  const [cpOut, setCpOut] = useState(false);
  const [vp, setVp] = useState<{ id: string; data: Video | null } | null>(null);
  const [vpOut, setVpOut] = useState(false);
  const [vpPlay, setVpPlay] = useState(false);
  const ask = useRef(0);

  // The TikTok lists come from the server one view at a time.
  const listKey = `${lview}|${slot}|${cat}|${sort}|${pg}`;
  useEffect(() => {
    if (tab !== 1 || !lview) return;
    const id = ++ask.current;
    const p = new URLSearchParams({ view: String(lview), slot: String(slot), sort, pg: String(pg) });
    if (cat) p.set("cat", cat);
    fetch(`/api/rankings/list?${p}`)
      .then(async (r) => { const d = await r.json(); if (id !== ask.current) return; if (!r.ok) setError(d.error || tx("The rankings could not load.")); else { setError(""); setData(d); } })
      .catch(() => id === ask.current && setError(tx("The rankings could not load. Refresh the page to try again.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, listKey]);
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

  const pickView = (v: View) => { setMview(v); setPg(1); setSort("gmv-d"); setPop(""); setCat(""); setData(null); setError(""); };
  const reset = (fn: () => void) => { fn(); setPg(1); setPop(""); setPopQ(""); };

  // ---- Rezekii leaderboard ----
  const cur = board[month]?.rows ?? [];
  const prev = board[month + 1]?.rows ?? null;
  const live = month === 0;
  const myRank = you ? cur.findIndex((c) => c.handle === you) : -1;
  const podium = [1, 0, 2].filter((i) => cur[i]);

  // ---- TikTok lists ----
  const sorts = SORTS[lview || 1];
  const head = (k: string, label: string) => {
    const on = sort.startsWith(`${k}-`), desc = sort === `${k}-d`;
    return { cls: on ? "on" : "", arrow: on ? (desc ? "↓" : "↑") : "↕", go: () => { setSort(on && desc ? `${k}-a` : `${k}-d`); setPop(""); },
      aria: on ? (desc ? t("Sort by {label} (now high to low, click for low to high)", { label }) : t("Sort by {label} (now low to high, click for high to low)", { label })) : t("Sort by {label}", { label }) };
  };
  const g = head("gmv", "GMV");
  const xk = sorts[2][0].split("-")[0];
  const x = head(xk, ({ rat: t("Rating"), vw: t("Views"), len: t("Length") } as Record<string, string>)[xk] ?? sorts[2][1].split(":")[0]);
  const gmvHead = t("GMV, {period}", { period: t(SLOTS[slot]) });
  const pq = popQ.trim().toLowerCase();
  const catOpts: [string, number][] = data ? ([["", data.view === 1 ? data.total + (cat ? 0 : 0) : data.ctypes[0]], ...data.cats] as [string, number][]).filter(([c]) => !pq || (c ? t(CAT[c] ?? c) : t("All")).toLowerCase().includes(pq)) : [];
  const allCount = data ? (data.view === 1 ? data.cats.reduce((a, c) => a + c[1], 0) : data.ctypes[0]) : 0;
  const footNote = data
    ?
      `${data.view === 1 ? t("TikTok ranks the top 100 in each of 28 categories; with a category chosen, the order is TikTok's own. For 7 and 30 days, products past each top 100 come from TikTok's daily lists added up (marked Daily figures). ") : ""}` +
      t("Numbers show the position in the list you are viewing. ") +
      `${data.conv ? (data.conv === 1 ? t("{n} amount marked ≈ are converted from US$ at TikTok's rate. ", { n: data.conv }) : t("{n} amounts marked ≈ are converted from US$ at TikTok's rate. ", { n: data.conv })) : ""}` +
      `${data.dropped ? t("Left out: {n} from TikTok's RM list that are missing from its US$ list.", { n: data.dropped }) : t("TikTok's RM and US$ lists match.")}`
    : "";
  const listNote = slot === 2 && (lview === 2 || lview === 3) ? t("TikTok's documentation says its 30-day video and LIVE lists cover the last 14 days.") : "";
  /** The player's title from the server ("Video by …"), in the reader's language. */
  const videoTitle = (s: string) => { const m = /^Video by (.+)$/.exec(s); return m ? t("Video by {nick}", { nick: m[1] }) : s; };
  const hasActive = lview === 1 && !!cat;
  const left = data ? data.total - data.shown : 0;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="nv-seg" role="group" aria-label={t("Which ranking")} style={{ width: 420, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: `translateX(${tab * 100}%)` }} />
          {[tx("Rezekii creators"), tx("TikTok marketplace")].map((label, i) => <button key={label} type="button" className={tab === i ? "on" : ""} aria-pressed={tab === i} onClick={() => setTab(i)}>{t(label)}</button>)}
        </div>

        {tab === 0 && (
          <>
            <section className="nv-card" aria-labelledby="rkm" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", justifyContent: "space-between" }}>
                <h2 id="rkm" className="nv-h2">{t("Leaderboard for {month}", { month: board[month]?.label ?? "" })}</h2>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: live ? "var(--gink)" : "var(--muted)" }}>
                  <span className={live ? "nv-dot" : "nv-doto"} aria-hidden="true" />{live ? t("Live · updates every day · final on {date}", { date: board[0]?.final ?? "" }) : t("Final · locked on {date}", { date: board[month]?.final ?? "" })}
                </span>
              </div>
              <div className="rk-months nv-noscroll" role="group" aria-label={t("Month")}>
                {board.map((m, i) => (
                  <button key={m.key} type="button" className={`nv-chip nv-press ${month === i ? "on" : ""}`} aria-pressed={month === i} onClick={() => setMonth(i)}>
                    {i === 0 && <span className="nv-dot" aria-hidden="true" />}{i === 0 ? t("{month} · Live", { month: m.label }) : m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {[
                  { label: t("GMV by Rezekii creators"), value: rmWhole(cur.reduce((a, c) => a + c.gmv, 0)), note: live ? t("So far this month") : t("Whole month") },
                  { label: t("Videos posted"), value: n(cur.reduce((a, c) => a + c.videos, 0)), note: t("For Techwide campaign products") },
                  { label: t("Your rank"), value: myRank >= 0 ? `#${myRank + 1}` : "—", note: myRank >= 0 ? t("Out of {n} creators", { n: cur.length }) : t("Sign in with TikTok to be ranked") },
                ].map((st) => (
                  <div key={st.label} className="rk-stat"><span className="nv-cap">{st.label}</span><span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{st.value}</span><span style={{ fontSize: 13, color: "var(--muted)" }}>{st.note}</span></div>
                ))}
              </div>
            </section>

            {podium.length > 0 && (
              <section className="nv-card" aria-label={t("Top three")} style={{ padding: "26px 22px 0", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-end", maxWidth: 720, margin: "0 auto" }}>
                  {podium.map((idx, pos) => {
                    const c = cur[idx];
                    const p = [1, 0, 2].indexOf(idx);
                    return (
                      <div key={c.handle} className="rk-col">
                        <a className="rk-who rk-link" href={`https://www.tiktok.com/${c.handle}`} target="_blank" rel="noopener" aria-label={t("Open {handle} on TikTok", { handle: c.handle })} style={{ animationDelay: `${350 + pos * 120}ms` }}>
                          {idx === 0 && <span className="rk-crown"><Crown size={34} /></span>}
                          <LevelFace lv={c.lv} size={idx === 0 ? 76 : 64} img={c.avatar} name={c.handle.slice(1)} />
                          <strong style={{ fontSize: 15, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.handle}</strong>
                          <span className={`nv-badge ${LV[c.level]}`}>{t(LVN[c.level])}</span>
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

            <section className="nv-card" aria-label={t("Full ranking")} style={{ padding: "18px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="rk-row rk-head" style={{ animation: "none" }}><span>#</span><span>{t("Creator")}</span><span>GMV</span><span className="rk-hide">{t("Videos")}</span><span className="rk-hide">{t("vs last month")}</span></div>
              {cur.length === 0 && <span style={{ padding: "18px 14px", color: "var(--muted)" }}>{t("No Rezekii creators have TikTok data yet. Creators appear here after they sign in with TikTok.")}</span>}
              {cur.map((c, i) => {
                const was = prev ? prev.findIndex((p) => p.handle === c.handle) : -1;
                const move = was < 0 ? 0 : was - i;
                return (
                  <div key={c.handle} className={`rk-row ${c.handle === you ? "rk-you" : ""}`} style={{ animationDelay: `${200 + i * 50}ms` }}>
                    <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <a className="rk-link" href={`https://www.tiktok.com/${c.handle}`} target="_blank" rel="noopener" aria-label={t("Open {handle} on TikTok", { handle: c.handle })} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <LevelFace lv={c.lv} size={36} img={c.avatar} name={c.handle.slice(1)} badge={false} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.handle}{c.handle === you ? t(" (signed in)") : ""}</strong>
                        <span className={`nv-badge ${LV[c.level]}`} style={{ alignSelf: "flex-start", marginTop: 2 }}>{t(LVN[c.level])}</span>
                      </span>
                    </a>
                    <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rmWhole(c.gmv)}</span>
                    <span className="rk-hide" style={{ fontSize: 14, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{c.videos === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: c.videos })}</span>
                    <span className="rk-hide" style={{ fontWeight: 800, color: move > 0 ? "var(--gink)" : move < 0 ? "var(--red)" : "var(--muted)" }}>{!prev ? "—" : move > 0 ? `▲ ${move}` : move < 0 ? `▼ ${Math.abs(move)}` : "—"}</span>
                  </div>
                );
              })}
              <p style={{ margin: "8px 14px 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                {t("Sales through Techwide's TAP campaign links, from TikTok's campaign data, for creators signed in to Rezekii with TikTok. A new leaderboard starts on the 1st of each month.")}
              </p>
            </section>
          </>
        )}

        {tab === 1 && (
          <>
            <div className="nv-noscroll" role="group" aria-label={t("Marketplace view")} style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {VIEWS.map(([v, label]) => <button key={v} type="button" className={`nv-chip nv-press ${mview === v ? "on" : ""}`} aria-pressed={mview === v} onClick={() => pickView(v)}>{t(label)}</button>)}
            </div>
            {error && <p className="np-error" role="alert">{t(error)}</p>}
            {mview === "daily" && <DailyTop100 onOpen={openCp} />}
            {mview === "creators" && <TopCreators onOpen={openCp} />}
            {mview === "sellers" && <TopSellers />}

            {lview > 0 && (
              <section className="nv-card" aria-label={`${t(LIST_TITLES[lview])} · ${t("TikTok Shop Malaysia")}`} style={{ padding: "18px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "0 14px 10px" }}>
                  <strong style={{ fontSize: 17 }}>{t(LIST_TITLES[lview])} · {t("TikTok Shop Malaysia")}{data && asOf && data.asOf < asOf ? ` · ${dayLabel(data.asOf, lang)}` : ""}</strong>
                  <div className="nv-seg" role="group" aria-label={t("Period")} style={{ width: 300, maxWidth: "100%" }}>
                    <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${slot * 100}%)` }} />
                    {SLOTS.map((label, i) => <button key={label} type="button" className={slot === i ? "on" : ""} aria-pressed={slot === i} onClick={() => reset(() => setSlot(i))}>{t(label)}</button>)}
                  </div>
                </div>
                <div className="fb" style={{ padding: "0 14px 12px" }}>
                  <div className="fb-row">
                    {lview === 1 && (
                      <div className="fb-dd">
                        <button type="button" className={`fb-btn ${cat ? "on" : ""}`} aria-haspopup="listbox" aria-expanded={pop === "cat"} onClick={() => { setPop(pop === "cat" ? "" : "cat"); setPopQ(""); }}><span className="fb-lab">{t("Category")}</span><span className="fb-val">{cat ? t(CAT[cat] ?? cat) : t("All")}</span><Chev /></button>
                        {pop === "cat" && (
                          <>
                            <button type="button" className="fb-shield" aria-label={t("Close menu")} onClick={() => setPop("")} />
                            <div className="fb-pop" role="dialog" aria-label={t("Category")}>
                              <input type="search" className="fb-psearch" aria-label={t("Search categories")} placeholder={t("Search categories")} value={popQ} onChange={(e) => setPopQ(e.target.value)} autoFocus />
                              <div className="fb-list" role="listbox" aria-label={t("Category")}>
                                {catOpts.map(([c, count]) => (
                                  <button key={c || "all"} type="button" role="option" aria-selected={cat === c} className={`fb-opt ${cat === c ? "on" : ""}`} onClick={() => reset(() => setCat(c))}>
                                    <span className="fb-name">{c ? t(CAT[c] ?? c) : t("All")}</span><span className="fb-n">{n(c ? count : allCount)}</span>{cat === c && <Tick16 />}
                                  </button>
                                ))}
                                {!!pq && catOpts.length === 0 && <span className="fb-empty">{t("No category matches.")}</span>}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <span style={{ flex: "1 1 0" }} />
                    <div className="fb-dd">
                      <button type="button" className="fb-btn" aria-haspopup="listbox" aria-expanded={pop === "sort"} onClick={() => setPop(pop === "sort" ? "" : "sort")}><span className="fb-lab">{t("Sort")}</span><span className="fb-val">{t((sorts.find(([v]) => v === sort) ?? sorts[0])[1])}</span><Chev /></button>
                      {pop === "sort" && (
                        <>
                          <button type="button" className="fb-shield" aria-label={t("Close menu")} onClick={() => setPop("")} />
                          <div className="fb-pop right fit" role="dialog" aria-label={t("Sort")}>
                            <div className="fb-list" role="listbox" aria-label={t("Sort")}>
                              {sorts.map(([v, label]) => <button key={v} type="button" role="option" aria-selected={sort === v} className={`fb-opt ${sort === v ? "on" : ""}`} onClick={() => { setSort(v); setPop(""); }}><span className="fb-name">{t(label)}</span>{sort === v && <Tick16 />}</button>)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {hasActive && (
                    <div className="fb-chips">
                      {cat && <Chip label={t("Category: {c}", { c: t(CAT[cat] ?? cat) })} aria={t("Remove category filter")} onRemove={() => reset(() => setCat(""))} />}
                      <button type="button" className="nv-link" onClick={() => reset(() => setCat(""))} style={{ fontSize: 13 }}>{t("Clear all")}</button>
                    </div>
                  )}
                </div>
                {listNote && <p style={{ margin: 0, padding: "0 14px 12px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{listNote}</p>}
                {!data && !error && <span style={{ padding: "18px 14px", color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><span className="nv-spin" aria-hidden="true" />{t("Loading TikTok's lists…")}</span>}

                {data?.products && (
                  <>
                    <div className="rk-row rk-vrow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>{t("Product")}</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide">{t("Shop")}</span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>{t("Rating")}<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                    </div>
                    {data.products.map(({ row, meta }, i) => {
                      const [, lo, hi, conv, , tier, nd] = row;
                      const [id, name, shop, rating, pcat, img] = meta;
                      return (
                        <div key={id} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                          <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                          <a href={`https://shop.tiktok.com/view/product/${id}?region=MY`} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                            <span className="rk-thumb rk-photo" aria-hidden="true" style={img ? { backgroundImage: `url("${small(img)}")` } : undefined} />
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">{name}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{t(CAT[pcat] ?? "")}</span></span>
                          </a>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{tier === 2 ? (nd === 1 ? t("Daily figures, {n} day", { n: 1 }) : t("Daily figures, {n} days", { n: nd })) : t("TikTok's range")}</span></span>
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
                      <span>#</span><span>{t("Video")}</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>{t("Views · likes")}<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                      <span className="rk-hide">{t("Posted")}</span>
                    </div>
                    {data.videos.map(([, id, nick, dur, views, likes, , , lo, hi, date, prods, conv, thumb], i) => (
                      <div key={id} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                        <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                        <button type="button" className="rk-who2" onClick={() => openVp(id)} aria-label={t("Play video by {nick}", { nick })}>
                          {/* TikTok's video lists have no cover: the photo of the product the video sells, with a play mark. */}
                          {thumb ? (
                            <span className="rk-thumb rk-vthumb rk-photo" aria-hidden="true" style={{ backgroundImage: `url("${small(thumb)}")` }}><span className="rk-play"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span></span>
                          ) : (
                            <span className="rk-thumb rk-vthumb" aria-hidden="true" style={{ background: "#0d1117", color: "#ffffff" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                          )}
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">{t("Video by {nick} · {s}s", { nick, s: dur })}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{prods.length ? t("Sells: {p}", { p: prods.join(" · ") }) : t("No product tagged")}</span></span>
                        </button>
                        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{t("{v} views · {l} likes", { v: short(views), l: short(likes) })}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)" }}>{localDay(date, lang)}</span>
                      </div>
                    ))}
                  </>
                )}

                {data?.lives && (
                  <>
                    <div className="rk-row rk-vrow rk-head" style={{ animation: "none" }}>
                      <span>#</span><span>{t("LIVE")}</span>
                      <span><button type="button" className={`rk-hs ${g.cls}`} onClick={g.go} aria-label={g.aria}>{gmvHead}<span className="rk-hsa" aria-hidden="true">{g.arrow}</span></button></span>
                      <span className="rk-hide"><button type="button" className={`rk-hs ${x.cls}`} onClick={x.go} aria-label={x.aria}>{t("Length")}<span className="rk-hsa" aria-hidden="true">{x.arrow}</span></button></span>
                      <span className="rk-hide">{t("Started")}</span>
                    </div>
                    {data.lives.map(([, user, nick, title, dur, date, lo, hi, avatar, conv], i) => (
                      <div key={`${user}-${i}`} className="rk-row rk-vrow" style={{ animationDelay: `${60 + Math.min(i, 12) * 40}ms` }}>
                        <span style={{ fontWeight: 800, fontSize: 17, color: "var(--muted)" }}>{i + 1}</span>
                        <a href={`https://www.tiktok.com/@${user}`} target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                          <span className={`rk-thumb rk-vthumb${avatar ? " rk-photo" : ""}`} aria-hidden="true" style={avatar ? { backgroundImage: `url("${avatar}")` } : { background: COL[(i + 3) % COL.length], color: "#ffffff", fontWeight: 800, fontSize: 18 }}>
                            {!avatar && (user[0] || "?").toUpperCase()}
                            <span className="rk-live-tag">{t("LIVE")}</span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><strong className="rk-ellip">@{user}</strong><span className="rk-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{title || nick}</span></span>
                        </a>
                        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{band(lo, hi, conv)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{hours(dur, lang)}</span>
                        <span className="rk-hide" style={{ color: "var(--muted)" }}>{localDay(date, lang)}</span>
                      </div>
                    ))}
                  </>
                )}

                {data && <p style={{ margin: 0, padding: "10px 14px 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{footNote}</p>}
                {data && left > 0 && (
                  <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => setPg(pg + 1)}>{t("Show {n} more", { n: Math.min(50, left) })}</button>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{t("Showing {a} of {b}", { a: n(data.shown), b: n(data.total) })}</span>
                  </div>
                )}
              </section>
            )}

          </>
        )}
      </div>

      {cp && <CreatorPanel cp={cp} out={cpOut} onClose={closeCp} onPlay={openVp} />}
      {vp && (
        <>
          <button type="button" aria-label={t("Close video")} className={`nv-dim ${vpOut ? "out" : ""}`} onClick={closeVp} style={{ zIndex: 60 }} />
          <div role="dialog" aria-modal="true" aria-labelledby="rkvpt" className={`rk-vp ${vpOut ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <strong id="rkvpt" className="rk-ellip" style={{ fontSize: 15 }}>{vp.data ? videoTitle(vp.data.title) : t("Video")}</strong>
              <button type="button" className="nv-press" aria-label={t("Close video")} onClick={closeVp} style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Close /></button>
            </div>
            <div className="rk-vp-frame" style={vpPlay ? { padding: 0 } : undefined}>
              {vpPlay ? (
                <iframe title={vp.data ? videoTitle(vp.data.title) : t("TikTok video")} src={`https://www.tiktok.com/player/v1/${vp.id}?autoplay=1&rel=0`} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" style={{ width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />
              ) : (
                <>
                  <button type="button" className="rk-vp-play" onClick={() => setVpPlay(true)} aria-label={t("Play video")}><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></button>
                  <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>{vp.data ? t("{n} seconds", { n: vp.data.seconds }) : ""}</span>
                </>
              )}
            </div>
            <div className="rk-vp-stats">
              {([tx("Views"), tx("Likes"), tx("Comments"), tx("Shares")] as const).map((k, i) => <div key={k}><span>{vp.data ? short(vp.data.stats[i] ?? 0) : "–"}</span><span>{t(k)}</span></div>)}
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--body)" }}>{vp.data ? (vp.data.products.length ? t("Sells: {p}", { p: vp.data.products.join(" · ") }) : t("No product tagged")) : ""}</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
              <span>{vp.data ? [vp.data.posted ? t("Posted {date}", { date: localDay(vp.data.posted, lang) }) : "", vp.data.hi ? `GMV ${band(vp.data.lo, vp.data.hi, vp.data.conv)}` : ""].filter(Boolean).join(" · ") : ""}</span>
              <a className="nv-link" href={`https://www.tiktok.com/@/video/${vp.id}`} target="_blank" rel="noopener" style={{ fontSize: 13 }}>{t("Open on TikTok")}</a>
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
  const t = useT();
  const lang = useLang();
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
  const audience = d ? [d.f || d.m ? `${t("Female {f}% · Male {m}%", { f: d.f, m: d.m })}${d.f + d.m < 98 ? t(" · not stated {n}%", { n: 100 - d.f - d.m }) : ""}` : "", d.age ? t("Most common age {age}", { age: d.age }) : "", d.loc ? t("Top places: {loc}", { loc: d.loc }) : ""].filter(Boolean).join(t(". ")) : "";
  const days = (k: number) => (k === 1 ? t("{n} day", { n: 1 }) : t("{n} days", { n: k }));
  return (
    <>
      <button type="button" aria-label={t("Close")} className={`nv-dim ${out ? "out" : ""}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="rkcpt" className={`nv-panel ${out ? "out" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}><span className="nv-dot" aria-hidden="true" />{t("TikTok Creator Marketplace · last 30 days")}</span>
          <button type="button" className="nv-press" aria-label={t("Close")} onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Close /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <LevelFace lv={p?.lv} size={72} img={d?.a} name={cp.user} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h3 id="rkcpt" className="rk-ellip" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>@{cp.user}</h3>
            <span className="rk-ellip" style={{ fontSize: 14, color: "var(--muted)" }}>{row ? t("{nick} · {n} followers", { nick: row[2], n: short(row[3]) }) : d?.nick ?? ""}</span>
          </span>
        </div>
        {!p && <span style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><span className="nv-spin" aria-hidden="true" />{t("Loading…")}</span>}
        {p && (
          <>
            {d && d.c.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{d.c.map((c) => <span key={c} className="nv-badge b-gray">{t(CAT[c] ?? c)}</span>)}</div>}
            <div style={{ background: "var(--gsoft)", borderRadius: 18, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gink)" }}>{d?.x ? t("GMV, last 30 days · exact, shared by the creator") : t("GMV, last 30 days · TikTok band")}</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: "var(--gink)", fontVariantNumeric: "tabular-nums" }}>{d?.x ? rmx(d.x) : d?.band || "–"}</span>
              <span style={{ fontSize: 13, color: "var(--gink)" }}>{d?.x ? t("TikTok gives exact figures in US$ only: {usd}, converted at TikTok's rate of RM{rate} per US$.", { usd: usd(d.xu), rate: p.rate30.toFixed(2) }) : t("This creator keeps the exact figure private, so TikTok shows a band.")}</span>
            </div>
            {split > 0 && d && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="rk-split" aria-hidden="true"><span style={{ width: `${vpc}%`, background: "#00c073" }} /><span style={{ width: `${100 - vpc}%`, background: "#7c3aed" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--muted)" }}><span>{t("Video {p}% · {x}", { p: vpc, x: rmx(d.vg) })}</span><span>{t("LIVE {p}% · {x}", { p: 100 - vpc, x: rmx(d.lg) })}</span></div>
              </div>
            )}
            {v && p.vid ? (
              <div style={{ border: "1.5px solid var(--border)", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span className="nv-cap">{t("Best-selling video")}</span><button type="button" className="nv-link" onClick={() => onPlay(p.vid!.id)} style={{ fontSize: 13 }}>{t("▶ Play")}</button></div>
                <span style={{ fontSize: 14, lineHeight: 1.45 }}>{v[7].length ? t("Sells: {p}", { p: v[7].join(" · ") }) : t("No product tagged")}</span>
                <div className="rk-kv">
                  {([[t("Posted"), localDay(v[4], lang)], [t("Age"), days(v[5])], [t("GMV, 30-day list"), v[9] ? band(v[8], v[9]) : t("Not in top 100")], [t("Days in daily top 100"), t("{a} of {b}", { a: v[10], b: nDays })], [t("Views"), short(v[0])], [t("Likes"), short(v[1])]] as [string, string][]).map(([k, val]) => <div key={k}><span>{k}</span><span>{val}</span></div>)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{nDays === 1 ? t("Daily GMV (TikTok's range), last {n} day", { n: 1 }) : t("Daily GMV (TikTok's range), last {n} days", { n: nDays })}</span>
                  <svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none" role="img" aria-label={t("Daily GMV for this video on {a} of the last {b} days, best day {x}", { a: v[10], b: nDays, x: rmx(peak) })} style={{ display: "block", background: "var(--surface2)", borderRadius: 12 }}>
                    <path d="M4 84 H296" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <path d={bars} fill="none" stroke="#00c073" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}><span>{fmtDay(p.first, lang)}</span><span>{t("Best day {x}", { x: rmx(peak) })}</span><span>{fmtDay(p.last, lang)}</span></div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{nDays === 1 ? t("No video from this creator reached TikTok's daily top 100 in the last {n} day.", { n: 1 }) : t("No video from this creator reached TikTok's daily top 100 in the last {n} days.", { n: nDays })}</span>
            )}
            <div className="rk-kv">
              {([[t("Units sold"), d?.u ? short(d.u) : "–"], [t("Avg commission"), d?.com ? `${d.com / 100}%` : "–"], [t("Brands worked with"), d?.br ? short(d.br) : "–"], [t("Products promoted"), d?.pr ? short(d.pr) : "–"], [t("Sales videos"), short(d?.ev ?? 0)], [t("Sales LIVEs"), short(d?.el ?? 0)]] as [string, string][]).map(([k, val]) => <div key={k}><span>{k}</span><span>{val}</span></div>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="nv-cap">{t("Audience")}</span><span style={{ fontSize: 14, lineHeight: 1.5 }}>{audience || t("TikTok has no audience data for this creator.")}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="nv-cap">{t("Contact")}</span>
              {d?.wa && <a className="rk-wa nv-press" href={`https://wa.me/${d.wa}`} target="_blank" rel="noopener" style={{ alignSelf: "flex-start", height: 40, padding: "0 16px" }}>WhatsApp +{d.wa}</a>}
              {d?.em && <span style={{ fontSize: 14 }}>{t("Email:")} <strong style={{ userSelect: "all" }}>{d.em}</strong></span>}
              {d?.ig && <a className="nv-link" href={`https://www.instagram.com/${d.ig}`} target="_blank" rel="noopener">Instagram @{d.ig}</a>}
              {!d?.wa && !d?.em && !d?.ig && <span style={{ fontSize: 14, color: "var(--muted)" }}>{t("No phone, email or Instagram in their TikTok bio.")}</span>}
            </div>
            {d?.bio && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="nv-cap">{t("Bio")}</span><span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--body)" }}>{d.bio}</span></div>}
            <a href={`https://www.tiktok.com/@${cp.user}`} target="_blank" rel="noopener" className="nv-btn nv-press nv-cta" style={{ height: 52 }}>{t("Open TikTok profile")}</a>
          </>
        )}
      </div>
    </>
  );
}
