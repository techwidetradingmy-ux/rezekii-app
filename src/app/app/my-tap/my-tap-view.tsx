"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rowLook, statusLook, type MyTapRow } from "@/modules/tap/stages.ts";
import type { SellerSample } from "@/modules/tap/samples.ts";
import type { MyTapDetail } from "@/modules/tap/mytap.ts";
import { n, rmx, short, tiktokProductUrl } from "../marketplace/format";
import "../marketplace/marketplace.css";
import "./my-tap.css";

const TABS: [string, (r: MyTapRow) => boolean][] = [
  ["All", () => true],
  ["Samples on the way", (r) => [1, 2].includes(r.stage)],
  ["To post", (r) => r.stage === 3],
  ["Posted", (r) => r.stage === 4],
  ["Selling, no sample", (r) => r.stage === 0 && !r.request],
];
/** TikTok's tracking events, in words (as in the mockup). */
const EVN: Record<string, string> = {
  REZEKII_REQUEST: "Asked on Rezekii before samples moved to TikTok · tap Request free sample to send it to TikTok",
  TIKTOK_REQUEST: "TikTok's sample page opened with Techwide's TAP campaign · TikTok's status shows here once you submit it",
  TECHWIDE_APPLIED: "Techwide applied for it in TikTok Shop",
  ORDER_PLACED: "Sample ordered",
  ORDER_PACKED_AND_READY_FOR_DROP_OFF_AT_CARRIERS_FACILITY: "Packed and handed to the courier",
  OUT_FOR_DELIVERY: "Out for delivery",
  THE_PACKAGE_HAS_BEEN_DELIVERED: "Delivered",
};
const dt = (unix: number) => (unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : "");
const isoUnix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const plural = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
const contentText = (r: MyTapRow) => `${plural(r.videos, "video", "videos")} · ${plural(r.lives, "LIVE", "LIVEs")}`;
/** Order: Rezekii requests, then waiting for a post, samples on the way, posted, the rest; then by sales. */
const pri = (r: MyTapRow) => (r.request ? -1 : r.stage === 3 ? 0 : r.stage === 1 || r.stage === 2 ? 1 : r.stage === 4 ? 2 : 3);

function requestEvents(r: MyTapRow): [string, number][] {
  const q = r.request!;
  // Requests made in TikTok through the TAP campaign (Request sample) have no Techwide step.
  if (q.note?.startsWith("Requested in TikTok")) return [["TIKTOK_REQUEST", isoUnix(q.createdAt)]];
  const ev: [string, number][] = [["REZEKII_REQUEST", isoUnix(q.createdAt)]];
  if (q.status === "applied") ev.push(["TECHWIDE_APPLIED", isoUnix(q.updatedAt)]);
  if (q.status === "rejected") ev.push([`Techwide could not apply${q.note ? `: ${q.note}` : ""}`, isoUnix(q.updatedAt)]);
  return ev.reverse();
}

function Thumb({ r }: { r: MyTapRow }) {
  return r.image ? (
    <span className="mt-ph" aria-hidden="true" style={{ backgroundImage: `url("${r.image}")` }} />
  ) : (
    <span className="mt-ph" aria-hidden="true" style={{ background: "linear-gradient(135deg,#00874f,#0b1210)" }}>{(r.shop || "?")[0].toUpperCase()}</span>
  );
}

/** My TAP products from the mockup: every Techwide TAP product the creator promotes, with sales, samples and posts from TikTok. */
export function MyTapView({ rows, hasTikTok }: { rows: MyTapRow[]; hasTikTok: boolean }) {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(1);
  const [panel, setPanel] = useState<MyTapRow | null>(null);
  const [closing, setClosing] = useState(false);
  const [detail, setDetail] = useState<{ key: string; data: MyTapDetail | null; error: string } | null>(null);
  // Samples asked for directly from sellers (not through Techwide's TAP campaigns), from TikTok, after the page opens.
  const [seller, setSeller] = useState<SellerSample[]>([]);
  useEffect(() => {
    fetch("/api/tap/samples?from=seller", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { samples?: SellerSample[] }) => setSeller(d.samples ?? []))
      .catch(() => {});
  }, []);

  const openPanel = (r: MyTapRow) => {
    setClosing(false);
    setPanel(r);
    if (!r.campaignId || detail?.key === r.key) return;
    setDetail({ key: r.key, data: null, error: "" });
    fetch(`/api/tap/my-tap?campaign=${r.campaignId}&product=${r.productId}`)
      .then(async (res) => {
        const d = (await res.json().catch(() => ({}))) as MyTapDetail & { error?: string };
        setDetail({ key: r.key, data: res.ok ? d : null, error: res.ok ? "" : d.error || "TikTok could not load this right now." });
      })
      .catch(() => setDetail({ key: r.key, data: null, error: "TikTok could not load this right now." }));
  };
  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setPanel(null);
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const term = q.trim().toLowerCase();
  const list = rows.filter(TABS[tab][1]).filter((r) => !term || `${r.name} ${r.shop}`.toLowerCase().includes(term)).sort((a, b) => pri(a) - pri(b) || b.paid - a.paid);
  const shown = list.slice(0, pg * 15);
  const videos = rows.reduce((a, r) => a + r.videos, 0);
  const lives = rows.reduce((a, r) => a + r.lives, 0);
  const due = rows.filter((r) => r.stage === 3).length;
  const sums: [string, string, string][] = [
    ["Products promoting", n(rows.length), "From Rezekii TAP campaigns"],
    ["Sales", rmx(rows.reduce((a, r) => a + r.paid, 0)), "What buyers paid through your links"],
    ["Samples", n(rows.filter((r) => r.stage > 0).length), `${rows.filter((r) => [1, 2].includes(r.stage)).length} on the way · ${due} to post`],
    ["Content posted", n(videos + lives), `${videos.toLocaleString("en-US")} videos · ${lives.toLocaleString("en-US")} LIVEs`],
  ];
  const d = panel && detail?.key === panel.key ? detail : null;
  const events: [string, number][] = panel ? (panel.request ? requestEvents(panel) : (d?.data?.events ?? [])) : [];

  return (
    <>
      <div className="mt-sum">
        {sums.map(([k, v, note]) => (
          <div key={k} className="mt-stat">
            <span className="nv-cap">{k}</span>
            <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{note}</span>
          </div>
        ))}
      </div>

      {due > 0 && (
        <div className="mt-alert" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M12 8v5M12 16h.01" /><circle cx="12" cy="12" r="9" /></svg>
          <span>{`${due} ${due === 1 ? "sample is" : "samples are"} waiting for your post. TikTok marks each one completed once you post.`}</span>
        </div>
      )}

      <section className="nv-card" aria-label="Your TAP products" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="fb-row">
          <div className="nv-noscroll" role="group" aria-label="Status" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {TABS.map(([label, fn], i) => (
              <button key={label} type="button" className={`nv-chip nv-press ${tab === i ? "on" : ""}`} aria-pressed={tab === i} onClick={() => { setTab(i); setPg(1); }}>
                {label} <span style={{ opacity: 0.7 }}>{rows.filter(fn).length}</span>
              </button>
            ))}
          </div>
          <span style={{ flex: "1 1 0" }} />
          <div className="fb-search" style={{ flex: "0 1 280px" }}>
            <input type="search" className="nv-input" aria-label="Search your products" placeholder="Search your products" value={q} onChange={(e) => { setQ(e.target.value); setPg(1); }} />
          </div>
        </div>
        {list.length === 0 && (
          <span style={{ padding: "24px 6px", color: "var(--muted)" }}>
            {rows.length ? "Nothing in this group." : <>No TAP products yet. Add some from the <Link href="/app/marketplace" className="nv-link">TAP Marketplace</Link>.</>}
          </span>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map((r, i) => {
            const [status, bg, fg] = rowLook(r);
            const requested = r.request ? dt(isoUnix(r.request.createdAt)) : "Done";
            const steps: [string, string][] = [["Requested", r.stage >= 1 ? requested : ""], ["Shipped", r.stage >= 2 ? "Done" : ""], ["Delivered", r.stage >= 3 ? "Done" : ""], ["Posted", r.stage >= 4 ? "Done" : ""]];
            return (
              <button key={r.key} type="button" className="mt-card" onClick={() => openPanel(r)} aria-label={`Details for ${r.name}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <Thumb r={r} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="mt-pill" style={{ background: bg, color: fg }}>{status}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.shop}</span>
                  </span>
                  <strong style={{ fontSize: 15, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.name}</strong>
                  {r.stage !== 0 && r.stage !== -1 && (
                    <span className="mt-steps">
                      {steps.map(([lab, when], k) => (
                        <span key={lab} className="mt-step">
                          <span className="mt-bar"><span style={{ width: when ? "100%" : "0%", animationDelay: `${k * 120}ms` }} /></span>
                          <span className={`mt-sl ${when ? "on" : ""}`}>{when ? `${lab} · ${when}` : lab}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="mt-right">
                  <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rmx(r.paid)}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{contentText(r)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {shown.length < list.length && (
          <div><button type="button" className="nv-btn2 nv-press" style={{ height: 36, padding: "0 13px", fontSize: 13, borderRadius: 10 }} onClick={() => setPg(pg + 1)}>Show {Math.min(15, list.length - shown.length)} more</button></div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          {hasTikTok
            ? "Every status comes straight from TikTok: a sample shows as completed once you post a video or LIVE for it, and TikTok tracks late samples itself. Sales are what buyers paid through your links in Techwide's TAP campaigns, from TikTok's campaign data."
            : "Sign in with TikTok to see the products you promote, with your sales, samples and posts from TikTok. Samples you request on Rezekii show here either way."}
        </p>
      </section>

      {seller.length > 0 && (
        <section className="nv-card" aria-labelledby="mtseller" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="mtseller" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Samples from sellers</h2>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Asked for directly in TikTok Shop, not through Techwide&apos;s TAP campaigns. Shown here so you can track every sample in one place.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {seller.map((x) => {
              const [label, bg, fg] = statusLook(x.status);
              return (
                <a key={x.id} href={tiktokProductUrl(x.productId)} target="_blank" rel="noopener" className="mt-card" style={{ textDecoration: "none", color: "var(--text)" }}>
                  <span className="mt-ph" aria-hidden="true" style={x.image ? { backgroundImage: `url("${x.image}")` } : undefined} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="mt-pill" style={{ background: bg, color: fg }}>{label}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{[x.shop, x.variant].filter(Boolean).join(" · ")}</span>
                    </span>
                    <strong style={{ fontSize: 15, lineHeight: 1.35 }}>{x.name}</strong>
                  </span>
                  <span className="mt-right">
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{x.dueAt ? `Post by ${dt(x.dueAt)}` : "From the seller"}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {panel && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="mtpt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="mt-pill" style={{ background: rowLook(panel)[1], color: rowLook(panel)[2] }}>{rowLook(panel)[0]}</span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <h3 id="mtpt" style={{ margin: 0, fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}>{panel.name}</h3>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{panel.shop}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {([
                ["Sales", rmx(panel.paid)],
                ["Orders", d?.data ? n(d.data.content.reduce((a, c) => a + c[3], 0)) : panel.campaignId && !d?.error ? "…" : "0"],
                ["Videos", String(panel.videos)],
                ["LIVEs", String(panel.lives)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: "var(--surface2)", borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{v}</span>
                </div>
              ))}
            </div>
            {events.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="nv-cap">Sample tracking · {d?.data?.carrier || "TikTok Shop logistics"}</span>
                {events.map(([title, when], k) => (
                  <div key={k} className="mt-ev">
                    <span className={`mt-dot ${k === 0 ? "on" : ""}`} aria-hidden="true" />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{EVN[title] || title}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{dt(when)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="nv-cap">Your content for this product</span>
              {panel.campaignId && !d?.data && !d?.error && <span style={{ fontSize: 14, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><span className="nv-spin" aria-hidden="true" style={{ width: 14, height: 14 }} />Loading from TikTok…</span>}
              {d?.error && <span style={{ fontSize: 14, color: "var(--red)" }}>{d.error}</span>}
              {(!panel.campaignId || (d?.data && d.data.content.length === 0)) && <span style={{ fontSize: 14, color: "var(--muted)" }}>Nothing posted yet.</span>}
              {d?.data?.content.map(([kind, when, views, orders, paid], k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--surface2)" }}>
                  <span className="mt-pill" style={{ background: kind === "VIDEO" ? "#00874f" : "#7c3aed", color: "#ffffff" }}>{kind === "VIDEO" ? "Video" : "LIVE"}</span>
                  <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{dt(when) || "Date not given"}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{`${short(views)} views · ${orders} orders · ${rmx(paid)}`}</span>
                </div>
              ))}
            </div>
            <a href={tiktokProductUrl(panel.productId)} target="_blank" rel="noopener" className="nv-btn2 nv-press" style={{ height: 50 }}>Open on TikTok Shop</a>
          </div>
        </>
      )}
    </>
  );
}
