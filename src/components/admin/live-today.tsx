"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Count } from "@/components/ui";
import { Av, Pill, Spark } from "@/components/admin/bits";
import { useDemo } from "@/components/demo";

type Data = {
  queues: { key: string; n: number; label: string; note: string }[];
  kpis: { label: string; today: number; yesterday: number; series: number[]; note: string }[];
  mine: { key: string; title: string; note: string; tag: string; late: boolean }[];
  actions: { at: string; actor: string; what: string }[];
  at: string;
};

/** Where each queue opens, and how it looks (the same as the sample Today page). */
const LOOK: Record<string, { href: string; icon: IconName; bg: string; tone?: "red" | "amber" | "calm" }> = {
  "tap-new": { href: "/admin/tap", icon: "kanban", bg: "linear-gradient(135deg,#22dc95,#00a862)", tone: "calm" },
  "tap-late": { href: "/admin/tap", icon: "alert", bg: "linear-gradient(135deg,#ff8a80,#d93a2b)", tone: "red" },
  "tap-review": { href: "/admin/tap", icon: "refresh", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)" },
  samples: { href: "/admin/tap/samples", icon: "gift", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)" },
  access: { href: "/admin/users/access", icon: "users", bg: "linear-gradient(135deg,#a78bfa,#6d28d9)" },
  custom: { href: "/admin/business/custom", icon: "inbox", bg: "linear-gradient(135deg,#5eead4,#0f766e)" },
  posts: { href: "/admin/system/publishing", icon: "send", bg: "linear-gradient(135deg,#ff7aa8,#e8005a)", tone: "amber" },
  wishes: { href: "/admin/tap/requests", icon: "bag", bg: "linear-gradient(135deg,#ffb35c,#f08a00)" },
  system: { href: "/admin/system", icon: "alert", bg: "linear-gradient(135deg,#ff8a80,#d93a2b)", tone: "red" },
  review: { href: "/admin/tap/review", icon: "check", bg: "linear-gradient(135deg,#22dc95,#00a862)", tone: "amber" },
};
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
const when = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur" }) === new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur" });
  return sameDay ? hm(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
};

/** Admin Today on real data (owner, 31 Oct 2026): what's waiting, today's numbers, your items and the staff log. */
export function LiveAdminToday() {
  const { me } = useDemo();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v2/admin/today", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then(setD)
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load today's numbers. Please try again."));
  }, []);
  const [hi, setHi] = useState("Good morning");
  useEffect(() => { const h = new Date().getHours(); setHi(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"); }, []);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Today</h1>
        <p className="v2-muted" style={{ margin: "4px 0 0" }}>{today} · {hi}{me?.name ? `, ${me.name.split(" ")[0]}` : ""}.</p>
      </div>
      {!d ? (
        <p className="v2-muted">{err ?? "Loading…"}</p>
      ) : (
        <>
          <section className="v2-stack" aria-label="Queues">
            <div className="v2-card-h">
              <h2 className="v2-h2">Needs a Person</h2>
              <span className="v2-small">Updated {hm(d.at)}</span>
            </div>
            <div className="ad-queues">
              {d.queues.map((q) => {
                const look = LOOK[q.key];
                return (
                  <Link key={q.key} href={look.href} className={`ad-queue ${q.n ? look.tone ?? "" : "calm"}`}>
                    <span className="ad-qtop">
                      <span className="ad-qico" style={{ background: look.bg }}><Icon name={look.icon} size={19} /></span>
                      <span className="n"><Count value={q.n} /></span>
                      <span><Icon name="arrow" size={18} /></span>
                    </span>
                    <b>{q.label}</b>
                    <small>{q.note}</small>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="v2-stack" aria-label="Today's numbers">
            <div className="v2-card-h">
              <h2 className="v2-h2">Today&apos;s Numbers</h2>
              <Link href="/admin/analytics" className="v2-link">Analytics</Link>
            </div>
            <div className="ad-kpis">
              {d.kpis.map((k) => {
                const delta = k.today - k.yesterday;
                return (
                  <div key={k.label} className="ad-kpi">
                    <small>{k.label}</small>
                    <b><Count value={k.today} /></b>
                    <em><span className={delta >= 0 ? "ad-up" : "ad-down"}>{delta >= 0 ? "+" : ""}{delta}</span> vs yesterday ({k.yesterday})</em>
                    <Spark values={k.series} tone={delta > 0 ? "up" : delta < 0 ? "down" : "flat"} />
                    <em>{k.note}</em>
                  </div>
                );
              })}
            </div>
            <p className="v2-small" style={{ margin: 0 }}>Today so far, Malaysia time · trend 14 days · from Rezekii&apos;s own records</p>
          </section>

          <div className="v2-grid2">
            <section className="v2-card">
              <div className="v2-card-h">
                <h2 className="v2-h2">Assigned to You</h2>
                <span className="badge">{d.mine.length}</span>
              </div>
              <div className="ad-list">
                {d.mine.map((m) => (
                  <Link key={m.key} href="/admin/tap" className="ad-row ad-rowbtn click" style={{ textDecoration: "none" }}>
                    <span className="main"><b>{m.title}</b><small>{m.note}</small></span>
                    <Pill tone={m.late ? "bad" : "warn"}>{m.tag}</Pill>
                  </Link>
                ))}
                {!d.mine.length && <p className="v2-muted" style={{ margin: 0 }}>Nothing open is assigned to you.</p>}
              </div>
            </section>

            <section className="v2-card">
              <div className="v2-card-h">
                <h2 className="v2-h2">Staff Actions</h2>
                <Link href="/admin/system/audit">Audit Log</Link>
              </div>
              <div className="ad-list">
                {d.actions.map((a, i) => (
                  <div key={i} className="ad-row">
                    <Av name={a.actor} size={32} />
                    <span className="main"><b>{a.actor}</b><small>{a.what} · {when(a.at)}</small></span>
                  </div>
                ))}
                {!d.actions.length && <p className="v2-muted" style={{ margin: 0 }}>No staff actions yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
