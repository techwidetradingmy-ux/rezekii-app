"use client";

import { useEffect, useState } from "react";
import type { DailyBoard, DailyRow } from "@/modules/rankings/daily.ts";
import { LevelFace } from "../../tts-ring";
import { CalendarPicker } from "../calendar-picker";
import { Burst, Crown, Flame, Medal, Rosette, Trophy } from "./rank-icons";
import "./daily.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayName = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };
const weekOf = (iso: string) => dayName(new Date(Date.parse(`${iso}T00:00:00Z`) - 6 * 86400_000).toISOString().slice(0, 10));
const big = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const change = (r: { rank: number; prev: number | null }, weekly: boolean): [string, string] =>
  r.prev === null ? [weekly ? "NEW" : "NEW today", "#7c3aed"] : r.prev === r.rank ? ["— same", "var(--muted)"] : r.prev > r.rank ? [`▲ ${r.prev - r.rank}`, "#00874f"] : [`▼ ${r.rank - r.prev}`, "var(--red)"];
/** Colour for a rank in the history strip: top 3 gold, 4–10 green, 11–50 light green, 51–100 pale, not in the list grey. */
const cell = (r: number | null) => (!r ? "dt-c0" : r <= 3 ? "dt-c1" : r <= 10 ? "dt-c2" : r <= 50 ? "dt-c3" : "dt-c4");

type Board = DailyBoard & { me: string | null };

function Strip({ history, days }: { history: (number | null)[]; days: string[] }) {
  return (
    <span className="dt-strip" role="img" aria-label={`Rank on the last ${days.length} days: ${history.map((r, i) => `${dayName(days[i])} ${r ? `#${r}` : "not in the top 100"}`).join(", ")}`}>
      {history.map((r, i) => <i key={days[i]} className={cell(r)} title={`${dayName(days[i])} · ${r ? `#${r}` : "not in the top 100"}`} />)}
    </span>
  );
}

/**
 * Daily Top 100 Creators: TikTok Shop Malaysia's top 100 affiliate creators for each day, or (Weekly) for the 7 days to each day.
 * A proud leaderboard (mockup A with B's Hall of Fame and C's rank history).
 */
export function DailyTop100({ onOpen }: { onOpen: (user: string) => void }) {
  const [period, setPeriod] = useState<"1D" | "7D">("1D");
  const [date, setDate] = useState<string | null>(null);
  const [b, setB] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  /** The period and day of the board on screen; anything else is still loading. */
  const [shown, setShown] = useState("");
  const want = `${period}|${date ?? ""}`;
  const loading = shown !== want;

  useEffect(() => {
    let live = true;
    const p = new URLSearchParams({ period });
    if (date) p.set("date", date);
    fetch(`/api/rankings/daily?${p}`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as Board & { error?: string };
        if (!live) return;
        if (!r.ok) return setError(d.error || "Couldn't load TikTok's list.");
        setError("");
        setB(d);
      })
      .catch(() => live && setError("Couldn't load TikTok's list."))
      .finally(() => live && setShown(`${period}|${date ?? ""}`));
    return () => { live = false; };
  }, [date, period]);

  if (error) return <p className="dt-note" role="alert">{error}</p>;
  if (!b) return <p className="dt-note"><span className="nv-spin" aria-hidden="true" /> Loading TikTok&apos;s top 100…</p>;

  const weekly = b.period === "7D";
  const when = weekly ? `${weekOf(b.date)} – ${dayName(b.date)}` : dayName(b.date);
  const me = b.me ? b.rows.find((r) => r.user.toLowerCase() === b.me) : undefined;
  const ours = b.rows.filter((r) => r.rezekii);
  const podium = [b.rows[1], b.rows[0], b.rows[2]].filter(Boolean) as DailyRow[];
  const rest = b.rows.slice(3, all ? 100 : 20);
  const chips = b.dates.slice(0, 7).reverse();
  const inList = weekly ? "in the weekly top 100" : "in the top 100";

  return (
    <div className="dt-wrap">
      <div className="dt-bar">
        <div className="nv-seg" role="group" aria-label="Daily or weekly" style={{ width: 220, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: `translateX(${weekly ? 100 : 0}%)` }} />
          {(["1D", "7D"] as const).map((v) => <button key={v} type="button" className={period === v ? "on" : ""} aria-pressed={period === v} onClick={() => { setPeriod(v); setAll(false); }}>{v === "1D" ? "Daily" : "Weekly"}</button>)}
        </div>
        <div className="dt-days nv-noscroll" role="group" aria-label="Day">
          {chips.map((d) => <button key={d} type="button" className={`dt-day nv-press ${d === b.date ? "on" : ""}`} aria-pressed={d === b.date} onClick={() => { setDate(d); setAll(false); }}>{dayName(d)}</button>)}
        </div>
        <CalendarPicker mode="day" label={when} sub={weekly ? "7 days · TikTok's weekly list" : b.date === b.dates[0] ? "Newest list" : "TikTok's daily list"} loading={loading} days={b.dates} value={b.date} onDay={(d) => { setDate(d); setAll(false); }} ariaLabel="Choose a day" />
      </div>

      {me && (
        <section className="nv-up dt-congrats" aria-label="You're in the top 100">
          <span className="dt-cup"><Burst size={44} /></span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <strong style={{ fontSize: 19 }}>Congratulations @{me.user}! You&apos;re #{me.rank} in TikTok Shop Malaysia&apos;s {weekly ? "weekly " : ""}top 100 for {when}.</strong>
            <span style={{ fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Flame size={13} /> {me.days} {me.days === 1 ? "day" : "days"} {inList} · {me.prev === null ? "new on the list" : `${change(me, weekly)[0]} from the day before`}. Keep it up!</span>
          </span>
        </section>
      )}
      {ours.length > 0 && (
        <p className="dt-ours"><Rosette size={18} /> {ours.length} Rezekii {ours.length === 1 ? "creator" : "creators"} in this top 100: {ours.map((r) => `@${r.user} (#${r.rank})`).join(", ")}</p>
      )}

      <section className="nv-up nv-card dt-podium-card" aria-label={`Top 3 for ${when}`}>
        <div className="dt-head"><strong style={{ fontSize: 18 }}>{when} · Top 3</strong><span>TikTok&apos;s affiliate creators · ranked by sales{weekly ? " over 7 days" : ""}</span></div>
        <div className="dt-podium">
          {podium.map((r) => {
            const first = r.rank === 1;
            const [chg, color] = change(r, weekly);
            return (
              <button key={r.user} type="button" className="dt-p dt-tap" onClick={() => onOpen(r.user)} aria-label={`#${r.rank} @${r.user}: open profile`}>
                <span className="dt-icon">{first ? <Crown size={38} /> : <Medal place={r.rank as 2 | 3} size={26} />}</span>
                <LevelFace lv={r.lv} size={first ? 92 : 74} img={r.avatar} name={r.user} />
                <strong className="dt-ellip" style={{ fontSize: 15, maxWidth: "100%", marginTop: r.lv != null ? 6 : 0 }}>@{r.user}</strong>
                {r.rezekii && <span className="dt-rz">Rezekii creator</span>}
                <span className="dt-streak"><Flame size={12} /> {r.days} {r.days === 1 ? "day" : "days"} {inList}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{chg}</span>
                <span className={`dt-step dt-step${r.rank}`}>{r.rank}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="dt-cols">
        <section className="nv-up nv-card dt-list" aria-label={`Top 100 for ${when}`}>
          <div className="dt-row dt-rowhead" aria-hidden="true"><span>Rank</span><span /><span>Creator</span><span>vs day before</span><span>Days in list</span><span>Last {b.historyDays.length} days</span><span>TikTok&apos;s GMV range</span></div>
          {rest.map((r) => {
            const [chg, color] = change(r, weekly);
            return (
              <button key={r.user} type="button" className={`dt-row dt-tap ${r.rezekii ? "dt-ourrow" : ""} ${b.me && r.user.toLowerCase() === b.me ? "dt-merow" : ""}`} onClick={() => onOpen(r.user)}>
                <span className="dt-rank">{r.rank}</span>
                <LevelFace lv={r.lv} size={40} img={r.avatar} name={r.user} badge={false} />
                <span className="dt-who">
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><strong className="dt-ellip">@{r.user}</strong>{r.rezekii && <span className="dt-rz">Rezekii</span>}</span>
                  <span className="dt-ellip" style={{ fontSize: 12, color: "var(--muted)" }}>{r.nick} · {short(r.followers)} followers{r.lv != null ? ` · TikTok Shop Lv${r.lv}` : ""}</span>
                  <span className="dt-mob">{r.lo || r.hi ? `RM${big(r.lo)} – ${big(r.hi)}` : "–"}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color }}>{chg}</span>
                <span><span className={`dt-streak ${r.days >= 20 ? "" : "dt-streak-low"}`}><Flame size={12} hot={r.days >= 20} /> {r.days}</span></span>
                <Strip history={r.history} days={b.historyDays} />
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{r.lo || r.hi ? `RM${big(r.lo)} – ${big(r.hi)}` : "–"}</span>
              </button>
            );
          })}
          {b.rows.length > 20 && (
            <button type="button" className="nv-btn2 nv-press" onClick={() => setAll(!all)} style={{ alignSelf: "center", marginTop: 12 }}>{all ? "Show the top 20" : `Show all ${b.rows.length}`}</button>
          )}
        </section>

        <section className="nv-up nv-card dt-hall" aria-labelledby="dthall">
          <h3 id="dthall" style={{ margin: 0, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><Trophy size={24} /> Hall of Fame</h3>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Most days {inList} since {b.first ? dayName(b.first) : "Rezekii started saving"} ({b.saved} days)</span>
          {b.hall.map((h, i) => (
            <button key={h.user} type="button" className="dt-hrow dt-tap" onClick={() => onOpen(h.user)}>
              <span className="dt-hm">{i < 3 ? <Medal place={(i + 1) as 1 | 2 | 3} size={22} /> : <span className="dt-medal dt-m4">{i + 1}</span>}</span>
              <LevelFace lv={h.lv} size={34} img={h.avatar} name={h.user} badge={false} />
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><strong className="dt-ellip">@{h.user}</strong>{h.rezekii && <span className="dt-rz">Rezekii</span>}</span>
                <Strip history={h.history} days={b.historyDays} />
              </span>
              <span style={{ textAlign: "right" }}><strong style={{ fontSize: 18 }}>{h.days}</strong><span style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>of {b.saved} · best #{h.best}</span></span>
            </button>
          ))}
          <span className="dt-key"><i className="dt-c1" />Top 3 <i className="dt-c2" />4–10 <i className="dt-c3" />11–50 <i className="dt-c4" />51–100 <i className="dt-c0" />Not in the list</span>
        </section>
      </div>
      <p className="dt-note">
        {weekly ? "TikTok's list of the top 100 affiliate creators by sales over the 7 days to each day" : "TikTok's daily best-seller list of the top 100 affiliate creators by sales"} in Malaysia. Shop accounts are on Top sellers. Rezekii saves it every day as soon as TikTok publishes it (since {b.first ? dayName(b.first) : "12 Sep"}).
      </p>
    </div>
  );
}
