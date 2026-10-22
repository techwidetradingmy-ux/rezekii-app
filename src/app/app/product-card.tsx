"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import type { T } from "@/lib/i18n/lang.ts";
import type { LookupRow } from "@/modules/tap/convert.ts";
import { n, pct, perSale, priceText } from "./marketplace/format";
import { copyText } from "./links/file-tools";
import "./lookup/lookup.css";

const stockText = (r: LookupRow, t: T) => (r.stock !== null ? n(r.stock) : r.note === "Out of stock" ? t("Out of stock") : r.source === "tiktok" ? t("In stock") : "—");
const same: T = (en) => en;

/** Every fact Product Lookup shows for a product, as label and value (`t` gives them in the reader's language). */
export const productFacts = (r: LookupRow, t: T = same): [string, string][] => [
  [t("Brand"), r.brand ?? "—"],
  [t("Shop"), r.shop ? `${r.shop}${r.shopRating !== null ? ` · ★ ${r.shopRating.toFixed(1)}` : ""}` : "—"],
  [t("Category"), r.category ?? "—"],
  [t("Price"), priceText(r.priceLo, r.priceHi)],
  [r.source === "tap" ? t("Open Plan commission") : t("Open commission"), pct(r.rate)],
  [t("You earn per sale"), perSale(r.priceLo, r.rate)],
  [t("Sold, all time"), r.sold !== null ? n(r.sold) : "—"],
  [t("Stock"), stockText(r, t)],
  [t("Rating"), r.rating !== null ? (r.reviews !== null ? t("★ {r} · {n} reviews", { r: r.rating.toFixed(1), n: n(r.reviews) }) : `★ ${r.rating.toFixed(1)}`) : "—"],
  [t("Product ID"), r.id ?? "—"],
];

/**
 * The product card (side panel on desktop, bottom sheet on a phone), the same everywhere a product opens: Product Lookup, Sales.
 * Pass `row`, or `productId` to look the product up first.
 */
export function ProductCard({ row, productId, onClose, onCopied }: { row?: LookupRow | null; productId?: string; onClose: () => void; onCopied?: (ok: boolean) => void }) {
  const t = useT();
  const [closing, setClosing] = useState(false);
  const [more, setMore] = useState(false);
  const [r, setR] = useState<LookupRow | null>(row ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (row || !productId) return;
    let live = true;
    fetch("/api/tap/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ links: [productId] }) })
      .then((x) => x.json())
      .then((d: { rows?: LookupRow[] }) => { if (!live) return; const hit = d.rows?.[0]; if (hit?.ok) setR(hit); else setFailed(true); })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [row, productId]);
  const close = () => { setClosing(true); setTimeout(onClose, 250); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <>
      <button type="button" aria-label={t("Close")} className={`nv-dim ${closing ? "out" : ""}`} onClick={close} />
      <div role="dialog" aria-modal="true" aria-labelledby="pcard" className={`nv-panel ${closing ? "out" : ""}`}>
        <span className="lu-grab" aria-hidden="true" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
            <span className="nv-dot" aria-hidden="true" />{r ? (r.tap ? t("On Rezekii · full listing") : t("From TikTok Shop · just now")) : t("Asking TikTok Shop…")}
          </span>
          <button type="button" className="nv-press" aria-label={t("Close")} onClick={close} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {!r && !failed && (
          <>
            <span className="nv-skel" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 22 }} />
            <span className="nv-skel" style={{ height: 20, width: "80%" }} />
            <span className="nv-skel" style={{ height: 160 }} />
          </>
        )}
        {failed && <p id="pcard" style={{ margin: 0, color: "var(--muted)" }}>{t("TikTok didn't share this product's details. It may no longer be open to affiliates.")}</p>}
        {r && (
          <>
            {r.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image} alt="" className="lu-pimg" />
            ) : null}
            <h3 id="pcard" style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>{r.name}</h3>
            <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
              {productFacts(r, t).map(([k, v], i) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border)" : 0, fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
            {r.variants.length > 0 && (
              <>
                <strong style={{ fontSize: 15 }}>{t("Variants")}</strong>
                <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
                  <div className="lu-sku h"><span>{t("Variant")}</span><span>{t("Price")}</span><span>{t("Stock")}</span></div>
                  {r.variants.map(([v, p, s], i) => <div key={i} className="lu-sku"><span>{v}</span><span>RM{p}</span><span>{n(s)}</span></div>)}
                </div>
              </>
            )}
            {r.description && (
              <>
                <strong style={{ fontSize: 15 }}>{t("Description")}</strong>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--body)", whiteSpace: "pre-line" }}>{more || r.description.length <= 420 ? r.description : `${r.description.slice(0, 420)}…`}</p>
                {r.description.length > 420 && <button type="button" className="nv-link" style={{ alignSelf: "flex-start" }} onClick={() => setMore(!more)}>{more ? t("Show less") : t("Read more")}</button>}
              </>
            )}
            {!r.tap && <p style={{ margin: 0, padding: "12px 14px", borderRadius: 14, background: "var(--surface2)", fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>{t("TikTok doesn't share this product's description, variants, extra photos, videos or price after vouchers. Marketplace products show them.")}</p>}
            <div className="lu-act">
              <button type="button" className="nv-btn2 nv-press" style={{ flex: 1 }} onClick={async () => onCopied?.(await copyText(`${r.name}\n${productFacts(r, t).map(([k, v]) => `${k}: ${v}`).join("\n")}`))}>{t("Copy facts")}</button>
              {r.id && <Link href={`/app/links?add=${r.id}`} className="nv-btn nv-press" style={{ flex: 1, textDecoration: "none" }}>{t("Make my affiliate link")}</Link>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
