"use client";

import { useEffect, useRef, useState } from "react";
import type { LookupRow } from "@/modules/tap/convert.ts";
import { n, pct, perSale, priceText, tiktokProductUrl } from "../marketplace/format";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { ProductCard } from "../product-card";
import { linksFromFile, saveRows, type ExportFormat } from "./files";
import "../marketplace/marketplace.css";
import "../today.css";
import "../links/links.css";
import "./lookup.css";

const COLS = "minmax(280px, 3fr) 120px 130px 110px 90px 140px 100px 96px";
const FORMATS: [ExportFormat, string][] = [["xlsx", "Excel (.xlsx)"], ["csv", "CSV"], ["json", "JSON"], ["txt", "Text (.txt)"]];
const stockText = (r: LookupRow) => (r.stock !== null ? n(r.stock) : r.note === "Out of stock" ? "Out of stock" : r.source === "tiktok" ? "In stock" : "—");
const ratingText = (r: LookupRow) => (r.rating !== null ? `★ ${r.rating.toFixed(1)}` : "—");
const shortN = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v));

function Thumb({ src, size, dim }: { src: string | null; size: number; dim?: boolean }) {
  return src ? (
    // TikTok's image CDN hosts vary, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: size / 4, objectFit: "cover", flexShrink: 0, opacity: dim ? 0.3 : 1 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 4, background: "var(--surface2)", flexShrink: 0 }} />
  );
}

/**
 * Product Lookup, mockup direction A (owner, 14 Oct 2026): paste or upload links, a table with every fact TikTok shares (cards on a
 * phone), and a details card that opens from any row. Export saves every fact, with the creator's own affiliate link for each product.
 */
export function LookupView({ linked, samples }: { linked: boolean; samples: string[] }) {
  const { toast, flash } = useToast();
  const [paste, setPaste] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [done, setDone] = useState(0);
  const [open, setOpen] = useState<LookupRow | null>(null);
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
  const found = rows.filter((r) => r.ok);

  const show = (r: LookupRow) => setOpen(r);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      const found = await linksFromFile(file);
      if (!found.length) return flash(`No TikTok product links found in ${file.name}`, false);
      const merged = [...new Set([...lines, ...found])];
      setPaste(merged.join("\n"));
      setPhase("idle");
      flash(`${found.length} product ${found.length === 1 ? "link" : "links"} from ${file.name}`, true);
    } catch {
      flash(`Couldn't read ${file.name}`, false);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function lookup() {
    if (phase === "loading") return;
    if (!lines.length) return flash("Paste or upload at least one product link", false);
    setPhase("loading");
    setDone(0);
    try {
      const out: LookupRow[] = [];
      for (let i = 0; i < lines.length; i += 20) {
        const r = await fetch("/api/tap/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ links: lines.slice(i, i + 20) }) });
        const d = (await r.json().catch(() => ({}))) as { rows?: LookupRow[]; error?: string };
        if (!r.ok || !d.rows) throw new Error(d.error || "TikTok Shop did not answer. Please try again.");
        out.push(...d.rows);
        setDone(out.length);
      }
      setRows(out);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }

  /** Every fact for every row, plus the creator's own affiliate link for each product found. */
  async function exportAs(format: ExportFormat) {
    setMenu(false);
    if (!rows.length || exporting) return;
    setExporting(true);
    let links: Record<string, string> = {};
    try {
      if (linked && found.length) {
        const r = await fetch("/api/tap/lookup/links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: found.map((x) => ({ id: x.id, name: x.name, image: x.image })) }) });
        const d = (await r.json().catch(() => ({}))) as { links?: Record<string, string>; error?: string };
        if (r.ok && d.links) links = d.links;
        else flash(d.error || "Affiliate links couldn't be made; the file has the product links.", false);
      }
      saveRows(format, "rezekii-products", [
        ["Product", "Product ID", "Your affiliate link", "Product link", "Brand", "Shop", "Shop rating", "Category", "Price from (RM)", "Price to (RM)", "Commission %", "You earn per sale (RM)", "Sold, all time", "Stock", "Rating", "Reviews", "In the Marketplace", "Variants", "Description", "Image", "Note"],
        ...rows.map((r) => [
          r.ok ? r.name : r.input, r.id, (r.id && links[r.id]) || "", r.id ? tiktokProductUrl(r.id) : r.input, r.brand, r.shop, r.shopRating, r.category, r.priceLo, r.priceHi,
          r.rate === null ? null : r.rate / 100, r.priceLo !== null && r.rate !== null ? Math.round(r.priceLo * r.rate) / 10000 : null, r.sold, r.stock, r.rating, r.reviews,
          r.ok ? (r.tap ? "Yes" : "No") : "", r.variants.map(([v, p, s]) => `${v} · RM${p} · ${s} in stock`).join(" | "), r.description, r.image, r.note,
        ]),
      ]);
      if (Object.keys(links).length) flash(`Saved with ${Object.keys(links).length} affiliate ${Object.keys(links).length === 1 ? "link" : "links"} made for you`, true);
      else if (!linked) flash("Saved. Link your TikTok Shop to get your own affiliate links in the file.", true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="nv-up nv-card" aria-labelledby="luform" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 id="luform" className="nv-h2">Look up products</h2>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <label htmlFor="lupaste" className="nv-label">TikTok product links, one per line</label>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{lines.length} {lines.length === 1 ? "link" : "links"}</span>
        </span>
        <textarea id="lupaste" className="nv-input" rows={4} value={paste} placeholder="https://shop.tiktok.com/view/product/…" onChange={(e) => { setPaste(e.target.value); setPhase("idle"); }} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button type="button" className="nv-btn nv-press nv-cta" onClick={lookup} style={{ height: 52, padding: "0 26px", fontSize: 16 }}>
            {phase === "loading" && <span className="nv-spin" aria-hidden="true" />}
            {phase === "loading" ? `Asking TikTok Shop… ${done} of ${lines.length}` : `Look up ${lines.length} ${lines.length === 1 ? "product" : "products"}`}
          </button>
          <button type="button" className="nv-btn2 nv-press" onClick={() => fileRef.current?.click()}>Upload a file</button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.json,.xlsx,.xls,text/csv,text/plain,application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          {samples.length > 0 && <button type="button" className="nv-btn3 nv-press" onClick={() => { setPaste(samples.join("\n")); setPhase("idle"); }}>Use sample links</button>}
          <button type="button" className="nv-link" onClick={() => { setPaste(""); setPhase("idle"); }} style={{ marginLeft: "auto" }}>Clear</button>
        </div>
        <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          Upload a CSV, Excel, JSON or text file and every TikTok product link in it is picked up. Works for any product open to affiliates in Malaysia.
          {!linked && " Until your TikTok Shop is linked, only Marketplace products are found."}
        </span>
      </section>

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
            <span style={{ position: "relative" }}>
              <button type="button" className="nv-btn2 nv-sm nv-press" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)} disabled={exporting}>
                {exporting && <span className="nv-spin" aria-hidden="true" />}{exporting ? "Making your links…" : "Export ▾"}
              </button>
              {menu && (
                <>
                  <button type="button" aria-label="Close" className="lu-menudim" onClick={() => setMenu(false)} />
                  <span role="menu" className="lu-menu">
                    {FORMATS.map(([f, label]) => <button key={f} type="button" role="menuitem" onClick={() => exportAs(f)}>{label}</button>)}
                    <span className="lu-menunote">{linked ? "Each product gets your own affiliate link, so sales from anywhere are yours." : "Link your TikTok Shop to add your own affiliate links."}</span>
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="nv-scrollx lu-table">
            <div role="table" aria-label="Product facts" style={{ minWidth: 1040 }}>
              <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: COLS }}>
                <span role="columnheader">Product</span><span role="columnheader">Price</span><span role="columnheader">Commission</span><span role="columnheader">Sold, all time</span><span role="columnheader">Stock</span><span role="columnheader">Rating</span><span role="columnheader">Shop rating</span><span role="columnheader" />
              </div>
              {rows.map((r, i) => (
                <div key={i} role="row" className={`nv-tr nv-trow nv-up ${r.ok ? "lu-row" : ""}`} onClick={r.ok ? () => show(r) : undefined} style={{ gridTemplateColumns: COLS, animationDelay: `${Math.min(i, 20) * 50}ms` }}>
                  <span role="cell" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Thumb src={r.image} size={48} dim={!r.ok} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.ok ? r.name : `Line ${i + 1} · no product found`}</span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: r.ok ? "var(--muted)" : "var(--red)", minWidth: 0 }}>
                        {r.ok ? <><b style={{ color: "var(--text)" }}>{r.brand ?? r.shop}</b>{r.brand && r.shop ? <span className="lu-ellip">· {r.shop}</span> : null}{r.tap && <span className="lu-tap">Marketplace</span>}</> : r.note}
                      </span>
                    </span>
                  </span>
                  <span role="cell" style={{ whiteSpace: "nowrap" }}>{r.ok ? priceText(r.priceLo, r.priceHi) : "—"}</span>
                  <span role="cell" style={{ whiteSpace: "nowrap", fontWeight: 800, color: "var(--gink)" }}>{r.ok && r.rate !== null ? `${pct(r.rate)} · ${perSale(r.priceLo, r.rate)}` : "—"}</span>
                  <span role="cell" style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.ok && r.sold !== null ? n(r.sold) : "—"}</span>
                  <span role="cell" style={{ fontVariantNumeric: "tabular-nums" }}>{r.ok ? stockText(r) : "—"}</span>
                  <span role="cell" style={{ whiteSpace: "nowrap" }}>{r.ok ? <>{ratingText(r)}{r.reviews !== null && <span style={{ color: "var(--muted)", fontSize: 12 }}> ({shortN(r.reviews)})</span>}</> : "—"}</span>
                  <span role="cell">{r.ok && r.shopRating !== null ? `★ ${r.shopRating.toFixed(1)}` : "—"}</span>
                  <span role="cell" style={{ textAlign: "right" }}>{r.ok && <button type="button" className="nv-btn2 nv-sm nv-press" onClick={(e) => { e.stopPropagation(); show(r); }}>Details</button>}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lu-cards">
            {rows.map((r, i) => (
              <button key={i} type="button" className="lu-card nv-press" disabled={!r.ok} onClick={() => show(r)}>
                <Thumb src={r.image} size={64} dim={!r.ok} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <b className="lu-clamp">{r.ok ? r.name : `Line ${i + 1} · no product found`}</b>
                  <span style={{ fontSize: 12, color: r.ok ? "var(--muted)" : "var(--red)" }}>{r.ok ? [r.brand ?? r.shop, r.rating !== null ? ratingText(r) : null, r.sold !== null ? `${shortN(r.sold)} sold` : null].filter(Boolean).join(" · ") : r.note}</span>
                  {r.ok && <span style={{ display: "flex", gap: 8, alignItems: "center" }}><b style={{ color: "var(--gink)" }}>{pct(r.rate)} · {perSale(r.priceLo, r.rate)}</b>{r.tap && <span className="lu-tap">Marketplace</span>}</span>}
                </span>
                {r.ok && <span aria-hidden="true" style={{ color: "var(--muted)", fontSize: 20 }}>›</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {open && <ProductCard row={open} onClose={() => setOpen(null)} onCopied={(ok) => flash(ok ? "Product facts copied" : "Copy did not work.", ok)} />}
      <Hud toast={toast} />
    </>
  );
}
