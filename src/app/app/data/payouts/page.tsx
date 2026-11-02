"use client";

import { useEffect, useMemo, useState } from "react";
import { Updated } from "@/components/data-note";
import { Icon } from "@/components/icons";
import { CalendarPicker, dayName, iso } from "@/components/calendar-picker";
import { Count, Flow, Lock, Seg, Stat, Tip, Title } from "@/components/ui";
import { rm } from "@/lib/mock";
import { useDemo } from "@/components/demo";
import { loadAnalytics, type LiveAnalytics } from "@/lib/live";
import { PAYOUTS, payoutDays, type PayoutDay } from "@/lib/mock-creator2";
import { SortBar, useSortPref } from "@/components/sort-bar";
import "@/app/creator2.css";

const TODAY = "2026-10-28";
const FIRST = "2026-06-01";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const back = (n: number) => { const d = new Date(Date.UTC(2026, 9, 28 - n)); return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };

/** Every day with commission, June to today, oldest first. */
type Day = PayoutDay & { date: string };
const MONTHS = [...PAYOUTS].reverse().map((m) => ({ name: m.month, ...payoutDays(m) }));
const DAYS: Day[] = MONTHS.flatMap(({ year, month, days }) => days.filter((d) => d.state !== "future").map((d) => ({ ...d, date: iso(year, month, d.day) })));

const PRESETS: [string, string][] = [["month", "This month"], ["lastmonth", "Last month"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["90d", "Last 90 days"], ["all", "All time"]];
const RANGE: Record<string, [string, string]> = {
  month: ["2026-10-01", TODAY], lastmonth: ["2026-09-01", "2026-09-30"], "7d": [back(6), TODAY], "30d": [back(29), TODAY], "90d": [back(89), TODAY], all: [FIRST, TODAY],
};

/** The real months as the calendar needs them (owner, 30 Oct 2026), oldest first, with today and the first month. */
function realData(months: LiveAnalytics["months"]) {
  const now = new Date(Date.now() + 8 * 3_600_000);
  const today = iso(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const ms = [...months].reverse().map((m) => ({ name: m.month, year: m.year, month: m.monthIndex, days: m.days }));
  const days: Day[] = ms.flatMap(({ year, month, days }) => days.filter((d) => d.state !== "future").map((d) => ({ ...d, date: iso(year, month, d.day) })));
  const ago = (n: number) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n)); return iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  const first = ms.length ? iso(ms[0].year, ms[0].month, 1) : today;
  const thisMonth = iso(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const lastEnd = ago(now.getUTCDate());
  const range: Record<string, [string, string]> = { month: [thisMonth, today], lastmonth: [lastEnd.slice(0, 8) + "01", lastEnd], "7d": [ago(6), today], "30d": [ago(29), today], "90d": [ago(89), today], all: [first, today] };
  return { MONTHS: ms.length ? ms : [{ name: "", year: now.getUTCFullYear(), month: now.getUTCMonth(), days: [] as PayoutDay[] }], DAYS: days, RANGE: range, TODAY: today, FIRST: first };
}
const SAMPLE = { MONTHS, DAYS, RANGE, TODAY, FIRST };

function sum(from: string, to: string, days: Day[] = DAYS) {
  const t = { est: 0, extra: 0, clawed: 0, paid: 0, pending: 0, days: 0 };
  for (const d of days) {
    if (d.date < from || d.date > to) continue;
    t.est += d.est;
    t.extra += d.extra;
    t.clawed += d.clawed;
    if (d.state === "paid") t.paid += d.est - d.clawed;
    else t.pending += d.est - d.clawed;
    t.days += 1;
  }
  return t;
}

/** Payouts: pick any dates (V1's picker), see each day in a calendar, and how much of it came extra through Rezekii. */
export default function DataPayouts() {
  const { live } = useDemo();
  const [real, setReal] = useState<LiveAnalytics | null>(null);
  useEffect(() => {
    if (live) loadAnalytics().then(setReal);
  }, [live]);
  const { MONTHS, DAYS, RANGE, TODAY, FIRST } = useMemo(() => (real ? realData(real.months) : SAMPLE), [real]);
  return <Payouts key={real ? "real" : "sample"} MONTHS={MONTHS} DAYS={DAYS} RANGE={RANGE} TODAY={TODAY} FIRST={FIRST} updated={live ? real?.syncedAt : null} />;
}

function Payouts({ MONTHS, DAYS, RANGE, TODAY, FIRST, updated }: typeof SAMPLE & { updated?: string | null }) {
  const [range, setRange] = useState<[string, string]>(RANGE.month);
  const [preset, setPreset] = useState<string | null>("month");
  const [view, setView] = useState<"Calendar" | "List">("Calendar");
  // The list sorts by date or amount, newest or highest first by default, remembered (owner, 1 Nov 2026).
  const [listBy, setListBy, listDir, flipList] = useSortPref("payouts-list", ["Date", "Amount"] as const, "Date");
  const [calIdx, setCalIdx] = useState(MONTHS.length - 1);
  const [picked, setPicked] = useState<Day | null>(null);

  const [from, to] = range;
  const total = sum(from, to, DAYS);
  const open = total.est - total.extra;
  const w = (n: number) => `${(n / Math.max(total.est, 1)) * 100}%`;
  const monthOf = (date: string) => MONTHS.findIndex((m) => iso(m.year, m.month, 1).slice(0, 7) === date.slice(0, 7));
  const choose = (a: string, b: string, key: string | null) => {
    setRange([a, b]);
    setPreset(key);
    setPicked(null);
    setCalIdx(Math.max(0, monthOf(b)));
  };

  const label =
    preset === "month" || preset === "lastmonth" ? new Date(`${from}T00:00:00Z`).toLocaleDateString("en-MY", { month: "long", year: "numeric", timeZone: "UTC" }) : preset ? PRESETS.find(([k]) => k === preset)![1] : `${dayName(from)} – ${dayName(to)}`;
  const sub = preset === "month" ? `${dayName(from)} – ${dayName(to)} · this month` : `${dayName(from)} – ${dayName(to)} · ${total.days} days`;

  const cal = MONTHS[calIdx];
  const lead = (new Date(Date.UTC(cal.year, cal.month, 1)).getUTCDay() + 6) % 7;
  const maxDay = Math.max(...cal.days.map((d) => d.est));
  const inRange = DAYS.filter((d) => d.date >= from && d.date <= to);

  return (
    <div className="v2-stack v2-in" style={{ gap: 14 }}>
      <Title title="Payouts" sub="Your commission, and what you earned extra with us." />
      <Updated at={updated} />

      <section className="v2-card flat pay-flow">
        <h2 className="cr2-h3">How Your Commission Moves <Tip label="About payouts" text="Real earnings only. No forecasts." /></h2>
        <Flow
          label="How commission moves from order to payout"
          steps={[
            { icon: "bag", title: "Ordered" },
            { icon: "box", title: "Delivered" },
            { icon: "wallet", title: "Settled" },
            { icon: "x", title: "Cancelled or returned", tone: "red" },
          ]}
        />
      </section>

      <Lock what="your payouts">
        <section className="v2-card">
          {/* The calendar icon sits on this card (owner, 29 Oct 2026): any preset or a custom range. */}
          <div className="v2-card-h">
            <h2 className="v2-h2">{label}</h2>
            <CalendarPicker
              compact
              label={label}
              sub={sub}
              today={TODAY}
              first={FIRST}
              from={from}
              to={to}
              onRange={(a, b) => choose(a, b, null)}
              presets={PRESETS}
              preset={preset}
              onPreset={(k) => choose(RANGE[k][0], RANGE[k][1], k)}
            />
          </div>
          <div className="cr2-payhead">
            <div>
              <span className="v2-small">Estimated commission</span>
              <div className="cr2-amt"><Count key={`${from}${to}`} value={total.est} format={(n) => rm(n)} /></div>
            </div>
            <div className="cr2-extra">
              <span className="v2-small">Extra through Rezekii</span>
              <div className="cr2-amt violet">+<Count key={`x${from}${to}`} value={total.extra} format={(n) => rm(n)} /></div>
              <small>{Math.round((total.extra / Math.max(total.est, 1)) * 100)}% of your commission. More than your own rates pay.</small>
            </div>
          </div>
          <div className="cr2-stack" role="img" aria-label={`Commission at your own rates ${rm(open)}, extra through Rezekii ${rm(total.extra)}`}>
            <i className="cr2-k-open" style={{ width: w(open) }} />
            <i className="cr2-k-extra" style={{ width: w(total.extra), animationDelay: "120ms" }} />
          </div>
          <div className="cr2-legend">
            <span><i className="cr2-k-open" />At your own rates <b>{rm(open)}</b></span>
            <span><i className="cr2-k-extra" />Extra through Rezekii <b>{rm(total.extra)}</b></span>
          </div>
        </section>
      </Lock>

      <div className="cr2-stats">
        <Stat label="Paid" value={rm(total.paid)} note="In your TikTok Shop balance" tone="up" />
        <Stat label="Pending" value={rm(total.pending)} note={total.pending ? "Next release about 4 Nov" : "Nothing waiting"} />
        <Stat label="Clawed Back" value={rm(total.clawed)} note="Orders cancelled or returned" tone="down" />
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <span className="v2-row" style={{ gap: 6, flexWrap: "nowrap" }}>
            <button type="button" className="cp-nav" aria-label="Previous month" disabled={calIdx === 0 || view === "List"} onClick={() => { setCalIdx(calIdx - 1); setPicked(null); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <h2 className="v2-h2" style={{ minWidth: 0 }}>{view === "Calendar" ? cal.name : `${dayName(from)} – ${dayName(to)}`}</h2>
            <button type="button" className="cp-nav" aria-label="Next month" disabled={calIdx === MONTHS.length - 1 || view === "List"} onClick={() => { setCalIdx(calIdx + 1); setPicked(null); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </span>
          <Seg value={view} options={["Calendar", "List"] as const} onChange={setView} />
        </div>
        <Lock what="your daily payouts">
          {view === "Calendar" ? (
            <div className="v2-stack" style={{ gap: 12 }}>
              <div className="cr2-paycal" role="grid" aria-label={`Commission per day, ${cal.name}`}>
                {WEEKDAYS.map((d) => <span key={d} className="cr2-paycal-wd">{d}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
                {cal.days.map((d) => {
                  const date = iso(cal.year, cal.month, d.day);
                  const out = d.state !== "future" && (date < from || date > to);
                  // Option A (owner, 1 Nov 2026): the whole day takes its status colour, stronger the more it earned, with a strip
                  // along the bottom for the part that came extra through Rezekii.
                  const k = d.state === "future" || !maxDay || !d.est ? 0 : Math.round(14 + (d.est / maxDay) * 56);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      style={{ ["--k" as string]: `${k}%` }}
                      className={`cr2-payday ${d.state} ${d.est ? "" : "zero"} ${out ? "out" : ""} ${picked?.date === date ? "on" : ""}`}
                      disabled={d.state === "future"}
                      onClick={() => setPicked({ ...d, date })}
                      aria-label={d.state === "future" ? `${d.day}: no orders yet` : `${d.day}: ${rm(d.est)}, ${d.state}`}
                    >
                      <b>{d.day}</b>
                      {d.state !== "future" && (
                        <>
                          <small>{rm(d.est, 0).replace("RM ", "")}</small>
                          {d.extra > 0 && d.est > 0 && <span className="cr2-pd-x" style={{ width: `${Math.max(12, Math.min(100, (d.extra / d.est) * 100))}%` }} title="Extra through Rezekii" />}
                          {d.clawed > 0 && <span className="claw" title="Something was clawed back" />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="cr2-legend">
                <span><i className="cr2-k-paid" />Paid</span>
                <span><i className="cr2-k-pend" />Pending</span>
                <span><i className="cr2-k-xs" />Extra through Rezekii</span>
                <span className="cr2-k-more">Darker = more earned</span>
                <span><i className="cr2-k-claw" />Clawed back</span>
              </div>
              {picked ? (
                <div className="cr2-daycard">
                  <b>{dayName(picked.date)}</b>
                  <span>Estimated <b>{rm(picked.est)}</b> · of which <b className="violet">{rm(picked.extra)}</b> extra through Rezekii</span>
                  <small>
                    {picked.state === "paid" ? "Paid into your TikTok Shop balance." : "Pending. Released about 4 Nov."}
                    {picked.clawed > 0 && ` ${rm(picked.clawed)} clawed back (cancel or return).`}
                  </small>
                </div>
              ) : (
                <p className="v2-small" style={{ margin: 0 }}>Tap a day for details.</p>
              )}
            </div>
          ) : (
            <div className="v2-divide">
              <SortBar value={listBy} options={["Date", "Amount"] as const} onChange={setListBy} dir={listDir} onFlip={flipList} />
              {[...inRange].sort((a, b) => { const x = listBy === "Date" ? a.date.localeCompare(b.date) : a.est - b.est; return listDir === "desc" ? -x : x; }).slice(0, 31).map((d) => (
                <div key={d.date} className="cr2-month">
                  <span>
                    <strong>{dayName(d.date)}</strong>
                    <small>+{rm(d.extra)} extra through Rezekii{d.clawed > 0 && <> · <span className="cr2-red">−{rm(d.clawed)} clawed back</span></>}</small>
                  </span>
                  <span className="amt" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <b>{rm(d.est)}</b>
                    {d.state === "paid" ? <span className="badge">Paid</span> : <span className="badge badge-amber">Pending</span>}
                  </span>
                </div>
              ))}
              {inRange.length > 31 && <p className="v2-small" style={{ margin: "12px 0 0" }}>31 of {inRange.length} days shown.</p>}
            </div>
          )}
        </Lock>
      </section>
    </div>
  );
}
