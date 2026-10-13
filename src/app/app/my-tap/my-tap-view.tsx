"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SampleRequest } from "@/modules/tap/samples.ts";
import "../marketplace/marketplace.css";
import "./my-tap.css";

/** Sample stage, as in the mockup: 1 requested, 2 shipped, 3 delivered (to post), 4 posted, -1 cancelled, 0 selling without a sample. */
const stageOf = (r: SampleRequest): number => (r.status === "rejected" || r.status === "cancelled" ? -1 : 1);
const LOOK: Record<string, [string, string, string]> = {
  "1": ["Sample requested", "var(--bsoft)", "var(--blue)"],
  "-1": ["Sample cancelled", "var(--surface2)", "var(--muted)"],
};
const TABS: [string, (r: SampleRequest) => boolean][] = [
  ["All", () => true],
  ["Samples on the way", (r) => [1, 2].includes(stageOf(r))],
  ["To post", (r) => stageOf(r) === 3],
  ["Posted", (r) => stageOf(r) === 4],
  ["Selling, no sample", (r) => stageOf(r) === 0],
];
const dt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
const events = (r: SampleRequest): [string, string][] =>
  [
    ["Requested on Rezekii · Techwide applies for you next", r.created_at] as [string, string],
    ...(r.status === "applied" ? [["Techwide applied for it in TikTok Shop", r.updated_at] as [string, string]] : []),
    ...(r.status === "rejected" ? [[`Techwide could not apply${r.note ? `: ${r.note}` : ""}`, r.updated_at] as [string, string]] : []),
  ].reverse();

function Thumb({ r }: { r: SampleRequest }) {
  return r.image ? (
    <span className="mt-ph" aria-hidden="true" style={{ backgroundImage: `url("${r.image}")` }} />
  ) : (
    <span className="mt-ph" aria-hidden="true" style={{ background: "linear-gradient(135deg,#00874f,#0b1210)" }}>{(r.shop || "?")[0].toUpperCase()}</span>
  );
}

/** My TAP products from the mockup. Today it lists the free samples requested on Rezekii; TikTok's sales, shipping and posts are added next. */
export function MyTapView({ rows }: { rows: SampleRequest[] }) {
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(1);
  const [panel, setPanel] = useState<SampleRequest | null>(null);
  const [closing, setClosing] = useState(false);

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
  const list = rows.filter(TABS[tab][1]).filter((r) => !term || `${r.product_name} ${r.shop ?? ""}`.toLowerCase().includes(term));
  const shown = list.slice(0, pg * 15);
  const onWay = rows.filter((r) => [1, 2].includes(stageOf(r))).length;
  const sums: [string, string, string][] = [
    ["Products promoting", rows.length.toLocaleString("en-US"), "From Rezekii TAP campaigns"],
    ["Sales", "—", "What buyers paid through your links"],
    ["Samples", rows.filter((r) => stageOf(r) > 0).length.toLocaleString("en-US"), `${onWay} on the way · 0 to post`],
    ["Content posted", "—", "Videos and LIVEs, each counted once"],
  ];
  const look = (r: SampleRequest) => LOOK[String(stageOf(r))];

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
            const [status, bg, fg] = look(r);
            const g = stageOf(r);
            const steps: [string, string][] = [["Requested", g >= 1 ? dt(r.created_at) : ""], ["Shipped", ""], ["Delivered", ""], ["Posted", ""]];
            return (
              <button key={r.id} type="button" className="mt-card" onClick={() => { setClosing(false); setPanel(r); }} aria-label={`Details for ${r.product_name}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <Thumb r={r} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="mt-pill" style={{ background: bg, color: fg }}>{status}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.shop}</span>
                  </span>
                  <strong style={{ fontSize: 15, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.product_name}</strong>
                  {g > 0 && (
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
                  <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>—</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Sales from TikTok soon</span>
                </span>
              </button>
            );
          })}
        </div>
        {shown.length < list.length && (
          <div><button type="button" className="nv-btn2 nv-press" style={{ height: 36, padding: "0 13px", fontSize: 13, borderRadius: 10 }} onClick={() => setPg(pg + 1)}>Show {Math.min(15, list.length - shown.length)} more</button></div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          Free samples you request on Rezekii show here first; Techwide applies for each one in TikTok Shop. Sales, shipping and your posts come from TikTok and are being added next.
        </p>
      </section>

      {panel && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="mtpt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="mt-pill" style={{ background: look(panel)[1], color: look(panel)[2] }}>{look(panel)[0]}</span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <h3 id="mtpt" style={{ margin: 0, fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}>{panel.product_name}</h3>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{panel.shop}</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {["Sales", "Orders", "Videos", "LIVEs"].map((k) => (
                <div key={k} style={{ background: "var(--surface2)", borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>—</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="nv-cap">Sample tracking · TikTok Shop logistics</span>
              {events(panel).map(([title, when], k) => (
                <div key={k} className="mt-ev">
                  <span className={`mt-dot ${k === 0 ? "on" : ""}`} aria-hidden="true" />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{title}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{dt(when)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="nv-cap">Your content for this product</span>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Your videos and LIVEs from TikTok will show here.</span>
            </div>
            <Link href={`/app/marketplace/${panel.product_id}`} className="nv-btn2 nv-press" style={{ height: 50 }}>Open product</Link>
            <a href={`https://shop.tiktok.com/view/product/${panel.product_id}?region=MY`} target="_blank" rel="noopener" className="nv-btn2 nv-press" style={{ height: 50 }}>Open on TikTok Shop</a>
          </div>
        </>
      )}
    </>
  );
}
