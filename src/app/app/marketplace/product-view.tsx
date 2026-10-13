"use client";

import Link from "next/link";
import { useState } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";
import { pct, perSale, priceRange, rm, short, tiktokProductUrl } from "./format";
import { useTapActions } from "./use-tap-actions";

/** One product in the Marketplace grid. Clicking it opens the product view. */
export function ProductCard({ p, onOpen }: { p: TapProduct; onOpen: (p: TapProduct) => void }) {
  return (
    <button type="button" className="card tap-card" onClick={() => onOpen(p)}>
      <span className="tap-img">
        {/* TikTok's image CDN, already resized to 300px webp. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image ? <img src={p.image} alt="" loading="lazy" width={300} height={300} /> : <span className="tap-noimg" aria-hidden="true">?</span>}
        {p.samples > 0 && <span className="badge tap-samplebadge">Free sample</span>}
      </span>
      <span className="tap-name">{p.name}</span>
      <span className="tap-meta">{rm(p.priceLo)} · {short(p.sold)} sold{p.soldToday > 0 && <b> · +{short(p.soldToday)} today</b>}</span>
      <span className="tap-earn">
        <b>Earn {pct(p.openRate)}</b>
        {p.silverRate !== null && p.silverRate > (p.openRate ?? 0) && <small>Silver {pct(p.silverRate)}</small>}
      </span>
    </button>
  );
}

/** The full product: used in the Marketplace panel and on its own page, so both look the same. */
export function ProductView({ p, requested: wasRequested, onRequested, standalone = false }: { p: TapProduct; requested: boolean; onRequested?: (id: string) => void; standalone?: boolean }) {
  const [justRequested, setJustRequested] = useState(false);
  const requested = wasRequested || justRequested;
  const { busy, message, addToShowcase, requestSample } = useTapActions((id) => {
    setJustRequested(true);
    onRequested?.(id);
  });
  const silver = p.silverRate !== null && p.silverRate > (p.openRate ?? 0);
  const ends = p.campaignEnd ? new Date(p.campaignEnd * 1000).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }) : null;
  return (
    <article className="tap-view">
      <div className="tap-viewtop">
        <span className="tap-img tap-img-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image ? <img src={p.image} alt="" width={300} height={300} /> : <span className="tap-noimg" aria-hidden="true">?</span>}
        </span>
        <div className="tap-viewhead">
          <small className="tap-shop">{[p.shop, p.category].filter(Boolean).join(" · ")}</small>
          <h2>{p.name}</h2>
          <p className="tap-meta">
            {priceRange(p.priceLo, p.priceHi)} · {short(p.sold)} sold{p.soldToday > 0 && <> · <b>+{short(p.soldToday)} today</b></>}
            {p.stock !== null && <> · {short(p.stock)} in stock</>}
          </p>
        </div>
      </div>

      <dl className="tap-rates">
        <div><dt>Bronze earns</dt><dd>{pct(p.openRate)}<small>{perSale(p.priceLo, p.openRate)} a sale</small></dd></div>
        {silver && <div><dt>Silver &amp; Gold earn</dt><dd>{pct(p.silverRate)}<small>{perSale(p.priceLo, p.silverRate)} a sale</small></dd></div>}
        <div><dt>Free samples</dt><dd>{p.samples > 0 ? short(p.samples) : "None"}<small>{p.samples > 0 ? "left in this campaign" : "right now"}</small></dd></div>
      </dl>

      {p.variants.length > 1 && (
        <details className="tap-variants">
          <summary>Options and stock</summary>
          {/* Variant prices are TikTok's list price before discounts, so only names and stock are shown. */}
          <ul>{p.variants.map(([name, , stock], i) => <li key={i}><span>{name}</span><span>{short(stock)} left</span></li>)}</ul>
        </details>
      )}

      <div className="tap-cta">
        <button type="button" className="np-btn" disabled={!!busy} onClick={() => addToShowcase(p.id)}>{busy === "link" ? "Making your link…" : "Add to showcase"}</button>
        {p.samples > 0 && (
          <button type="button" className="btn-outline tap-samplebtn" disabled={!!busy || requested} onClick={() => requestSample(p.id)}>
            {requested ? "Sample requested" : busy === "sample" ? "Sending…" : "Request free sample"}
          </button>
        )}
      </div>
      {message && <p className={message.kind === "ok" ? "np-note" : "np-error"} role="status">{message.text}</p>}
      {requested && !message && <p className="np-note">You asked for this sample. <Link href="/app/samples">Follow it in My samples</Link>.</p>}

      <p className="tap-fine">
        {p.campaignName && <>Techwide campaign: {p.campaignName}{ends && <>, until {ends}</>}. </>}
        Numbers from TikTok Shop, updated {p.asOf.slice(0, 10)}.{" "}
        <a href={tiktokProductUrl(p.id)} target="_blank" rel="noopener noreferrer">Open on TikTok Shop</a>
        {!standalone && <> · <Link href={`/app/marketplace/${p.id}`}>Product page</Link></>}
      </p>
    </article>
  );
}
