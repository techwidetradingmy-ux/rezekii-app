"use client";

import "@/app/admin.css";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Count } from "@/components/ui";
import { Av, Meta, Pill, Spark } from "@/components/admin/bits";
import { AUDIT, DISPUTES, FAILED_POSTS, FEEDBACK, ME, RECON, REVIEW_CREATORS, REVIEW_SELLERS, SAMPLES, TICKETS, TODAY_LABEL } from "@/lib/mock-admin";
import { rm } from "@/lib/mock";

type Queue = { href: string; n: number; label: string; note: string; icon: IconName; bg: string; tone?: "red" | "amber" | "calm" };

const KPIS: { label: string; value: number; money?: boolean; note: string; delta: number; series: number[] }[] = [
  { label: "Sign-ups", value: 44, note: "38 creators · 6 sellers", delta: 12, series: [31, 28, 40, 36, 44, 52, 38, 41, 47, 50, 39, 45, 49, 44] },
  { label: "TikTok Shop links", value: 24, note: "Creators who linked today", delta: 9, series: [14, 16, 19, 17, 21, 22, 18, 20, 23, 25, 21, 22, 22, 24] },
  { label: "Scans", value: 312, note: "Showcase scans finished", delta: -5, series: [210, 198, 240, 251, 266, 301, 280, 275, 290, 318, 300, 296, 330, 312] },
  { label: "Raises activated", value: 57, note: "Confirmed by TikTok", delta: -19, series: [42, 38, 51, 47, 55, 61, 58, 52, 60, 66, 63, 59, 70, 57] },
  { label: "Samples approved", value: 31, note: "Read back from Partner Center", delta: 15, series: [18, 22, 25, 19, 27, 21, 24, 26, 30, 29, 23, 28, 27, 31] },
  { label: "GMV through TAP", value: 48210.4, money: true, note: "Attributed, not our revenue", delta: 6, series: [31, 33, 36, 34, 38, 41, 39, 40, 44, 43, 45, 46, 45.5, 48.2] },
];

/** Admin home: what's stuck right now, with counts that open the right queue, and today's key numbers. */
export default function AdminToday() {
  const failedTasks = TICKETS.flatMap((t) => t.tasks).filter((t) => t.state === "Failed").length;
  const handTasks = TICKETS.flatMap((t) => t.tasks).filter((t) => t.state === "Person").length;
  const approve = SAMPLES.filter((s) => s.verdict === "Approve").length;
  const overdueDeliveries = DISPUTES.filter((d) => d.kind === "Creator overdue" && d.status !== "Resolved").length;
  const fbNew = FEEDBACK.filter((f) => f.status === "New").length;
  const recon = RECON.filter((r) => r.ledger !== r.wallets || r.partnerOurs !== r.partnerTikTok);
  const late = TICKETS.filter((t) => t.late);

  const queues: Queue[] = [
    { href: "/admin/tap", n: TICKETS.filter((t) => t.col === "New").length, label: "New TAP requests", note: "2 from expo QR codes, 1 synced from Seller Center", icon: "kanban", bg: "linear-gradient(135deg,#22dc95,#00a862)", tone: "calm" },
    { href: "/admin/tap", n: late.length, label: "Overdue reviews", note: `${late[0]?.id ?? ""} ${late[0]?.shop ?? ""}, 2 days over`, icon: "alert", bg: "linear-gradient(135deg,#ff8a80,#d93a2b)", tone: "red" },
    { href: "/admin/tap/samples", n: SAMPLES.length, label: "Sample requests waiting", note: `The system suggests approving ${approve}`, icon: "gift", bg: "linear-gradient(135deg,#7aa2ff,#1d4ed8)" },
    { href: "/admin/tap", n: failedTasks + handTasks, label: "External tasks to fix", note: `${failedTasks} failed on TikTok · ${handTasks} waiting for a person`, icon: "refresh", bg: "linear-gradient(135deg,#ff8a80,#d93a2b)", tone: "red" },
    { href: "/admin/support", n: overdueDeliveries, label: "Overdue sample deliveries", note: "Creators past the 3-video due date", icon: "box", bg: "linear-gradient(135deg,#ffb35c,#f08a00)", tone: "amber" },
    { href: "/admin/users", n: REVIEW_CREATORS.length + REVIEW_SELLERS.length, label: "Accounts to review", note: `${REVIEW_CREATORS.length} creators · ${REVIEW_SELLERS.length} sellers`, icon: "users", bg: "linear-gradient(135deg,#a78bfa,#6d28d9)" },
    { href: "/admin/support/feedback", n: fbNew, label: "New feedback", note: "Ideas, bugs and complaints", icon: "inbox", bg: "linear-gradient(135deg,#5eead4,#0f766e)" },
    { href: "/admin/system/publishing", n: FAILED_POSTS.length, label: "Failed posts", note: `${FAILED_POSTS.filter((p) => p.retry).length} can be retried now`, icon: "send", bg: "linear-gradient(135deg,#ff7aa8,#e8005a)", tone: "amber" },
  ];

  const mine = [
    ...TICKETS.filter((t) => t.owner === ME && (t.late || t.tasks.some((x) => x.state === "Failed" || x.state === "Person"))).map((t) => ({
      key: t.id, href: "/admin/tap", title: `${t.id} · ${t.shop}`, note: t.late ? "Review is 2 days over" : "1 task failed, 1 waiting for you in Partner Center", tone: "bad" as const, tag: t.late ? "Overdue" : "Fix task",
    })),
    ...DISPUTES.filter((d) => d.owner === ME && d.status !== "Resolved").map((d) => ({
      key: d.id, href: "/admin/support", title: `${d.id} · ${d.title}`, note: `${d.creator} · due ${d.due}`, tone: d.late ? ("bad" as const) : ("warn" as const), tag: d.late ? "Due today" : d.status,
    })),
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Today</h1>
        <p className="v2-muted" style={{ margin: "4px 0 0" }}>{TODAY_LABEL} · Good morning, {ME}. Here&apos;s what&apos;s stuck right now.</p>
      </div>

      {recon.length > 0 && (
        <div className="v2-alert red" role="alert">
          <Icon name="alert" size={20} />
          <span>Reconciliation: {recon.length} days don&apos;t match. 27 Oct: wallets are 120 credits above the ledger.</span>
          <Link href="/admin/accounts/reconcile">Open reconciliation</Link>
        </div>
      )}

      <section className="v2-stack" aria-label="Queues">
        <div className="v2-card-h">
          <h2 className="v2-h2">Needs a person</h2>
          <span className="v2-small">Updated 10:42 · counts refresh every minute</span>
        </div>
        <div className="ad-queues">
          {queues.map((q) => (
            <Link key={q.label} href={q.href} className={`ad-queue ${q.tone ?? ""}`}>
              <span className="ad-qtop">
                <span className="ad-qico" style={{ background: q.bg }}><Icon name={q.icon} size={19} /></span>
                <span className="n"><Count value={q.n} /></span>
                <span><Icon name="arrow" size={18} /></span>
              </span>
              <b>{q.label}</b>
              <small>{q.note}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="v2-stack" aria-label="Today's numbers">
        <div className="v2-card-h">
          <h2 className="v2-h2">Today&apos;s numbers</h2>
          <Link href="/admin/analytics" className="v2-link">Analytics</Link>
        </div>
        <div className="ad-kpis">
          {KPIS.map((k) => (
            <div key={k.label} className="ad-kpi">
              <small>{k.label}</small>
              <b><Count value={k.value} format={k.money ? (n) => rm(n, 0) : undefined} /></b>
              <em>
                <span className={k.delta >= 0 ? "ad-up" : "ad-down"}>{k.delta >= 0 ? "+" : ""}{k.delta}%</span> vs yesterday
              </em>
              <Spark values={k.series} tone={k.delta >= 0 ? "up" : "down"} />
              <em>{k.note}</em>
            </div>
          ))}
        </div>
        <Meta range="Today 00:00–10:42, trend = last 14 days" source="Rezekii events, TikTok Partner data (GMV, daily)" />
      </section>

      <div className="v2-grid2">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Assigned to you</h2>
            <span className="badge">{mine.length}</span>
          </div>
          <div className="ad-list">
            {mine.map((m) => (
              <Link key={m.key} href={m.href} className="ad-row ad-rowbtn click" style={{ textDecoration: "none" }}>
                <span className="main">
                  <b>{m.title}</b>
                  <small>{m.note}</small>
                </span>
                <Pill tone={m.tone}>{m.tag}</Pill>
              </Link>
            ))}
          </div>
        </section>

        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Latest staff actions</h2>
            <Link href="/admin/system/audit">Audit log</Link>
          </div>
          <div className="ad-list">
            {AUDIT.slice(0, 5).map((a) => (
              <div key={a.id} className="ad-row">
                <Av name={a.who} size={32} />
                <span className="main">
                  <b>{a.who} · {a.action}</b>
                  <small>{a.target} · {a.when}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
