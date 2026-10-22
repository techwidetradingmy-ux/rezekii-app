"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import type { Lang } from "@/lib/i18n/lang.ts";
import "./calendar-picker.css";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEK_ZH = ["一", "二", "三", "四", "五", "六", "日"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-07" for year, month (0-11) and day. */
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const dayName = (s: string, lang: Lang) => { const [, m, d] = s.split("-").map(Number); return lang === "zh" ? `${m}月${d}日` : `${d} ${SHORT[m - 1]}`; };
const between = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400_000) + 1;

type Common = { label: string; sub?: string; loading?: boolean; ariaLabel?: string };
/** Range: quick choices, then any start and end day up to `today`, and an optional comparison (Sales). */
type RangeProps = Common & {
  mode: "range"; today: string; from: string; to: string; onRange: (from: string, to: string) => void;
  presets: [string, string][]; preset: string | null; onPreset: (key: string) => void;
  compare?: { value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: (v: string) => boolean };
};
/** Day: one of the given days (Rankings' saved TikTok lists). */
type DayProps = Common & { mode: "day"; days: string[]; value: string; onDay: (day: string) => void };

/**
 * One date picker for every page (owner, 14 Oct 2026): a button showing the choice, opening a calendar above everything else
 * (rendered at the end of the page so cards can't cover it), as a bottom sheet on a phone.
 */
export function CalendarPicker(p: RangeProps | DayProps) {
  const t = useT();
  const lang = useLang();
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const last = p.mode === "range" ? p.today : [...p.days].sort().at(-1) ?? "";
  const shown = p.mode === "range" ? p.to : p.value;
  const [cal, setCal] = useState(() => { const [y, m] = (shown || last).split("-").map(Number); return { y, m: m - 1 }; });
  const [pick, setPick] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const close = () => { setOpen(false); setPick(null); setHover(null); };
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => { const r = btn.current!.getBoundingClientRect(); setPos({ top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) }); };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const toggle = () => {
    if (!open) { const [y, m] = (shown || last).split("-").map(Number); setCal({ y, m: m - 1 }); }
    setOpen(!open);
  };

  const allowed = p.mode === "day" ? new Set(p.days) : null;
  const first = p.mode === "day" ? [...p.days].sort()[0] ?? last : "2000-01-01";
  const atLast = iso(cal.y, cal.m, 1) >= last.slice(0, 8) + "01";
  const atFirst = iso(cal.y, cal.m, 1) <= first.slice(0, 8) + "01";
  const move = (k: number) => setCal(({ y, m }) => ({ y: y + Math.floor((m + k) / 12), m: (((m + k) % 12) + 12) % 12 }));
  const lead = (new Date(Date.UTC(cal.y, cal.m, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(cal.y, cal.m + 1, 0)).getUTCDate();

  // The band to highlight: the range being picked (start + hovered day), or the current choice.
  const [lo, hi] = p.mode === "day" ? [p.value, p.value] : pick ? [pick, hover ?? pick].sort() : [p.from, p.to];
  const tap = (s: string) => {
    if (p.mode === "day") { p.onDay(s); close(); return; }
    if (!pick) { setPick(s); return; }
    const [a, b] = [pick, s].sort();
    p.onRange(a, b);
    close();
  };

  const panel = open && pos && (
    <>
      <button type="button" aria-label={t("Close")} className="cp-dim" onClick={close} />
      <div role="dialog" aria-label={p.ariaLabel ?? t("Choose dates")} className={`cp-pop ${p.mode === "day" ? "cp-one" : ""}`} style={{ top: pos.top, right: pos.right }}>
        <span className="cp-grab" aria-hidden="true" />
        {p.mode === "range" && (
          <div className="cp-presets" role="group" aria-label={t("Quick choices")}>
            {p.presets.map(([k, label]) => <button key={k} type="button" className={`cp-pre ${p.preset === k ? "on" : ""}`} onClick={() => { p.onPreset(k); close(); }}>{t(label)}</button>)}
          </div>
        )}
        <div className="cp-cal">
          <div className="cp-head">
            <button type="button" className="cp-nav" aria-label={t("Previous month")} disabled={atFirst} onClick={() => move(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <strong>{lang === "zh" ? `${cal.y}年${cal.m + 1}月` : `${MONTHS[cal.m]} ${cal.y}`}</strong>
            <button type="button" className="cp-nav" aria-label={t("Next month")} disabled={atLast} onClick={() => move(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div className="cp-week" aria-hidden="true">{(lang === "zh" ? WEEK_ZH : WEEK).map((w) => <span key={w}>{w}</span>)}</div>
          <div className="cp-days" onMouseLeave={() => setHover(null)}>
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: daysIn }, (_, i) => {
              const s = iso(cal.y, cal.m, i + 1);
              const off = s > last || (allowed !== null && !allowed.has(s));
              const inBand = s >= lo && s <= hi;
              const edge = s === lo || s === hi;
              const col = (lead + i) % 7;
              return (
                <span key={s} className={`cp-cell ${inBand && lo !== hi ? "band" : ""} ${s === lo ? "lo" : ""} ${s === hi ? "hi" : ""} ${col === 0 ? "c0" : ""} ${col === 6 ? "c6" : ""}`}>
                  <button type="button" className={`cp-day ${inBand && edge ? "edge" : ""} ${s === last ? "today" : ""}`} disabled={off} onClick={() => tap(s)} onMouseEnter={() => pick && setHover(s)} aria-label={lang === "zh" ? `${cal.y}年${cal.m + 1}月${i + 1}日` : `${i + 1} ${MONTHS[cal.m]} ${cal.y}`} aria-pressed={inBand}>{i + 1}</button>
                </span>
              );
            })}
          </div>
          <span className="cp-hint">
            {p.mode === "day" ? t("Days with TikTok data can be picked.") : pick ? t("From {day} · now tap the last day", { day: dayName(pick, lang) }) : between(p.from, p.to) === 1 ? t("{a} – {b} · {n} day · tap a start day to pick your own", { a: dayName(p.from, lang), b: dayName(p.to, lang), n: 1 }) : t("{a} – {b} · {n} days · tap a start day to pick your own", { a: dayName(p.from, lang), b: dayName(p.to, lang), n: between(p.from, p.to) })}
          </span>
          {p.mode === "range" && p.compare && (
            <div className="cp-cmpw">
              <span className="cp-gt">{t("Compare with")}</span>
              <div className="cp-cmp" role="group" aria-label={t("Compare with")}>
                {p.compare.options.map(([v, label]) => <button key={v} type="button" className={p.compare!.value === v ? "on" : ""} disabled={p.compare!.disabled?.(v)} onClick={() => { p.compare!.onChange(v); close(); }}>{t(label)}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button ref={btn} type="button" className="cp-btn nv-press" aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, minWidth: 0 }}>
          <strong>{p.label}</strong>
          {p.sub && <span className="cp-sub">{p.sub}</span>}
        </span>
        {p.loading ? <span className="nv-sping" aria-hidden="true" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}
