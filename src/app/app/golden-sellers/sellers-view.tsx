"use client";

import { useEffect, useState } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";
import type { GoldenSeller } from "@/modules/tap/golden.ts";
import { pct, short } from "../marketplace/format";
import { ProductCard, ProductPanel } from "../marketplace/product-view";
import { Hud, useTap } from "../marketplace/use-tap-actions";
import "../marketplace/marketplace.css";

const SORTS = ["Best-selling", "Commission", "Price"];
const SORT_TEXT = ["best-selling first", "highest commission first", "highest price first"];
const PER = 24;

/** The Golden Sellers page from the mockup: the top 3 shops as tabs, the chosen shop's numbers, and all its live products. */
export function SellersView({ golden, products, initialShop, requestedIds }: { golden: GoldenSeller[]; products: TapProduct[]; initialShop: string; requestedIds: string[] }) {
  const tap = useTap(requestedIds);
  const [shop, setShop] = useState(golden.some((g) => g.shop === initialShop) ? initialShop : golden[0]?.shop ?? "");
  const [sort, setSort] = useState(0);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<TapProduct | null>(null);
  const [closing, setClosing] = useState(false);

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

  const cur = golden.find((g) => g.shop === shop) ?? golden[0];
  if (!cur) return <div className="nv-card" style={{ padding: 24 }}>Golden Sellers show here after the next daily update.</div>;
  const rank = golden.indexOf(cur) + 1;
  const mine = products.filter((p) => p.shop === cur.shop);
  const val = (p: TapProduct) => [p.sold, p.silverRate ?? 0, p.priceLo ?? 0][sort];
  const list = mine.slice().sort((a, b) => val(b) - val(a) || b.sold - a.sold);
  const shown = list.slice(0, page * PER);
  const stats: [string, string][] = [
    ["Live products", String(mine.length)],
    ["Units sold", short(mine.reduce((a, p) => a + p.sold, 0))],
    ["With samples", String(mine.filter((p) => p.samples > 0).length)],
    ["Best Silver rate", pct(Math.max(0, ...mine.map((p) => p.silverRate ?? 0)))],
  ];
  const pick = (s: string) => {
    setShop(s);
    setPage(1);
    window.history.replaceState(null, "", `?shop=${encodeURIComponent(s)}`);
  };

  return (
    <>
      <div className="nv-noscroll" role="tablist" aria-label="Golden Sellers" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "4px 2px" }}>
        {golden.map((g, i) => (
          <button key={g.shop} type="button" role="tab" aria-selected={cur.shop === g.shop} className={`gs-tab ${cur.shop === g.shop ? "on" : ""}`} onClick={() => pick(g.shop)}>
            <span className="gs-mono" aria-hidden="true">{g.initial}</span>#{i + 1} {g.shop}
          </button>
        ))}
      </div>

      <section className="gs-hero" aria-labelledby="gsname">
        <span className="gs-shine" aria-hidden="true" />
        <span className="gs-mono" aria-hidden="true" style={{ position: "relative" }}>{cur.initial}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", minWidth: 0 }}>
          <span className="gs-rank">#{rank} Golden Seller</span>
          <h2 id="gsname" style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>{cur.shop}</h2>
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>Every live product from this shop in our TAP campaigns</span>
        </div>
        <div className="gs-stats">
          {stats.map(([k, v]) => <div key={k} className="gs-stat"><span className="gs-k">{k}</span><span className="gs-v">{v}</span></div>)}
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{`${mine.length}${mine.length === 1 ? " product" : " products"} · ${SORT_TEXT[sort]}`}</span>
        <div className="nv-seg" role="group" aria-label="Sort products" style={{ width: 360, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${sort * 100}%)` }} />
          {SORTS.map((label, i) => (
            <button key={label} type="button" className={sort === i ? "on" : ""} aria-pressed={sort === i} onClick={() => { setSort(i); setPage(1); }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mk-grid">
        {shown.map((p) => <ProductCard key={p.id} p={p} tap={tap} onOpen={(x) => { setClosing(false); setOpen(x); }} />)}
      </div>
      {shown.length < list.length && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button type="button" className="nv-btn2 nv-press" onClick={() => setPage(page + 1)} style={{ minWidth: 260 }}>{`Show ${Math.min(PER, list.length - shown.length)} more · ${list.length - shown.length} left`}</button>
        </div>
      )}

      {open && <ProductPanel p={open} tap={tap} closing={closing} onClose={closePanel} />}
      <Hud toast={tap.toast} />
    </>
  );
}
