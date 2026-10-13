"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";
import { ProductCard, ProductView } from "./product-view";

type Facets = { categories: [string, number][]; shops: [string, number][]; total: number; withSamples: number; asOf: string | null };
type Filters = { q: string; category: string; shop: string; samples: boolean; sort: string };

const SORT_LABELS: [string, string][] = [["sold", "Best selling"], ["today", "Selling now"], ["rate", "Highest commission"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];
const START: Filters = { q: "", category: "", shop: "", samples: false, sort: "sold" };

async function fetchPage(f: Filters, page: number): Promise<{ products: TapProduct[]; total: number }> {
  const params = new URLSearchParams({ sort: f.sort, page: String(page) });
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.shop) params.set("shop", f.shop);
  if (f.samples) params.set("samples", "1");
  const r = await fetch(`/api/tap/products?${params}`);
  if (!r.ok) throw new Error("The Marketplace could not load. Please try again.");
  return r.json();
}

/** The TAP Marketplace: Techwide's campaign products, searchable, with the product view in a side panel. */
export function MarketplaceView({ requestedIds }: { requestedIds: string[] }) {
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filters, setFilters] = useState<Filters>(START);
  const [typed, setTyped] = useState("");
  const [products, setProducts] = useState<TapProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<TapProduct | null>(null);
  const [requested, setRequested] = useState(() => new Set(requestedIds));
  const asked = useRef(0);

  useEffect(() => {
    fetch("/api/tap/facets").then((r) => (r.ok ? r.json() : null)).then(setFacets).catch(() => setFacets(null));
  }, []);

  // A new search starts on page 1. Loading is set here, where the change happens, so the fetch effect only fetches.
  const apply = (f: Filters) => {
    setFilters(f);
    setPage(1);
    setLoading(true);
    setError("");
  };

  // Typing waits a moment before searching.
  useEffect(() => {
    if (typed === filters.q) return;
    const t = setTimeout(() => apply({ ...filters, q: typed }), 350);
    return () => clearTimeout(t);
  }, [typed, filters]);

  // Shows one page of results; a reply that arrives after a newer search started is dropped.
  const show = useCallback((f: Filters, p: number) => {
    const n = ++asked.current;
    fetchPage(f, p).then(
      (d) => {
        if (n !== asked.current) return;
        setProducts((prev) => (p === 1 ? d.products : [...prev, ...d.products]));
        setTotal(d.total);
        setLoading(false);
      },
      (err: Error) => {
        if (n !== asked.current) return;
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => show(filters, 1), [filters, show]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const set = (patch: Partial<Filters>) => apply({ ...filters, ...patch });
  const more = () => {
    setPage(page + 1);
    setLoading(true);
    setError("");
    show(filters, page + 1);
  };
  const filtered = filters.q || filters.category || filters.shop || filters.samples;

  return (
    <div className="tap">
      <section className="card tap-filters" aria-label="Search and filters">
        <input className="np-input" type="search" placeholder="Search products, shops or categories" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Search" />
        <div className="tap-filterrow">
          <select className="np-input" value={filters.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
            <option value="">All categories</option>
            {facets?.categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
          </select>
          <select className="np-input" value={filters.shop} onChange={(e) => set({ shop: e.target.value })} aria-label="Shop">
            <option value="">All shops</option>
            {facets?.shops.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
          </select>
          <select className="np-input" value={filters.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
            {SORT_LABELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <label className="tap-check">
            <input type="checkbox" checked={filters.samples} onChange={(e) => set({ samples: e.target.checked })} />
            Free samples only
          </label>
        </div>
        <p className="tap-count">
          {loading && page === 1 ? "Loading…" : <><b>{total.toLocaleString("en-US")}</b> {total === 1 ? "product" : "products"}</>}
          {facets && !filtered && <> · {facets.withSamples.toLocaleString("en-US")} with free samples</>}
          {filtered && <> · <button type="button" className="tap-clear" onClick={() => { setTyped(""); apply(START); }}>Clear filters</button></>}
        </p>
      </section>

      {error && <p className="np-error" role="alert">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <section className="card"><h2>No products match</h2><p>Try a different word, or clear the filters.</p></section>
      )}

      <section className="tap-grid" aria-label="Products" aria-busy={loading}>
        {products.map((p) => <ProductCard key={p.id} p={p} onOpen={setOpen} />)}
      </section>

      {products.length > 0 && products.length < total && (
        <button type="button" className="btn-outline tap-more" disabled={loading} onClick={more}>{loading ? "Loading…" : `Show more (${(total - products.length).toLocaleString("en-US")} left)`}</button>
      )}

      {open && (
        <div className="tap-shade" onClick={() => setOpen(null)}>
          <aside className="tap-panel" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tap-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
            <ProductView key={open.id} p={open} requested={requested.has(open.id)} onRequested={(id) => setRequested((s) => new Set(s).add(id))} />
          </aside>
        </div>
      )}
    </div>
  );
}
