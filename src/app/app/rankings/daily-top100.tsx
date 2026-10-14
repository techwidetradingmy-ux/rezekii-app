"use client";

import { useEffect, useState } from "react";
import type { DailyBoard, DailyRow } from "@/modules/rankings/daily.ts";
import "./daily.css";

const COL = ["#00874f", "#7c3aed", "#e8005a", "#0e7490", "#f2a93b", "#1d4ed8", "#b45309", "#0f766e", "#9333ea", "#be123c"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayName = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const change = (r: { rank: number; prev: number | null }): [string, string] =>
  r.prev === null ? ["NEW today", "#7c3aed"] : r.prev === r.rank ? ["— same", "var(--muted)"] : r.prev > r.rank ? [`▲ ${r.prev - r.rank}`, "#00874f"] : [`▼ ${r.rank - r.prev}`, "var(--red)"];
/** Colour for a rank in the history strip: top 3 gold, 4–10 green, 11–50 light green, 51–100 pale, not in the list grey. */
const cell = (r: number | null) => (!r ? "dt-c0" : r <= 3 ? "dt-c1" : r <= 10 ? "dt-c2" : r <= 50 ? "dt-c3" : "dt-c4");

type Board = DailyBoard & { me: string | null };

function Face({ src, name, i, size }: { src: string | null; name: string; i: number; size: number }) {
  return src ? (
    <span className="dt-face dt-photo" aria-hidden="true" style={{ width: size, height: size, backgroundImage: `url("${src}")` }} />
  ) : (
    <span className="dt-face" aria-hidden="true" style={{ width: size, height: size, background: COL[i % COL.length], fontSize: size * 0.4 }}>{(name[0] || "?").toUpperCase()}</span>
  );
}

function Strip({ history, days }: { history: (number | null)[]; days: string[] }) {
  return (
    <span className="dt-strip" role="img" aria-label={`Rank on the last ${days.length} days: ${history.map((r, i) => `${dayName(days[i])} ${r ? `#${r}` : "not in the top 100"}`).join(", ")}`}>
      {history.map((r, i) => <i key={days[i]} className={cell(r)} title={`${dayName(days[i])} · ${r ? `#${r}` : "not in the top 100"}`} />)}
    </span>
  );
}

/** Daily Top 100 Creators: TikTok Shop Malaysia's top 100 creators for each day, a proud leaderboard (mockup A with B and C). */
export function DailyTop100() {
  const [date, setDate] = useState<string | null>(null);
  const [b, setB] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/rankings/daily${date ? `?date=${date}` : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as Board & { error?: string };
        if (!live) return;
        if (!r.ok) return setError(d.error || "Couldn't load TikTok's list.");
        setError("");
        setB(d);
      })
      .catch(() => live && setError("Couldn't load TikTok's list."));
    return () => {
      live = false;
    };
  }, [date]);

  if (error) return <p className="dt-note" role="alert">{error}</p>;
  if (!b) return <p className="dt-note"><span className="nv-spin" aria-hidden="true" /> Loading TikTok&apos;s top 100…</p>;

  const me = b.me ? b.rows.find((r) => r.user.toLowerCase() === b.me) : undefined;
  const ours = b.rows.filter((r) => r.rezekii);
  const podium = [b.rows[1], b.rows[0], b.rows[2]].filter(Boolean) as DailyRow[];
  const rest = b.rows.slice(3, all ? 100 : 20);
  const chips = b.dates.slice(0, 7).reverse();

  return (
    <div className="dt-wrap">
      <div className="dt-bar">
        <div className="dt-days" role="group" aria-label="Day">
          {chips.map((d) => <button key={d} type="button" className={`dt-day nv-press ${d === b.date ? "on" : ""}`} aria-pressed={d === b.date} onClick={() => { setDate(d); setAll(false); }}>{dayName(d)}</button>)}
        </div>
        <label className="dt-more">
          <span className="dt-sr">All saved days</span>
          <select value={b.date} onChange={(e) => { setDate(e.target.value); setAll(false); }}>
            {b.dates.map((d) => <option key={d} value={d}>{dayName(d)}{d === b.dates[0] ? " (newest)" : ""}</option>)}
          </select>
        </label>
      </div>

      {me && (
        <section className="nv-up dt-congrats" aria-label="You're in the top 100">
          <span className="dt-cup" aria-hidden="true">🎉</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <strong style={{ fontSize: 19 }}>Congratulations @{me.user}! You&apos;re #{me.rank} in TikTok Shop Malaysia&apos;s top 100 on {dayName(b.date)}.</strong>
            <span style={{ fontSize: 14 }}>🔥 {me.days} {me.days === 1 ? "day" : "days"} in the top 100 · {change(me)[0] === "NEW today" ? "new on the list today" : `${change(me)[0]} from the day before`}. Keep it up!</span>
          </span>
        </section>
      )}
      {ours.length > 0 && (
        <p className="dt-ours">🏅 {ours.length} Rezekii {ours.length === 1 ? "creator" : "creators"} in this day&apos;s top 100: {ours.map((r) => `@${r.user} (#${r.rank})`).join(", ")}</p>
      )}

      <section className="nv-up nv-card dt-podium-card" aria-label={`Top 3 on ${dayName(b.date)}`}>
        <div className="dt-head"><strong style={{ fontSize: 18 }}>{dayName(b.date)} · Top 3</strong><span>TikTok&apos;s best-seller list · ranked by sales</span></div>
        <div className="dt-podium">
          {podium.map((r) => {
            const first = r.rank === 1;
            const [chg, color] = change(r);
            return (
              <div key={r.user} className="dt-p">
                <span style={{ fontSize: first ? 32 : 26, lineHeight: 1 }} aria-hidden="true">{first ? "👑" : r.rank === 2 ? "🥈" : "🥉"}</span>
                <Face src={r.avatar} name={r.user} i={r.rank} size={first ? 92 : 74} />
                <strong className="dt-ellip" style={{ fontSize: 15, maxWidth: "100%" }}>@{r.user}</strong>
                {r.rezekii && <span className="dt-rz">Rezekii creator</span>}
                <span className="dt-streak">🔥 {r.days} {r.days === 1 ? "day" : "days"} in the top 100</span>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{chg}</span>
                <span className={`dt-step dt-step${r.rank}`}>{r.rank}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="dt-cols">
        <section className="nv-up nv-card dt-list" aria-label={`Top 100 on ${dayName(b.date)}`}>
          <div className="dt-row dt-rowhead" aria-hidden="true"><span>Rank</span><span /><span>Creator</span><span>vs day before</span><span>In the top 100</span><span>Last {b.historyDays.length} days</span><span>TikTok&apos;s GMV range</span></div>
          {rest.map((r) => {
            const [chg, color] = change(r);
            return (
              <div key={r.user} className={`dt-row ${r.rezekii ? "dt-ourrow" : ""} ${b.me && r.user.toLowerCase() === b.me ? "dt-merow" : ""}`}>
                <span className="dt-rank">{r.rank}</span>
                <Face src={r.avatar} name={r.user} i={r.rank} size={40} />
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><strong className="dt-ellip">@{r.user}</strong>{r.rezekii && <span className="dt-rz">Rezekii</span>}</span>
                  <span className="dt-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{r.nick} · {short(r.followers)} followers</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{chg}</span>
                <span><span className={`dt-streak ${r.days >= 20 ? "" : "dt-streak-low"}`}>🔥 {r.days} {r.days === 1 ? "day" : "days"}</span></span>
                <Strip history={r.history} days={b.historyDays} />
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{r.lo || r.hi ? `RM${big(r.lo)} – ${big(r.hi)}` : "–"}</span>
              </div>
            );
          })}
          {b.rows.length > 20 && (
            <button type="button" className="nv-btn2 nv-press" onClick={() => setAll(!all)} style={{ alignSelf: "center", marginTop: 12 }}>{all ? "Show the top 20" : `Show all ${b.rows.length}`}</button>
          )}
        </section>

        <section className="nv-up nv-card dt-hall" aria-labelledby="dthall">
          <h3 id="dthall" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🏆 Hall of Fame</h3>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Most days in the top 100 since {b.first ? dayName(b.first) : "Rezekii started saving"} ({b.saved} days)</span>
          {b.hall.map((h, i) => (
            <div key={h.user} className="dt-hrow">
              <span className={`dt-medal dt-m${Math.min(i + 1, 4)}`}>{i + 1}</span>
              <Face src={h.avatar} name={h.user} i={i + 2} size={34} />
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><strong className="dt-ellip">@{h.user}</strong>{h.rezekii && <span className="dt-rz">Rezekii</span>}</span>
                <Strip history={h.history} days={b.historyDays} />
              </span>
              <span style={{ textAlign: "right" }}><strong style={{ fontSize: 18 }}>{h.days}</strong><span style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>of {b.saved} · best #{h.best}</span></span>
            </div>
          ))}
          <span className="dt-key"><i className="dt-c1" />Top 3 <i className="dt-c2" />4–10 <i className="dt-c3" />11–50 <i className="dt-c4" />51–100 <i className="dt-c0" />Not in the list</span>
        </section>
      </div>
      <p className="dt-note">TikTok&apos;s daily best-seller list of the top 100 creators by sales in Malaysia. Rezekii saves it every day as soon as TikTok publishes it (since {b.first ? dayName(b.first) : "12 Sep"}).</p>
    </div>
  );
}
