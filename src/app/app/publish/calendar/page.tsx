"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";
import { product } from "@/lib/mock";
import { CALENDAR, TODAY, type CalPost, type TargetStatus } from "@/lib/mock-creator2";
import "@/app/creator2.css";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO date helpers on plain UTC dates so the server and the browser agree. */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const dayNum = (s: string) => Number(s.slice(8, 10));
const monthOf = (s: string) => MON[Number(s.slice(5, 7)) - 1];
const label = (s: string) => {
  if (s === TODAY) return "Today";
  if (s === addDays(TODAY, 1)) return "Tomorrow";
  if (s === addDays(TODAY, -1)) return "Yesterday";
  const d = new Date(`${s}T00:00:00Z`);
  return `${DOW[(d.getUTCDay() + 6) % 7]} ${dayNum(s)} ${monthOf(s)}`;
};
/** Monday of the week that holds TODAY (Wednesday 28 Oct 2026). */
const MONDAY = addDays(TODAY, -((new Date(`${TODAY}T00:00:00Z`).getUTCDay() + 6) % 7));

const overall = (p: CalPost): "sched" | "done" | "fail" => (p.targets.some((t) => t.status === "Failed") ? "fail" : p.targets.every((t) => t.status === "Published") ? "done" : "sched");
const pill: Record<TargetStatus, string> = { Published: "badge", Scheduled: "badge badge-blue", Failed: "badge badge-red", "In TikTok drafts": "badge badge-amber" };

/** Calendar & history: a week of scheduled posts, then every post with its status on each platform. */
export default function PublishCalendar() {
  const { toast } = useDemo();
  const [week, setWeek] = useState(0);
  const [posts, setPosts] = useState<CalPost[]>(CALENDAR);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const start = addDays(MONDAY, week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];
  const inWeek = posts.filter((p) => p.date >= start && p.date <= end);
  const upcoming = posts.filter((p) => p.date >= TODAY && overall(p) === "sched").sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = posts.filter((p) => !upcoming.includes(p)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const groups: [string, CalPost[]][] = [["Coming up", upcoming], ["Already out", past]];
  const sel = posts.find((p) => p.id === open) ?? null;

  const fix = (postId: string, name: string, how: "Retry" | "Reconnect") => {
    const key = `${postId}-${name}`;
    setBusy(key);
    toast(how === "Reconnect" ? `${name} reconnected. Posting again…` : `Trying ${name} again…`);
    window.setTimeout(() => {
      setPosts((all) => all.map((p) => (p.id !== postId ? p : { ...p, targets: p.targets.map((t) => (t.name === name ? { name: t.name, status: "Published" as const } : t)) })));
      setBusy(null);
      toast(`Posted to ${name}`);
    }, 1300);
  };

  const targets = (p: CalPost) => (
    <div className="cr2-targets">
      {p.targets.map((t) => {
        const status: TargetStatus = t.status;
        const k = `${p.id}-${t.name}`;
        return (
          <div key={t.name} className="cr2-target">
            <PlatformIcon name={t.name} size={22} />
            <b>{t.name}</b>
            <span className={pill[status]}>{busy === k ? "Posting…" : status}</span>
            {t.status === "Failed" && busy !== k && (
              <>
                <em>{t.reason}</em>
                <button type="button" className={t.fix === "Reconnect" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => fix(p.id, t.name, t.fix ?? "Retry")}>
                  {t.fix ?? "Retry"}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Calendar & history" sub="Malaysia time · a post counts as published only after the platform confirms it">
        <Link href="/app/publish" className="np-btn v2-btn-sm"><Icon name="plus" size={16} /> New post</Link>
      </Title>

      <section className="v2-card">
        <div className="cr2-weekbar">
          <button type="button" className="btn-outline" aria-label="Previous week" onClick={() => setWeek((w) => w - 1)}><Icon name="back" size={18} /></button>
          <b>
            {dayNum(start)} {monthOf(start)} – {dayNum(end)} {monthOf(end)}
            {week === 0 && <span className="badge" style={{ marginLeft: 8, verticalAlign: "middle" }}>This week</span>}
          </b>
          <button type="button" className="btn-outline" aria-label="Next week" onClick={() => setWeek((w) => w + 1)}><Icon name="arrow" size={18} /></button>
        </div>
        <div className="cr2-week">
          {days.map((d, i) => {
            const items = inWeek.filter((p) => p.date === d);
            return (
              <div key={d} className={`cr2-day ${d === TODAY ? "today" : ""}`} aria-label={label(d)}>
                <span className="cr2-dayhead">{DOW[i]}<b>{dayNum(d)}</b></span>
                {items.map((p) => (
                  <button key={p.id} type="button" className={`cr2-cal ${overall(p)}`} onClick={() => setOpen(p.id)} title={p.caption}>
                    <small>{p.time}</small>
                    <span>{p.caption}</span>
                  </button>
                ))}
                {items.length === 0 && <span className="cr2-dayempty" aria-hidden="true">·</span>}
              </div>
            );
          })}
        </div>
        <div className="cr2-legend">
          <span><i style={{ background: "#1d4ed8" }} />Scheduled</span>
          <span><i style={{ background: "#00c073" }} />Published</span>
          <span><i style={{ background: "#e14b3b" }} />Needs you</span>
          {inWeek.length === 0 && <span>Nothing this week yet.</span>}
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">History</h2>
          <span className="v2-small">{posts.length} posts</span>
        </div>
        {groups.map(([title, list]) => list.length > 0 && (
          <div key={title} className="v2-stack" style={{ gap: 0 }}>
            <span className="cap" style={{ paddingTop: 6 }}>{title}</span>
            <div className="v2-divide">
          {list.map((p) => {
            const st = overall(p);
            const failed = p.targets.filter((t) => t.status === "Failed");
            return (
              <div key={p.id} className="cr2-hist">
                <span className="cr2-thumb" style={{ width: 52, height: 68 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product(p.productId).img} alt="" />
                  <i><Icon name="video" size={13} /></i>
                </span>
                <span>
                  <span className="v2-row" style={{ gap: 8 }}>
                    <strong style={{ minWidth: 0 }}>{p.caption}</strong>
                    {st === "fail" && <span className="badge badge-red">Partly failed</span>}
                  </span>
                  <small>{label(p.date)}, {p.time}{st === "fail" && ` · ${failed.map((t) => t.name).join(", ")} didn't go out`}</small>
                  {targets(p)}
                </span>
              </div>
            );
          })}
            </div>
          </div>
        ))}
      </section>

      {sel && (
        <Sheet title={sel.caption} onClose={() => setOpen(null)}>
          <div className="cr2-asset">
            <span className="cr2-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product(sel.productId).img} alt="" />
            </span>
            <span>
              <b>{label(sel.date)}, {sel.time}</b>
              <span className="v2-small">{product(sel.productId).name}</span>
              {targets(sel)}
            </span>
          </div>
          {overall(sel) === "sched" ? (
            <div className="v2-row">
              <button type="button" className="np-btn" style={{ flex: "1 1 140px" }} onClick={() => { toast("Opening the time picker…"); }}>Change time</button>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: "1 1 140px", height: 48 }}
                onClick={() => { setPosts((all) => all.filter((p) => p.id !== sel.id)); setOpen(null); toast("Scheduled post cancelled"); }}
              >
                Cancel post
              </button>
            </div>
          ) : (
            <button type="button" className="btn-outline" style={{ height: 46 }} onClick={() => setOpen(null)}>Close</button>
          )}
        </Sheet>
      )}
    </div>
  );
}
