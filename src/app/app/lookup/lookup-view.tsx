"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LookupRow } from "@/modules/tap/convert.ts";
import { n, pct, perSale, priceText } from "../marketplace/format";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { copyText, downloadCsv } from "../links/file-tools";
import "../marketplace/marketplace.css";
import "../today.css";
import "../links/links.css";

const YES = "M5 12l5 5 9-10";
const NO = "M6 6l12 12M18 6 6 18";
const GIVES: [string, boolean][] = [
  ["Name, main image, price range", true],
  ["Commission rate, category, units sold", true],
  ["Shop name and whether it is in stock", true],
  ["Ratings, review text and extra listing images", false],
  ["Product videos and vouchers", false],
];
const COLS = "minmax(280px, 3fr) 120px 150px 90px 110px 100px";
const stockText = (r: LookupRow) => (r.stock !== null ? n(r.stock) : r.note === "Out of stock" ? "Out of stock" : r.source === "tiktok" ? "In stock" : "—");

function Thumb({ src, size, dim }: { src: string | null; size: number; dim?: boolean }) {
  return src ? (
    // TikTok's image CDN hosts vary, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: size / 4, objectFit: "cover", flexShrink: 0, opacity: dim ? 0.3 : 1 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 4, background: "var(--surface2)", flexShrink: 0 }} />
  );
}

/** Product Lookup, as designed in the mockup: paste links, get each product's facts, open the details panel. */
export function LookupView({ linked, samples }: { linked: boolean; samples: string[] }) {
  const { toast, flash } = useToast();
  const [paste, setPaste] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [open, setOpen] = useState<LookupRow | null>(null);
  const [closing, setClosing] = useState(false);
  const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
  const found = rows.filter((r) => r.ok);

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

  async function lookup() {
    if (phase === "loading") return;
    if (!lines.length) return flash("Paste at least one product link", false);
    setPhase("loading");
    try {
      const out: LookupRow[] = [];
      for (let i = 0; i < lines.length; i += 20) {
        const r = await fetch("/api/tap/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ links: lines.slice(i, i + 20) }) });
        const d = (await r.json().catch(() => ({}))) as { rows?: LookupRow[]; error?: string };
        if (!r.ok || !d.rows) throw new Error(d.error || "TikTok Shop did not answer. Please try again.");
        out.push(...d.rows);
      }
      setRows(out);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }

  const facts = (r: LookupRow): [string, string][] => [
    ["Shop", r.shop ?? "—"],
    ["Category", r.category ?? "—"],
    ["Price", priceText(r.priceLo, r.priceHi)],
    [r.source === "tap" ? "Open Plan commission" : "Open commission", pct(r.rate)],
    ["You earn per sale", perSale(r.priceLo, r.rate)],
    ["Units sold", r.sold !== null ? n(r.sold) : "—"],
    ["Stock", stockText(r)],
    ["Product ID", r.id ?? "—"],
  ];
  const exportCsv = () =>
    downloadCsv("rezekii-products.csv", [
      ["Product", "Product ID", "Shop", "Category", "Price from (RM)", "Price to (RM)", "Commission %", "Units sold", "Stock", "Note"],
      ...rows.map((r) => [r.ok ? r.name : r.input, r.id, r.shop, r.category, r.priceLo, r.priceHi, r.rate === null ? null : r.rate / 100, r.sold, r.stock ?? (r.ok ? stockText(r) : null), r.ok ? r.note : r.note]),
    ]);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <section className="nv-up nv-card" aria-labelledby="luform" style={{ flex: "999 1 560px", minWidth: 0, boxShadow: "var(--shadow)", borderRadius: 26, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 id="luform" className="nv-h2">Look up products</h2>
          <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <label htmlFor="lupaste" className="nv-label">TikTok product links, one per line</label>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{lines.length} {lines.length === 1 ? "link" : "links"} · about 20 per batch</span>
          </span>
          <textarea id="lupaste" className="nv-input" rows={5} value={paste} placeholder="https://shop.tiktok.com/view/product/…" onChange={(e) => { setPaste(e.target.value); setPhase("idle"); }} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="nv-btn nv-press nv-cta" onClick={lookup} style={{ height: 52, padding: "0 26px", fontSize: 16 }}>
              {phase === "loading" && <span className="nv-spin" aria-hidden="true" />}
              {phase === "loading" ? "Asking TikTok Shop…" : `Look up ${lines.length} ${lines.length === 1 ? "product" : "products"}`}
            </button>
            {samples.length > 0 && <button type="button" className="nv-btn2 nv-press" onClick={() => { setPaste(samples.join("\n")); setPhase("idle"); }}>Use sample links</button>}
            <button type="button" className="nv-link" onClick={() => { setPaste(""); setPhase("idle"); }} style={{ marginLeft: "auto" }}>Clear</button>
          </div>
        </section>
        <section className="nv-up nv-card" aria-labelledby="luinfo" style={{ animationDelay: "80ms", flex: "1 1 300px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="luinfo" className="nv-h2" style={{ fontSize: 18 }}>What TikTok shares</h2>
          {GIVES.map(([t, yes]) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--body)" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: yes ? "var(--gsoft)" : "var(--rsoft)", color: yes ? "var(--gink)" : "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={yes ? YES : NO} /></svg>
              </span>
              {t}
            </span>
          ))}
          {!linked && <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>Until your TikTok Shop is linked, facts come from Techwide&apos;s TAP catalog, so only TAP products are found.</span>}
        </section>
      </div>

      {phase === "loading" && (
        <section className="nv-card" aria-label="Loading" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {lines.slice(0, 4).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span className="nv-skel" style={{ width: 52, height: 52 }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><span className="nv-skel" style={{ height: 14, width: "60%" }} /><span className="nv-skel" style={{ height: 12, width: "35%" }} /></span>
            </div>
          ))}
        </section>
      )}

      {phase === "done" && (
        <section className="nv-up nv-card" aria-labelledby="lures" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 id="lures" className="nv-h2" style={{ fontSize: 18 }}>{found.length} of {rows.length} products found</h2>
            <button type="button" className="nv-btn2 nv-sm nv-press" onClick={exportCsv}>Export CSV</button>
          </div>
          <div className="nv-scrollx">
            <div role="table" aria-label="Product facts" style={{ minWidth: 860 }}>
              <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: COLS }}>
                <span role="columnheader">Product</span><span role="columnheader">Price</span><span role="columnheader">Commission</span><span role="columnheader">Sold</span><span role="columnheader">Stock</span><span role="columnheader" />
              </div>
              {rows.map((r, i) => (
                <div key={i} role="row" className="nv-tr nv-trow nv-up" style={{ gridTemplateColumns: COLS, animationDelay: `${Math.min(i, 20) * 60}ms` }}>
                  <span role="cell" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Thumb src={r.image} size={48} dim={!r.ok} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.ok ? r.name : `Line ${i + 1} · no product found`}</span>
                      <span style={{ fontSize: 12, color: r.ok ? "var(--muted)" : "var(--red)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.ok ? [r.shop, r.category].filter(Boolean).join(" · ") : r.note}</span>
                    </span>
                  </span>
                  <span role="cell" style={{ whiteSpace: "nowrap" }}>{r.ok ? priceText(r.priceLo, r.priceHi) : "—"}</span>
                  <span role="cell" style={{ whiteSpace: "nowrap", fontWeight: 800, color: "var(--gink)" }}>{r.ok && r.rate !== null ? `${pct(r.rate)} · ${perSale(r.priceLo, r.rate)}` : "—"}</span>
                  <span role="cell" style={{ whiteSpace: "nowrap" }}>{r.ok && r.sold !== null ? n(r.sold) : "—"}</span>
                  <span role="cell">{r.ok ? stockText(r) : "—"}</span>
                  <span role="cell" style={{ textAlign: "right" }}>{r.ok && <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => { setClosing(false); setOpen(r); }}>Details</button>}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {open && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="lupt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                <span className="nv-dot" aria-hidden="true" />{open.source === "tap" ? "From Techwide's TAP catalog" : "From TikTok Shop · just now"}
              </span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            {open.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.image} alt="" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 22, objectFit: "cover" }} />
            ) : null}
            <h3 id="lupt" style={{ margin: 0, fontSize: 21, fontWeight: 800, lineHeight: 1.25 }}>{open.name}</h3>
            <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
              {facts(open).map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border)" : 0, fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="nv-btn nv-press" style={{ flex: 1 }} onClick={async () => flash((await copyText(`${open.name}\n${facts(open).map(([k, v]) => `${k}: ${v}`).join("\n")}`)) ? "Product facts copied" : "Copy did not work.", true)}>Copy facts</button>
              {open.id && <Link href={`/app/links?add=${open.id}`} className="nv-btn2 nv-press" style={{ flex: 1, textDecoration: "none" }}>Make affiliate link</Link>}
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
