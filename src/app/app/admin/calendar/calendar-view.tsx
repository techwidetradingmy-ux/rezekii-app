"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CalPost, CalWeek } from "@/modules/admin/posts.ts";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import { STATUS_LOOK } from "../admin-today-view";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../links/links.css";
import "../../accounts/accounts.css";
import "../admin.css";

const COLORS = ["#00c073", "#7c3aed", "#0e7490", "#b45309", "#be185d", "#334155", "#0369a1", "#a16207"];
const LEGEND = ["published", "scheduled", "unconfirmed", "failed", "paused"] as const;
const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
const MYT = 8 * 3600_000;
const hhmm = (iso: string) => new Date(Date.parse(iso) + MYT).toISOString().slice(11, 16);
const dayKey = (iso: string) => new Date(Date.parse(iso) + MYT).toISOString().slice(0, 10);
const label12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

function Cover({ p, w }: { p: CalPost; w: number }) {
  return p.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.cover} alt="" style={{ width: w, height: w, borderRadius: w / 4, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: w, height: w, borderRadius: w / 4, background: "#0d1117", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={w * 0.55} height={w * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4zM10 9l5 3-5 3z" /></svg>
    </span>
  );
}

/** The admin calendar, as designed in the mockup: every post on every account, by week, as a grid or a list. */
export function CalendarView({ week, posts, now, times, startPost, startAccount }: { week: CalWeek; posts: CalPost[]; now: number; times: string[]; startPost: string | null; startAccount: string | null }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const [view, setView] = useState<0 | 1>(0);
  const [accs, setAccs] = useState<string[]>(startAccount ? [startAccount] : ["all"]);
  const first = posts.find((p) => p.id === startPost) ?? null;
  const [open, setOpen] = useState<CalPost | null>(first);
  const [closing, setClosing] = useState(false);
  const [mvDay, setMvDay] = useState(() => (first && dayKey(first.at) > week.todayKey ? dayKey(first.at) : week.todayKey));
  const [mvTime, setMvTime] = useState(() => (first ? hhmm(first.at) : times[0] ?? "12:00"));
  const [alert, setAlert] = useState(false);
  const [busy, setBusy] = useState(false);

  const accounts = [...new Map(posts.map((p) => [p.openId, p.handle])).entries()];
  const colorOf = (openId: string) => COLORS[Math.max(0, accounts.findIndex(([id]) => id === openId)) % COLORS.length];
  const showAll = accs.includes("all");
  const vis = posts.filter((p) => showAll || accs.includes(p.openId));
  const rowTimes = [...new Set([...times, ...vis.map((p) => hhmm(p.at))])].sort();
  const todayKey = week.todayKey;
  const moveDays = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(now + MYT + i * 86400_000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) };
  });

  const openPost = (p: CalPost) => {
    setClosing(false);
    setOpen(p);
    const k = dayKey(p.at);
    setMvDay(k >= todayKey ? k : todayKey);
    setMvTime(hhmm(p.at));
  };
  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const toggleAcc = (a: string) => {
    if (a === "all") return setAccs(["all"]);
    const next = accs.filter((x) => x !== "all");
    const out = next.includes(a) ? next.filter((x) => x !== a) : [...next, a];
    setAccs(out.length ? out : ["all"]);
  };

  async function act(action: "move" | "cancel" | "published") {
    if (!open || busy) return;
    const at = action === "move" ? new Date(Date.parse(`${mvDay}T${mvTime || "12:00"}:00+08:00`)).toISOString() : undefined;
    setBusy(true);
    const r = await fetch(`/api/admin/posts/${open.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, at }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setAlert(false);
    if (!r.ok) return flash(j.error || "Could not change the post.", false);
    flash(action === "move" ? `Scheduled for ${moveDays.find((d) => d.key === mvDay)?.label ?? mvDay} ${label12(mvTime)}` : action === "cancel" ? "Post cancelled and moved to Drafts" : "Marked as published");
    closePanel();
    router.refresh();
  }

  const nav = (o: number) => router.push(`/app/admin/calendar${o ? `?week=${o}` : ""}`);
  const sp = open;
  const canMove = !!sp && sp.techwide && ["scheduled", "failed", "paused"].includes(sp.status);
  const canCancel = !!sp && sp.techwide && ["scheduled", "failed", "paused"].includes(sp.status);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="nv-title">Calendar</h1>
          <p className="nv-sub">Every scheduled and published post, all accounts · Malaysia time</p>
        </div>
        <span style={{ display: "flex", gap: 8 }}>
          <Link href="/app/admin/drafts" className="nv-btn2 nv-press" style={{ height: 42, textDecoration: "none" }}>Drafts</Link>
          <Link href="/app/new" className="nv-btn nv-press" style={{ height: 42, textDecoration: "none" }}>+ New post</Link>
        </span>
      </div>

      <section className="nv-up nv-card" aria-label="Calendar controls" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" className="nv-btn2 nv-sm nv-press" aria-label="Previous week" onClick={() => nav(week.offset - 1)} style={{ width: 38, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span style={{ minWidth: 170, textAlign: "center", fontWeight: 800 }}>{week.label}</span>
          <button type="button" className="nv-btn2 nv-sm nv-press" aria-label="Next week" onClick={() => nav(week.offset + 1)} style={{ width: 38, padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          {week.offset !== 0 && <button type="button" className="nv-link" onClick={() => nav(0)} style={{ marginLeft: 6 }}>This week</button>}
        </span>
        <div className="nv-noscroll" role="group" aria-label="Accounts" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 200 }}>
          {[["all", "All accounts", "#9aa5b1"] as const, ...accounts.map(([id, h]) => [id, h, colorOf(id)] as const)].map(([v, label, color]) => (
            <button key={v} type="button" className={`nv-chip nv-press${accs.includes(v) ? " on" : ""}`} aria-pressed={accs.includes(v)} onClick={() => toggleAcc(v)}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />{label}
            </button>
          ))}
        </div>
        <div className="nv-seg" role="group" aria-label="View" style={{ width: 170 }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: view === 0 ? "translateX(0)" : "translateX(100%)" }} />
          <button type="button" className={view === 0 ? "on" : ""} aria-pressed={view === 0} onClick={() => setView(0)}>Week</button>
          <button type="button" className={view === 1 ? "on" : ""} aria-pressed={view === 1} onClick={() => setView(1)}>List</button>
        </div>
      </section>

      <span style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
        {LEGEND.map((k) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_LOOK[k][1], border: `1px solid ${STATUS_LOOK[k][3]}` }} />{STATUS_LOOK[k][0]}</span>
        ))}
        <span>· TikTok allows about 15 posts per account per day</span>
      </span>

      {view === 0 ? (
        <section className="nv-up nv-card nv-scrollx" aria-label="Week" style={{ padding: 0 }}>
          <div style={{ minWidth: 980, display: "grid", gridTemplateColumns: "88px repeat(7, minmax(0, 1fr))" }}>
            <span style={{ borderBottom: "1px solid var(--line)" }} />
            {week.days.map((d) => {
              const c = vis.filter((p) => dayKey(p.at) === d.key).length;
              const today = d.key === todayKey;
              return (
                <div key={d.key} style={{ padding: "14px 10px", borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)", background: today ? "var(--gsoft)" : "transparent", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: today ? "var(--gink)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{d.name}{today ? " · today" : ""}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: today ? "var(--gink)" : "var(--text)" }}>{d.date}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{c ? `${c} ${c === 1 ? "post" : "posts"}` : "—"}</span>
                </div>
              );
            })}
            {rowTimes.map((t) => (
              <div key={t} style={{ display: "contents" }}>
                <span style={{ padding: "12px 10px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                  {label12(t)}<br /><span style={{ fontWeight: 600 }}>{times.includes(t) ? "recommended" : "custom"}</span>
                </span>
                {week.days.map((d) => {
                  const cell = vis.filter((p) => dayKey(p.at) === d.key && hhmm(p.at) === t);
                  return (
                    <div key={d.key} style={{ minHeight: 92, padding: 6, borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)", background: d.key === todayKey ? "var(--gsoft)" : d.key < todayKey ? "var(--surface2)" : "transparent", display: "flex", flexDirection: "column", gap: 6 }}>
                      {cell.map((p) => {
                        const [stLabel, bg, fg, edge] = STATUS_LOOK[p.status];
                        return (
                          <button key={p.id} type="button" className="nv-press nv-up" onClick={() => openPost(p)} style={{ display: "flex", alignItems: "center", gap: 7, padding: 6, borderRadius: 10, border: `1.5px solid ${edge}`, background: bg, color: fg, textAlign: "left", width: "100%" }}>
                            <Cover p={p} w={26} />
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.handle.replace("@", "").slice(0, 14)}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{stLabel}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="nv-up nv-card" aria-label="List" style={{ overflow: "hidden" }}>
          {week.days.map((d) => {
            const dayPosts = vis.filter((p) => dayKey(p.at) === d.key).sort((a, b) => a.at.localeCompare(b.at));
            if (!dayPosts.length) return null;
            const today = d.key === todayKey;
            return (
              <div key={d.key}>
                <div style={{ padding: "12px 22px", background: "var(--surface2)", fontSize: 13, fontWeight: 800, color: today ? "var(--gink)" : "var(--text)" }}>{d.name}, {d.date} {d.month}{today ? " · Today" : ""}</div>
                {dayPosts.map((p) => (
                  <button key={p.id} type="button" className="nv-row" onClick={() => openPost(p)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", border: 0, borderTop: "1px solid var(--line)", background: "transparent", color: "var(--text)", textAlign: "left" }}>
                    <span style={{ width: 74, fontWeight: 800, fontSize: 14 }}>{label12(hhmm(p.at))}</span>
                    <Cover p={p} w={40} />
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.caption.split("\n")[0] || "No caption"}</span>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>{p.handle}</span>
                    </span>
                    <span className={`nv-badge ${p.status === "published" ? "b-green" : p.status === "failed" ? "b-red" : p.status === "unconfirmed" ? "b-amber" : p.status === "paused" ? "b-blue" : "b-gray"}`}>{STATUS_LOOK[p.status][0]}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {!vis.length && <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No posts for these accounts this week.</div>}
        </section>
      )}

      {sp && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="calpt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`nv-badge ${sp.status === "published" ? "b-green" : sp.status === "failed" ? "b-red" : sp.status === "unconfirmed" ? "b-amber" : sp.status === "paused" ? "b-blue" : "b-gray"}`}>{STATUS_LOOK[sp.status][0]}</span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 110, aspectRatio: "9 / 16", borderRadius: 16, overflow: "hidden", background: "#0d1117", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {sp.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sp.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                ) : (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v14H4zM10 9l5 3-5 3z" /></svg>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <h3 id="calpt" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{sp.handle}</h3>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>{new Date(sp.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" })}</span>
                <span style={{ fontSize: 14, lineHeight: 1.45, overflowWrap: "anywhere" }}>{sp.caption || "No caption"}</span>
                {sp.privacy && <span style={{ fontSize: 13, color: "var(--muted)" }}>Who can view: {PRIVACY[sp.privacy] ?? sp.privacy}</span>}
              </div>
            </div>
            {sp.status === "failed" && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--rsoft)", color: "var(--red)", fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{sp.error || "TikTok refused the post after 3 tries."}</div>}
            {sp.status === "unconfirmed" && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--asoft)", color: "var(--amber)", fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>Rezekii sent this to TikTok, but TikTok hasn&apos;t confirmed it. Check the account on TikTok before posting it again.</div>}
            {sp.status === "paused" && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--bsoft)", color: "var(--blue)", fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>Paused: this account&apos;s TikTok Connection expired. It posts as planned once the account is reconnected.</div>}
            {sp.status === "published" && (
              <>
                {sp.views !== null ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                    {([["Views", sp.views], ["Likes", sp.likes], ["Comments", sp.comments], ["Shares", sp.shares]] as const).map(([k, v]) => (
                      <div key={k} style={{ background: "var(--surface2)", borderRadius: 14, padding: 10, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800 }}>{shortCount(v ?? undefined)}</div><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{k}</div></div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Video numbers show after the next daily stats refresh{sp.privacy === "SELF_ONLY" ? " (TikTok only shares numbers for videos others can see)" : ""}.</span>
                )}
                {sp.shareUrl && <a href={sp.shareUrl} target="_blank" rel="noreferrer" className="nv-btn2 nv-press" style={{ textDecoration: "none" }}>View on TikTok ↗</a>}
              </>
            )}
            {!sp.techwide && <span style={{ fontSize: 13, color: "var(--muted)" }}>This is a creator&apos;s post. Only the creator can change it.</span>}
            {canMove && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 18, background: "var(--surface2)" }}>
                <span className="nv-label">{sp.status === "scheduled" ? "Change the time" : "Pick a new time"}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <label htmlFor="calday" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Day</label>
                  <select id="calday" className="nv-input" value={mvDay} onChange={(e) => setMvDay(e.target.value)} style={{ backgroundColor: "var(--surface)" }}>
                    {moveDays.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                  <label htmlFor="caltime" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Time</label>
                  <select id="caltime" className="nv-input" value={mvTime} onChange={(e) => setMvTime(e.target.value)} style={{ backgroundColor: "var(--surface)" }}>
                    {[...new Set([...times, mvTime].filter(Boolean))].sort().map((t) => <option key={t} value={t}>{label12(t)}{times.includes(t) ? " · recommended" : ""}</option>)}
                  </select>
                </div>
                <button type="button" className="nv-btn nv-press" disabled={busy} onClick={() => act("move")}>{sp.status === "scheduled" ? "Save new time" : "Reschedule"}</button>
              </div>
            )}
            {sp.techwide && sp.status === "unconfirmed" && <button type="button" className="nv-btn2 nv-press" disabled={busy} onClick={() => act("published")}>It&apos;s live on TikTok · mark published</button>}
            {canCancel && <button type="button" className="nv-link" onClick={() => setAlert(true)} style={{ color: "var(--red)", alignSelf: "flex-start" }}>Cancel this post</button>}
          </div>
        </>
      )}

      {alert && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Keep post" onClick={() => setAlert(false)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="calat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="calat" style={{ fontSize: 17, fontWeight: 700 }}>Cancel this post?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>It won&apos;t publish. The video stays in Drafts if you want it later.</span>
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(false)}>Keep</button>
              <button type="button" className="danger" disabled={busy} onClick={() => act("cancel")}>Cancel post</button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
