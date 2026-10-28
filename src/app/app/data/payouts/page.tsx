"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { CalendarPicker, dayName, iso } from "@/components/calendar-picker";
import { Count, Lock, Seg, Stat, Title } from "@/components/ui";
import { rm } from "@/lib/mock";
import { PAYOUTS, payoutDays, type PayoutDay } from "@/lib/mock-creator2";
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

function sum(from: string, to: string) {
  const t = { est: 0, extra: 0, clawed: 0, paid: 0, pending: 0, days: 0 };
  for (const d of DAYS) {
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
  const [range, setRange] = useState<[string, string]>(RANGE.month);
  const [preset, setPreset] = useState<string | null>("month");
  const [view, setView] = useState<"Calendar" | "List">("Calendar");
  const [calIdx, setCalIdx] = useState(MONTHS.length - 1);
  const [picked, setPicked] = useState<Day | null>(null);

  const [from, to] = range;
  const total = sum(from, to);
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
    preset === "month" ? "October 2026" : preset === "lastmonth" ? "September 2026" : preset ? PRESETS.find(([k]) => k === preset)![1] : `${dayName(from)} – ${dayName(to)}`;
  const sub = preset === "month" ? `${dayName(from)} – ${dayName(to)} · this month` : `${dayName(from)} – ${dayName(to)} · ${total.days} days`;

  const cal = MONTHS[calIdx];
  const lead = (new Date(Date.UTC(cal.year, cal.month, 1)).getUTCDay() + 6) % 7;
  const maxDay = Math.max(...cal.days.map((d) => d.est));
  const inRange = DAYS.filter((d) => d.date >= from && d.date <= to);
  const extraAll = DAYS.reduce((s, d) => s + d.extra, 0);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Payouts" sub="TikTok Shop pays your commission. Rezekii shows it, and what you earned extra with us.">
        <CalendarPicker
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
      </Title>

      <Lock what="your payouts">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">{label}</h2>
            {total.pending > 0 ? <span className="badge badge-amber">Settling</span> : <span className="badge">Paid</span>}
          </div>
          <div className="cr2-payhead">
            <div>
              <span className="v2-small">Estimated commission</span>
              <div className="cr2-amt"><Count key={`${from}${to}`} value={total.est} format={(n) => rm(n)} /></div>
            </div>
            <div className="cr2-extra">
              <span className="v2-small">Extra through Rezekii</span>
              <div className="cr2-amt violet">+<Count key={`x${from}${to}`} value={total.extra} format={(n) => rm(n)} /></div>
              <small>{Math.round((total.extra / Math.max(total.est, 1)) * 100)}% of your commission. TikTok&apos;s open plan wouldn&apos;t have paid this.</small>
            </div>
          </div>
          <div className="cr2-stack" role="img" aria-label={`Open-plan commission ${rm(open)}, extra through Rezekii ${rm(total.extra)}`}>
            <i className="cr2-k-open" style={{ width: w(open) }} />
            <i className="cr2-k-extra" style={{ width: w(total.extra), animationDelay: "120ms" }} />
          </div>
          <div className="cr2-legend">
            <span><i className="cr2-k-open" />At TikTok&apos;s open rates <b>{rm(open)}</b></span>
            <span><i className="cr2-k-extra" />Extra through Rezekii <b>{rm(total.extra)}</b></span>
          </div>
        </section>
      </Lock>

      <div className="cr2-stats">
        <Stat label="Paid" value={rm(total.paid)} note="Already in your TikTok Shop balance" tone="up" />
        <Stat label="Pending" value={rm(total.pending)} note={total.pending ? "Next release about 4 Nov" : "Nothing waiting"} />
        <Stat label="Clawed back" value={rm(total.clawed)} note="Orders cancelled or returned" tone="down" />
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
                  return (
                    <button
                      key={d.day}
                      type="button"
                      className={`cr2-payday ${d.state} ${out ? "out" : ""} ${picked?.date === date ? "on" : ""}`}
                      disabled={d.state === "future"}
                      onClick={() => setPicked({ ...d, date })}
                      aria-label={d.state === "future" ? `${d.day}: no orders yet` : `${d.day}: ${rm(d.est)}, ${d.state}`}
                    >
                      <b>{d.day}</b>
                      {d.state !== "future" && (
                        <>
                          <small>{rm(d.est, 0).replace("RM ", "")}</small>
                          <i style={{ height: `${Math.max(10, (d.est / maxDay) * 100)}%` }}><em style={{ height: `${(d.extra / d.est) * 100}%` }} /></i>
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
                <span><i className="cr2-k-extra" />Extra through Rezekii</span>
                <span><i className="cr2-k-claw" />Clawed back</span>
              </div>
              {picked ? (
                <div className="cr2-daycard">
                  <b>{dayName(picked.date)}</b>
                  <span>Estimated <b>{rm(picked.est)}</b> · of which <b className="violet">{rm(picked.extra)}</b> extra through Rezekii</span>
                  <small>
                    {picked.state === "paid" ? "Paid into your TikTok Shop balance." : "Pending: TikTok releases it after the return window, about 4 Nov."}
                    {picked.clawed > 0 && ` ${rm(picked.clawed)} was clawed back after a cancel or return.`}
                  </small>
                </div>
              ) : (
                <p className="v2-small" style={{ margin: 0 }}>Tap a day to see its commission and payout status. Days outside your dates are faded.</p>
              )}
            </div>
          ) : (
            <div className="v2-divide">
              {[...inRange].reverse().slice(0, 31).map((d) => (
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
              {inRange.length > 31 && <p className="v2-small" style={{ margin: "12px 0 0" }}>Showing the latest 31 days. Month by month below covers the rest.</p>}
            </div>
          )}
        </Lock>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Month by month</h2>
          <span className="v2-small">Extra through Rezekii since June: <b className="violet">{rm(extraAll)}</b></span>
        </div>
        <Lock what="your monthly payouts">
          <div className="cr2-paytable" role="table" aria-label="Payouts by month">
            <div role="row" className="hd">
              <span role="columnheader">Month</span>
              <span role="columnheader">Estimated</span>
              <span role="columnheader">Paid</span>
              <span role="columnheader" className="violet">Extra with Rezekii</span>
              <span role="columnheader">Status</span>
            </div>
            {[...MONTHS].reverse().map((m) => {
              const a = iso(m.year, m.month, 1);
              const b = iso(m.year, m.month, m.days.length) > TODAY ? TODAY : iso(m.year, m.month, m.days.length);
              const t = sum(a, b);
              return (
                <button key={m.name} type="button" role="row" className={from === a && to === b ? "on" : undefined} onClick={() => choose(a, b, a === RANGE.month[0] ? "month" : a === RANGE.lastmonth[0] ? "lastmonth" : null)}>
                  <span role="cell"><b>{m.name}</b>{t.clawed > 0 && <small className="cr2-red">−{rm(t.clawed)} clawed back</small>}</span>
                  <span role="cell">{rm(t.est)}</span>
                  <span role="cell"><b>{rm(t.paid)}</b></span>
                  <span role="cell" className="violet"><b>+{rm(t.extra)}</b></span>
                  <span role="cell">{t.pending > 0 ? <span className="badge badge-amber">{rm(t.pending)} pending</span> : <span className="badge">Paid</span>}</span>
                </button>
              );
            })}
          </div>
        </Lock>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">What these mean</h2>
        <ul className="cr2-do">
          <li><span><b>Estimated</b>: commission on orders placed, before buyers can still cancel or return.</span></li>
          <li><span><b>Extra through Rezekii</b>: on orders of products in Techwide&apos;s campaigns, what you got above TikTok&apos;s open rate for the same product. Worked out order by order.</span></li>
          <li><span><b>Pending</b>: the order is delivered but the return window isn&apos;t over yet.</span></li>
          <li><span><b>Paid</b>: TikTok Shop has settled it into your balance. Withdraw it in TikTok Shop.</span></li>
          <li><span><b>Clawed back</b>: the buyer cancelled or returned after the commission was counted.</span></li>
        </ul>
        <p className="cr2-note"><Icon name="shield" size={15} /><span>We only show money that has already happened. We never forecast what you will earn.</span></p>
      </section>
    </div>
  );
}
