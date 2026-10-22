"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import { tx } from "@/lib/i18n/lang.ts";
import type { BrowseResult, TapProduct } from "@/modules/tap/catalog.ts";
import type { GoldenSeller } from "@/modules/tap/golden.ts";
import { MK_SORTS } from "@/modules/tap/sorts.ts";
import { n, short } from "./format";
import { ProductCard, ProductPanel } from "./product-view";
import { Hud, SampleSheet, useTap } from "./use-tap-actions";
import "./marketplace.css";

type Filters = { q: string; sort: string; cat: string; shop: string; only: boolean };
type Golden = GoldenSeller & { thumbs: (string | null)[] };
const START: Filters = { q: "", sort: "sold-d", cat: "All", shop: "", only: false };
const PER = 24;

async function fetchPage(f: Filters, page: number): Promise<BrowseResult> {
  const params = new URLSearchParams({ sort: f.sort, page: String(page) });
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.cat !== "All") params.set("cat", f.cat);
  if (f.shop) params.set("shop", f.shop);
  if (f.only) params.set("only", "1");
  const r = await fetch(`/api/tap/products?${params}`);
  if (!r.ok) throw new Error(tx("The Marketplace could not load. Please try again."));
  return r.json();
}

const Chev = () => (
  <svg className="fb-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
const Tick = ({ w = 12, sw = 3.4 }: { w?: number; sw?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);

function Chip({ label, aria, onRemove }: { label: string; aria: string; onRemove: () => void }) {
  return (
    <span className="fb-chip">
      <span>{label}</span>
      <button type="button" className="fb-x" aria-label={aria} onClick={onRemove}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </span>
  );
}

/** The TAP Marketplace, built from the mockup (Marketplace page): Golden Sellers, filters, product grid and the product panel. */
export function MarketplaceView({ initial, golden, requestedIds }: { initial: BrowseResult; golden: Golden[]; requestedIds: string[] }) {
  const t = useT();
  const tap = useTap(requestedIds);
  const [filters, setFilters] = useState<Filters>(START);
  const [typed, setTyped] = useState("");
  const [data, setData] = useState<BrowseResult>(initial);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [pop, setPop] = useState<"" | "sort" | "cat" | "shop">("");
  const [popQ, setPopQ] = useState("");
  const [open, setOpen] = useState<TapProduct | null>(null);
  const [closing, setClosing] = useState(false);
  const asked = useRef(0);

  // Loads one page; a reply that arrives after a newer search started is dropped.
  const load = (f: Filters, p: number) => {
    const ask = ++asked.current;
    setError("");
    fetchPage(f, p).then(
      (d) => {
        if (ask !== asked.current) return;
        setData((prev) => (p === 1 ? d : { ...d, items: [...prev.items, ...d.items] }));
        setPage(p);
      },
      (err: Error) => ask === asked.current && setError(err.message),
    );
  };
  const apply = (patch: Partial<Filters>) => {
    const f = { ...filters, ...patch };
    setFilters(f);
    setPop("");
    setPopQ("");
    load(f, 1);
  };

  // Typing searches after a short pause.
  useEffect(() => {
    if (typed === filters.q) return;
    const t = setTimeout(() => apply({ q: typed }), 250);
    return () => clearTimeout(t);
  });

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

  const menu = (k: "sort" | "cat" | "shop") => () => {
    setPop(pop === k ? "" : k);
    setPopQ("");
  };
  const pq = popQ.trim().toLowerCase();
  const catOpts = data.cats.filter(([c]) => !pq || c.toLowerCase().includes(pq));
  const shopOpts = ([["", t("All shops"), data.all]] as [string, string, number][]).concat(data.shops.map(([s, c]) => [s, s, c])).filter(([, label]) => !pq || label.toLowerCase().includes(pq));
  const hasActive = filters.cat !== "All" || !!filters.shop || filters.only || !!filters.q.trim();
  const clearAll = () => {
    setTyped("");
    apply(START);
  };
  const shown = data.items.length;
  const left = data.total - shown;

  return (
    <>
      {golden.length > 0 && (
        <section className="gs-wrap" aria-labelledby="gshead">
          <div className="gs-top">
            <svg className="gs-crown" width="30" height="23" viewBox="0 0 34 26" aria-hidden="true"><path d="M3 22 1 6l9 7 7-12 7 12 9-7-2 16z" fill="#f2c230" stroke="#a86e00" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 id="gshead" className="gs-title">{t("Golden Sellers")}</h2>
              <span className="gs-sub">{t("Our top 3 partner brands, ranked by sales through Rezekii")}</span>
            </div>
          </div>
          <div className="gs-row">
            {golden.map((g, i) => (
              <Link key={g.shop} href={`/app/golden-sellers?shop=${encodeURIComponent(g.shop)}`} className="gs-card nv-press" aria-label={t("Golden Seller number {i}, {shop}. Shop all {n} products", { i: i + 1, shop: g.shop, n: g.count })}>
                <span className="gs-shine" aria-hidden="true" />
                <span className="gs-rank">{t("#{i} Golden Seller", { i: i + 1 })}</span>
                <span className="gs-id">
                  <span className="gs-mono" aria-hidden="true">{g.initial}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <strong className="gs-name">{g.shop}</strong>
                    <span className="gs-meta">{t("{n} live products · {sold} sold", { n: g.count, sold: short(g.sold) })}</span>
                  </span>
                </span>
                <span className="gs-thumbs" aria-hidden="true">
                  {g.thumbs.map((t, k) => <span key={k} className="gs-thumb" style={t ? { backgroundImage: `url("${t}")` } : undefined} />)}
                </span>
                <span className="gs-cta">{t("Shop all {n} products →", { n: g.count })}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="nv-card fb" aria-label={t("Find products")} style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: 18, scrollMarginTop: 16 }}>
        <div className="fb-row">
          <div className="fb-search">
            <label htmlFor="mksearch" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{t("Search products")}</label>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: 14, top: 13, color: "var(--muted)" }}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.35-4.35" /></svg>
            <input id="mksearch" type="text" className="nv-input" placeholder={t("Search product, shop or category")} value={typed} onChange={(e) => setTyped(e.target.value)} style={{ paddingLeft: 42 }} />
          </div>
          <div className="fb-dd">
            <button type="button" className="fb-btn" aria-haspopup="listbox" aria-expanded={pop === "sort"} onClick={menu("sort")}><span className="fb-lab">{t("Sort")}</span><span className="fb-val">{t(data.sortLabel)}</span><Chev /></button>
            {pop === "sort" && (
              <>
                <button type="button" className="fb-shield" aria-label={t("Close menu")} onClick={() => setPop("")} />
                <div className="fb-pop right fit" role="listbox" aria-label={t("Sort products")}>
                  <div className="fb-list">
                    {MK_SORTS.map(([v, label]) => (
                      <button key={v} type="button" role="option" aria-selected={v === filters.sort} className={`fb-opt ${v === filters.sort ? "on" : ""}`} onClick={() => apply({ sort: v })}>
                        <span className="fb-name">{t(label)}</span>
                        {v === filters.sort && <span style={{ flexShrink: 0, display: "flex" }}><Tick w={16} sw={3} /></span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="fb-row">
          <div className="fb-dd">
            <button type="button" className={`fb-btn ${filters.cat !== "All" ? "on" : ""}`} aria-haspopup="listbox" aria-expanded={pop === "cat"} onClick={menu("cat")}><span className="fb-lab">{t("Category")}</span><span className="fb-val">{filters.cat === "All" ? t("All") : filters.cat}</span><Chev /></button>
            {pop === "cat" && (
              <>
                <button type="button" className="fb-shield" aria-label={t("Close menu")} onClick={() => setPop("")} />
                <div className="fb-pop" role="dialog" aria-label={t("Search categories")}>
                  <input type="search" className="fb-psearch" aria-label={t("Search categories")} placeholder={t("Search categories")} value={popQ} onChange={(e) => setPopQ(e.target.value)} autoFocus />
                  <div className="fb-list" role="listbox" aria-label={t("Category")}>
                    {catOpts.map(([c, count]) => (
                      <button key={c} type="button" role="option" aria-selected={filters.cat === c} className={`fb-opt ${filters.cat === c ? "on" : ""}`} onClick={() => apply({ cat: c })}>
                        <span className="fb-name">{c === "All" ? t("All") : c}</span><span className="fb-n">{n(count)}</span>
                      </button>
                    ))}
                    {!!pq && catOpts.length === 0 && <span className="fb-empty">{t("No category matches.")}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="fb-dd">
            <button type="button" className={`fb-btn ${filters.shop ? "on" : ""}`} aria-haspopup="listbox" aria-expanded={pop === "shop"} onClick={menu("shop")}><span className="fb-lab">{t("Shop")}</span><span className="fb-val">{filters.shop || t("All shops")}</span><Chev /></button>
            {pop === "shop" && (
              <>
                <button type="button" className="fb-shield" aria-label={t("Close menu")} onClick={() => setPop("")} />
                <div className="fb-pop" role="dialog" aria-label={t("Search shops")}>
                  <input type="search" className="fb-psearch" aria-label={t("Search shops")} placeholder={t("Search shops")} value={popQ} onChange={(e) => setPopQ(e.target.value)} autoFocus />
                  <div className="fb-list" role="listbox" aria-label={t("Shop")}>
                    {shopOpts.map(([v, label, count]) => (
                      <button key={v || "all"} type="button" role="option" aria-selected={filters.shop === v} className={`fb-opt ${filters.shop === v ? "on" : ""}`} onClick={() => apply({ shop: v })}>
                        <span className="fb-name">{label}</span><span className="fb-n">{n(count)}</span>
                      </button>
                    ))}
                    {!!pq && shopOpts.length === 0 && <span className="fb-empty">{t("No shop matches.")}</span>}
                  </div>
                </div>
              </>
            )}
          </div>
          <button type="button" className={`fb-btn ${filters.only ? "on" : ""}`} aria-pressed={filters.only} onClick={() => apply({ only: !filters.only })}>
            <span className="fb-tick" aria-hidden="true"><Tick /></span>{t("Samples available")}
          </button>
        </div>
        {hasActive && (
          <div className="fb-chips">
            {filters.q.trim() && <Chip label={t("Search: {q}", { q: filters.q.trim() })} aria={t("Remove search")} onRemove={() => { setTyped(""); apply({ q: "" }); }} />}
            {filters.cat !== "All" && <Chip label={t("Category: {c}", { c: filters.cat })} aria={t("Remove category filter")} onRemove={() => apply({ cat: "All" })} />}
            {filters.shop && <Chip label={t("Shop: {s}", { s: filters.shop })} aria={t("Remove shop filter")} onRemove={() => apply({ shop: "" })} />}
            {filters.only && <Chip label={t("Samples available")} aria={t("Remove samples filter")} onRemove={() => apply({ only: false })} />}
            <button type="button" className="nv-link" onClick={clearAll} style={{ fontSize: 13 }}>{t("Clear all")}</button>
          </div>
        )}
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{data.total === 1 ? t("{n} product", { n: n(data.total) }) : t("{n} products", { n: n(data.total) })} · {t(data.sortLabel)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
          <span className="nv-dot" aria-hidden="true" />{t("{n} products from {s} shops on Rezekii", { n: n(data.all), s: data.shops.length })}
        </span>
      </div>

      {error && <p className="np-error" role="alert">{t(error)}</p>}

      {data.total === 0 && (
        <div className="nv-card" style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ color: "var(--muted)" }}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.35-4.35" /></svg>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{t("No products match")}</span>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{t("Try another search, category or shop.")}</span>
          <button type="button" className="nv-btn2 nv-press" onClick={clearAll}>{t("Clear filters")}</button>
        </div>
      )}

      <div className="mk-grid">
        {data.items.map((p) => <ProductCard key={p.id} p={p} tap={tap} onOpen={(x) => { setClosing(false); setOpen(x); }} />)}
      </div>
      {left > 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button type="button" className="nv-btn2 nv-press" onClick={() => load(filters, page + 1)} style={{ minWidth: 260 }}>
            {t("Show {k} more · {n} left", { k: Math.min(PER, left), n: n(left) })}
          </button>
        </div>
      )}

      {open && <ProductPanel p={open} tap={tap} closing={closing} onClose={closePanel} />}
      <Hud toast={tap.toast} />
      <SampleSheet qr={tap.qr} onClose={tap.closeQr} />
    </>
  );
}
