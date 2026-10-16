"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";
import { perSale, pct, placeholder, priceText, pulled, rm, short, tiktokProductUrl } from "./format";
import type { useTap } from "./use-tap-actions";

type Tap = ReturnType<typeof useTap>;

/** All-time units sold, and the units sold since the day before (owner, 15 Oct 2026: "since yesterday", not "today"). */
const soldText = (p: TapProduct) => `${short(p.sold)} sold${p.soldToday ? ` · +${short(p.soldToday)} since yesterday` : ""}`;

function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="nv-check" d="m5 12 5 5 9-10" /></svg>
  );
}

function Photo({ p, className, style }: { p: TapProduct; className: string; style?: React.CSSProperties }) {
  if (p.image) return <span className={`${className} mk-photo`} aria-hidden="true" style={{ backgroundImage: `url("${p.image}")`, ...style }} />;
  const ph = placeholder(p.category);
  return <span className={`${className} mk-ph`} aria-hidden="true" style={{ background: ph.background, ...style }}>{ph.initial}</span>;
}

/** The mockup's product card (_tap/tap.card.html). */
export function ProductCard({ p, tap, onOpen }: { p: TapProduct; tap: Tap; onOpen: (p: TapProduct) => void }) {
  const st = tap.addState(p.id);
  return (
    <div className="nv-card nv-hover mk-card">
      <button type="button" className="mk-img" onClick={() => onOpen(p)} aria-label={`Open ${p.name}`}>
        <Photo p={p} className="mk-fill" />
        <span className="nv-badge" style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.94)", color: p.samples ? "#00704a" : "#5f6b7a" }}>
          {p.samples ? "Free sample" : "No samples"}
        </span>
      </button>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.shop} · {p.category}</span>
        <span className="mk-name">{p.name}</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{priceText(p.priceLo, p.priceHi)} · {soldText(p)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gink)" }}>Earn {pct(p.openRate)}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Silver {pct(p.silverRate)}</span>
          </span>
          <button
            type="button"
            className="nv-press"
            onClick={() => tap.addToShowcase(p.id)}
            aria-label={st === "done" ? (tap.linked ? "In your showcase" : "Opened in TikTok Shop") : `Add ${p.name} to showcase`}
            style={{ height: 36, minWidth: 36, padding: "0 12px", borderRadius: 999, border: 0, background: st === "done" ? "var(--gsoft)" : "#00c073", color: st === "done" ? "var(--gink)" : "#0d1117", fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {st === "loading" && <span className="nv-spin" aria-hidden="true" style={{ width: 14, height: 14 }} />}
            {st === "done" && <Check size={16} />}
            {st === "done" ? "Opened" : st === "loading" ? "" : "+ Showcase"}
          </button>
        </span>
      </div>
    </div>
  );
}

/** The mockup's product view (_tap/tap.product.html): in the Marketplace panel and on the product page. */
export function ProductBlock({ p, tap, headingId }: { p: TapProduct; tap: Tap; headingId: string }) {
  const add = tap.addState(p.id);
  const smp = tap.sampleState(p);
  const { checkSample } = tap;
  useEffect(() => { checkSample(p.id); }, [checkSample, p.id]);
  const smpNote = { idle: "Free sample through Techwide's campaign", checking: "Checking free samples with TikTok…", none: "No free sample for this product right now", limit: "You've reached TikTok's limit on open sample requests", done: "You've requested this sample", loading: "Opening TikTok's sample request…" }[smp];
  return (
    <div className="pb">
      <div className="pb-media" style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", flexShrink: 0, borderRadius: 22, overflow: "hidden", background: "#f2f5f3" }}>
        <Photo p={p} className="" style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="pb-info">
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{p.shop} · {p.category}</span>
      <h3 id={headingId} style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{p.name}</h3>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{priceText(p.priceLo, p.priceHi)} · {soldText(p)} · {p.stock === null ? "—" : short(p.stock)} in stock</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div style={{ background: "var(--surface2)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Bronze (Open Plan)</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{pct(p.openRate)}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{perSale(p.priceLo, p.openRate)} per sale</div>
        </div>
        <div style={{ background: "var(--gsoft)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--gink)", fontWeight: 700 }}>Silver</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gink)" }}>{pct(p.silverRate)}</div>
          <div style={{ fontSize: 12, color: "var(--gink)", fontWeight: 700 }}>{perSale(p.priceLo, p.silverRate)} per sale</div>
        </div>
      </div>
      <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{smpNote}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="nv-cap">Variants · list price before shop discounts</span>
        {p.variants.map(([name, price, stock], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--surface2)" }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{rm(price)}</span>
            <span className={`nv-badge ${stock > 0 ? "b-green" : "b-gray"}`}>{stock > 0 ? `${short(stock)} in stock` : "Sold out"}</span>
          </div>
        ))}
      </div>
      <button type="button" className="nv-btn nv-press nv-cta" onClick={() => tap.addToShowcase(p.id)} style={{ height: 54, fontSize: 16, background: add === "done" ? "var(--gsoft)" : "#00c073" }}>
        {add === "loading" && <span className="nv-spin" aria-hidden="true" />}
        {add === "done" && <Check size={20} />}
        {add === "loading" ? "Adding via TikTok Shop…" : add === "done" ? (tap.linked ? "In your showcase" : "Opened in TikTok Shop") : "Add to showcase"}
      </button>
      <button
        type="button"
        className={`nv-press mk-sample mk-sample-lg ${smp === "none" || smp === "limit" || smp === "checking" ? "mk-sample-none" : smp === "done" ? "mk-sample-done" : ""}`}
        onClick={() => tap.requestSample(p)}
        aria-disabled={smp !== "idle" ? "true" : "false"}
      >
        {(smp === "loading" || smp === "checking") && <span className="nv-spin" aria-hidden="true" style={{ width: 16, height: 16 }} />}
        {smp === "done" && <Check size={18} />}
        {{ none: "No free samples", checking: "Checking samples…", limit: "Sample limit reached", loading: "Requesting…", done: "Sample requested", idle: "Request free sample" }[smp]}
      </button>
      {smp === "done" && <Link href="/app/my-tap" className="nv-link" style={{ alignSelf: "center", fontSize: 14, fontWeight: 700 }}>See it in My Samples</Link>}
      <a href={tiktokProductUrl(p.id)} target="_blank" rel="noopener" className="nv-btn2 nv-press" style={{ height: 50 }}>Open on TikTok Shop</a>
      </div>
    </div>
  );
}

/** "From TikTok Shop · pulled 13 Oct 2026" line at the top of the panel and the product page. */
export function Pulled({ asOf }: { asOf: string | null }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
      <span className="nv-dot" aria-hidden="true" />From TikTok Shop · pulled {pulled(asOf)}
    </span>
  );
}

/** The mockup's side panel (_tap/tap.panel.html); a bottom sheet on phones. */
export function ProductPanel({ p, tap, closing, onClose }: { p: TapProduct; tap: Tap; closing: boolean; onClose: () => void }) {
  return (
    <>
      <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="mkpt" className={`nv-panel nv-panel-wide ${closing ? "out" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Pulled asOf={p.asOf} />
          <button type="button" className="nv-press" aria-label="Close" onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <ProductBlock p={p} tap={tap} headingId="mkpt" />
      </div>
    </>
  );
}
