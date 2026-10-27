"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Plat } from "@/components/seller/seller-ui";
import { SELLER_POSTS, type SellerPost } from "@/lib/mock-seller";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TODAY_INDEX = 2; // Wednesday 28 Oct
const dateOf = (day: number) => {
  const d = new Date(Date.UTC(2026, 9, 26 + day));
  return { n: d.getUTCDate(), m: MONTHS[d.getUTCMonth()] };
};
const STATUS_BADGE = { Scheduled: "badge-blue", Published: "", Failed: "badge-red" } as const;

/** The shop's posts this week, and a history with each platform's result. */
export default function SellerCalendar() {
  const { toast } = useDemo();
  const [view, setView] = useState<"Calendar" | "History">("Calendar");
  const [week, setWeek] = useState(0);
  const [posts, setPosts] = useState<SellerPost[]>(SELLER_POSTS);
  const [open, setOpen] = useState<SellerPost | null>(null);

  const first = dateOf(week * 7), last = dateOf(week * 7 + 6);
  const history = [...posts].sort((a, b) => b.day - a.day);

  const cancel = (p: SellerPost) => { setPosts((all) => all.filter((x) => x.id !== p.id)); setOpen(null); toast("Post cancelled"); };
  const retry = (p: SellerPost) => {
    setPosts((all) => all.map((x) => (x.id === p.id ? { ...x, results: x.results.map((r) => (r.s === "Failed" ? { p: r.p, s: "Published" as const } : r)) } : x)));
    setOpen(null);
    toast("Threads reconnected · posted");
  };

  const postChip = (p: SellerPost) => {
    const failed = p.results.some((r) => r.s === "Failed");
    return (
      <button key={p.id} type="button" className="sl-post" onClick={() => setOpen(p)} style={failed ? { borderColor: "var(--red)" } : undefined}>
        <small>{p.time}{failed ? " · 1 failed" : ""}</small>
        <b>{p.caption}</b>
        <span>{p.results.map((r) => <Plat key={r.p} p={r.p} sm />)}</span>
      </button>
    );
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Calendar & history" sub="Malaysia time · what's coming up and how each post went.">
        <Link href="/seller/app/publish" className="np-btn v2-btn-sm" style={{ height: 42 }}><Icon name="plus" size={16} /> New post</Link>
      </Title>
      <Seg value={view} options={["Calendar", "History"] as const} onChange={setView} />

      {view === "Calendar" ? (
        <section className="v2-card">
          <div className="mp-weekbar">
            <button type="button" className="btn-outline" aria-label="Previous week" onClick={() => setWeek(week - 1)}><Icon name="back" size={18} /></button>
            <b>{first.n} {first.m} – {last.n} {last.m}{week === 0 ? " · this week" : ""}</b>
            <button type="button" className="btn-outline" aria-label="Next week" onClick={() => setWeek(week + 1)}><Icon name="arrow" size={18} /></button>
          </div>
          <div className="sl-cal">
            {DAYS.map((d, i) => {
              const day = week * 7 + i;
              const list = posts.filter((p) => p.day === day);
              const dt = dateOf(day);
              return (
                <div key={d} className={`sl-day ${week === 0 && i === TODAY_INDEX ? "today" : ""}`}>
                  <small>{d} <b>{dt.n}</b>{week === 0 && i === TODAY_INDEX ? " · today" : ""}</small>
                  {list.map(postChip)}
                  {list.length === 0 && day >= TODAY_INDEX && (
                    <Link href="/seller/app/publish" className="v2-small" style={{ textDecoration: "none", opacity: 0.8 }}>+ Add</Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="v2-card">
          {history.map((p) => (
            <div key={p.id} className="sl-hist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" />
              <span>
                <b>{p.caption}</b>
                <small className="v2-small">{p.when}</small>
                <span className="sl-res">
                  {p.results.map((r) => (
                    <span key={r.p}><Plat p={r.p} sm /> {r.s}</span>
                  ))}
                </span>
                {p.results.filter((r) => r.why).map((r) => (
                  <span key={r.p} className="v2-row" style={{ gap: 8 }}>
                    <span className="sl-err" style={{ fontSize: 13 }}><Icon name="alert" size={15} /> {r.p}: {r.why}</span>
                    <button type="button" className="btn-outline" style={{ height: 34, fontSize: 13 }} onClick={() => retry(p)}>Reconnect and retry</button>
                  </span>
                ))}
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="v2-muted">No posts yet.</p>}
        </section>
      )}

      {open && (
        <Sheet title="Post details" onClose={() => setOpen(null)}>
          <div className="sl-hist" style={{ paddingTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.img} alt="" />
            <span><b>{open.caption}</b><small className="v2-small">{open.when}</small></span>
          </div>
          <div className="v2-divide">
            {open.results.map((r) => (
              <div key={r.p} className="sl-acct">
                <Plat p={r.p} />
                <span><b>{r.p}</b>{r.why && <small>{r.why}</small>}</span>
                <span className={`badge ${STATUS_BADGE[r.s]}`}>{r.s}</span>
              </div>
            ))}
          </div>
          {open.results.every((r) => r.s === "Scheduled") ? (
            <div className="v2-row">
              <Link href="/seller/app/publish" className="np-btn" style={{ flex: 1 }}>Edit in New post</Link>
              <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => cancel(open)}>Cancel post</button>
            </div>
          ) : open.results.some((r) => r.s === "Failed") ? (
            <button type="button" className="np-btn" onClick={() => retry(open)}>Reconnect Threads and retry</button>
          ) : (
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => { toast("Opening the post on Facebook"); setOpen(null); }}>View post</button>
          )}
        </Sheet>
      )}
    </div>
  );
}
