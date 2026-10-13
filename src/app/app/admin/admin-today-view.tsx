"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminToday, Need } from "@/modules/admin/today.ts";
import type { CalStatus } from "@/modules/admin/posts.ts";
import { n } from "../marketplace/format";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import "../marketplace/marketplace.css";
import "../today.css";
import "../links/links.css";
import "./admin.css";

const ICON: Record<Need["kind"], [string, string, string]> = {
  failed: ["M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", "var(--rsoft)", "var(--red)"],
  unconfirmed: ["M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", "var(--asoft)", "var(--amber)"],
  reconnect: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1", "var(--bsoft)", "var(--blue)"],
};
/** [label, background, text, edge] per calendar status, as in the mockup legend. */
export const STATUS_LOOK: Record<CalStatus, [string, string, string, string]> = {
  published: ["Published", "#00c073", "#0d1117", "#00c073"],
  scheduled: ["Scheduled", "var(--surface)", "var(--text)", "var(--border)"],
  sending: ["Sending", "var(--surface)", "var(--text)", "var(--border)"],
  unconfirmed: ["Unconfirmed", "#f59e0b", "#0d1117", "#f59e0b"],
  failed: ["Failed", "#b42318", "#ffffff", "#b42318"],
  paused: ["Paused", "var(--bsoft)", "var(--blue)", "var(--blue)"],
};
const LEGEND: CalStatus[] = ["published", "scheduled", "unconfirmed", "failed", "paused"];
const rmc = (v: number) => `RM${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const big = (v: number) => (v >= 1e6 ? `RM${(v / 1e6).toFixed(2)}M` : `RM${n(v)}`);

/** The admin Today page, as designed in the mockup (AdminToday). */
export function AdminTodayView({ d }: { d: AdminToday }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const used = Math.min(d.places, 25);
  const c = d.commission;

  async function markPublished(id: string) {
    setBusy(id);
    const r = await fetch(`/api/admin/posts/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "published" }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r.ok) return flash(j.error || "Could not mark it published.", false);
    flash("Marked as published");
    router.refresh();
  }

  const stats = [
    { label: "Posts today", value: n(d.stats.posts), note: d.stats.postsNote, href: "/app/admin/calendar" },
    { label: "Links made today", value: n(d.stats.linksToday), note: "by all creators", href: "/app/admin/stats" },
    { label: "Samples waiting", value: n(d.stats.samplesWaiting), note: "apply in TikTok Shop", href: "/app/admin/samples" },
    { label: "Creator accounts", value: n(d.stats.creators), note: `${d.stats.creatorsShop} linked to TikTok Shop`, href: "/app/admin/accounts" },
  ];
  const needCount = d.needs.length + d.stats.samplesWaiting;

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="nv-title">{d.hello}</h1>
          <p className="nv-sub">{d.sub}</p>
        </div>
        <span className="ad-pill">{needCount} {needCount === 1 ? "thing needs" : "things need"} you</span>
      </div>

      <section className="nv-up nv-card" aria-label="Today at a glance" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "22px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
        {stats.map((st) => (
          <Link key={st.label} href={st.href} className="nv-row" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 18px", borderRadius: 16, textDecoration: "none", color: "var(--text)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{st.label}</span>
            <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{st.value}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{st.note}</span>
          </Link>
        ))}
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "999 1 600px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="nv-up nv-card" aria-labelledby="atneed" style={{ animationDelay: "60ms", overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 10px", display: "flex", alignItems: "center", gap: 10 }}>
              <h2 id="atneed" className="nv-h2" style={{ flex: 1 }}>Needs action</h2>
              {!d.needs.length && <span className="nv-badge b-green">All clear</span>}
            </div>
            {d.needs.map((r, i) => {
              const [icon, tint, ink] = ICON[r.kind];
              return (
                <div key={i} className="nv-row" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "14px 22px", borderTop: "1px solid var(--line)" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: tint, color: ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{r.title}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{r.detail}</span>
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    {!r.techwide && <span style={{ fontSize: 13, color: "var(--muted)" }}>Creator&apos;s account · they act on it</span>}
                    {r.techwide && r.kind === "unconfirmed" && r.postId && (
                      <button type="button" className="nv-btn2 nv-sm nv-press" disabled={busy === r.postId} onClick={() => markPublished(r.postId!)}>It&apos;s live · mark published</button>
                    )}
                    {r.techwide && r.kind !== "reconnect" && r.postId && (
                      <Link href={`/app/admin/calendar?post=${r.postId}`} className="nv-btn nv-sm nv-press" style={{ textDecoration: "none" }}>{r.kind === "failed" ? "Reschedule" : "Open"}</Link>
                    )}
                    {r.techwide && r.kind === "reconnect" && <a href="/api/auth/tiktok/start" className="nv-btn nv-sm nv-press" style={{ textDecoration: "none" }}>Reconnect now</a>}
                  </span>
                </div>
              );
            })}
          </section>

          <section className="nv-up nv-card" aria-labelledby="attime" style={{ animationDelay: "120ms", padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <h2 id="attime" className="nv-h2">Today&apos;s posts</h2>
              <Link href="/app/admin/calendar" className="nv-link">Open calendar</Link>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
              {LEGEND.map((k) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_LOOK[k][1], border: `1px solid ${STATUS_LOOK[k][3]}` }} />{STATUS_LOOK[k][0]}</span>
              ))}
            </span>
            {d.timeline.length ? (
              <div className="nv-scrollx">
                <div style={{ minWidth: 640, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                    <span />
                    <span style={{ display: "flex", justifyContent: "space-between" }}><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></span>
                  </div>
                  {d.timeline.map((row) => (
                    <div key={row.handle} style={{ display: "grid", gridTemplateColumns: "170px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.handle}</span>
                      <span style={{ position: "relative", height: 34, borderRadius: 10, background: "var(--surface2)" }}>
                        <span aria-hidden="true" style={{ position: "absolute", top: -4, bottom: -4, left: `${d.nowLeft}%`, width: 2, background: "#00c073", borderRadius: 2 }} />
                        {row.posts.map((p, i) => {
                          const [, bg, fg, edge] = STATUS_LOOK[p.status];
                          return (
                            <span key={i} title={`${p.time} · ${STATUS_LOOK[p.status][0]} · ${p.title}`} style={{ position: "absolute", top: 6, left: `${p.left}%`, transform: "translateX(-50%)", height: 22, padding: "0 9px", borderRadius: 7, background: bg, color: fg, border: `1px solid ${edge}`, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                              {p.time}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", fontSize: 11, fontWeight: 700, color: "var(--gink)" }}>
                    <span />
                    <span style={{ position: "relative", height: 14 }}>
                      <span style={{ position: "absolute", left: `${d.nowLeft}%`, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span className="nv-dot" aria-hidden="true" />{d.nowLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 14, color: "var(--muted)" }}>No posts today on any account.</span>
            )}
          </section>

          <section className="nv-up nv-card" aria-labelledby="atsmp" style={{ animationDelay: "180ms", overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 14px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 id="atsmp" className="nv-h2">Sample requests waiting</h2>
              <Link href="/app/admin/samples" className="nv-link">Sample queue</Link>
            </div>
            {d.samples.map((s) => (
              <div key={s.id} className="nv-row" style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }} />
                ) : (
                  <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface2)" }} />
                )}
                <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.product}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.who} · asked {new Date(s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}</span>
                </span>
                <Link href="/app/admin/samples" className="nv-btn nv-sm nv-press" style={{ textDecoration: "none" }}>Review</Link>
              </div>
            ))}
            {!d.samples.length && <div style={{ padding: 22, borderTop: "1px solid var(--line)", color: "var(--muted)", fontSize: 14 }}>No sample requests waiting. Nice work.</div>}
          </section>
        </div>

        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 24 }}>
          <Link href="/app/admin/accounts" className="nv-up nv-card nv-hover" aria-label={`${used} of 25 TikTok Shop places used`} style={{ animationDelay: "100ms", padding: 22, display: "flex", alignItems: "center", gap: 18, textDecoration: "none", color: "var(--text)" }}>
            <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--seg)" strokeWidth="10" />
              <circle cx="48" cy="48" r="40" fill="none" stroke={used >= 25 ? "#f59e0b" : "#00c073"} strokeWidth="10" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset={251.3 * (1 - used / 25)} transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} />
              <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="800" fill="currentColor" fontFamily="Albert Sans, sans-serif">{used}/25</text>
            </svg>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>TikTok Shop places</span>
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                {used >= 25 ? "All 25 places are taken until TikTok reviews Rezekii's Shop app." : `${25 - used} of 25 places free. Each account that links TikTok Shop takes one while the app is in beta.`}
              </span>
            </span>
          </Link>

          <section className="nv-up nv-card" aria-labelledby="athealth" style={{ animationDelay: "160ms", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 8px" }}>
              <h2 id="athealth" className="nv-cap">System health</h2>
              <Link href="/app/admin/settings?tab=health" className="nv-link" style={{ fontSize: 13 }}>Details</Link>
            </div>
            {d.health.map((h, i) => (
              <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 22px", borderTop: i ? "1px solid var(--line)" : 0 }}>
                <span className={h.ok ? "nv-dot" : "nv-dotr"} aria-hidden="true" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{h.label}</span>
                <span style={{ fontSize: 13, color: "var(--muted)", textAlign: "right" }}>{h.value}</span>
              </div>
            ))}
          </section>

          <section className="nv-up nv-card" aria-labelledby="attap" style={{ animationDelay: "220ms", padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 id="attap" className="nv-h2" style={{ fontSize: 17 }}>TAP campaigns</h2>
              <Link href="/app/admin/tap" className="nv-link" style={{ fontSize: 13 }}>Open</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <Link href="/app/admin/tap" style={{ background: "var(--surface2)", borderRadius: 16, padding: 14, textDecoration: "none", color: "var(--text)" }}>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{n(d.tapLive)}</div><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>TAP products live</div>
              </Link>
              <Link href="/app/admin/samples" style={{ background: "var(--asoft)", borderRadius: 16, padding: 14, textDecoration: "none", color: "var(--amber)" }}>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{n(d.stats.samplesWaiting)}</div><div style={{ fontSize: 12, fontWeight: 700 }}>Samples to apply for</div>
              </Link>
            </div>
            <a href="https://partner.tiktokshop.com" target="_blank" rel="noreferrer" className="nv-link" style={{ fontSize: 14 }}>Open Partner Center ↗</a>
          </section>

          <section className="nv-up nv-card" aria-labelledby="atcom" style={{ animationDelay: "260ms", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 id="atcom" className="nv-h2" style={{ fontSize: 17 }}>Techwide commission</h2>
              <span className="nv-badge b-gray">Admins only</span>
            </div>
            {c.hasSettled ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <div style={{ background: "var(--gsoft)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12, color: "var(--gink)", fontWeight: 700 }}>Estimated · paid orders</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "var(--gink)", fontVariantNumeric: "tabular-nums" }}>{rmc(c.est)}</span>
                    <span style={{ fontSize: 12, color: "var(--gink)" }}>on {big(c.gmvPaid)} GMV</span>
                  </div>
                  <div style={{ background: "var(--surface2)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Settled orders</span>
                    <span style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{rmc(c.settled)}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>on {big(c.gmvSettled)} GMV</span>
                  </div>
                </div>
                {c.top.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="nv-cap">Top campaigns by estimated commission</span>
                    {c.top.map((ct) => (
                      <div key={ct.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                          <span style={{ fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ct.name}</span>
                          <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rmc(ct.est)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "var(--seg)", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${((ct.est / c.top[0].est) * 100).toFixed(1)}%`, background: "#00c073", borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  TikTok&apos;s partner commission across all {c.campaigns} TAP campaigns since each started{c.asOf ? `, pulled ${new Date(`${c.asOf}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : ""}. Never shown to creators.
                </span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>Commission figures appear after the next daily refresh reads them from TikTok.</span>
            )}
          </section>
        </div>
      </div>
      <Hud toast={toast} />
    </>
  );
}
