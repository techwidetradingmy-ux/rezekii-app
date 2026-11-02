"use client";

import "@/app/seller.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner } from "@/components/seller/seller-ui";
import { SELLER, rm, short } from "@/lib/mock";
import { SHOP_ITEMS, UPDATED, listStatus, type ShopItem } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { useKept } from "@/lib/keep";
import { loadShop } from "@/lib/live";

const FILTERS = ["All", "Not submitted", "Under review", "Live", "Not approved"] as const;
type Filter = (typeof FILTERS)[number];
const BADGE: Record<Exclude<Filter, "All">, string> = { "Not submitted": "badge-gray", "Under review": "badge-amber", Live: "", "Not approved": "badge-red" };

/** Every product in the connected shop, with its status in Techwide's TAP. */
export default function ShopProducts() {
  const { toast, live } = useDemo();
  const [items, setItems] = useState<ShopItem[]>(SHOP_ITEMS);
  // Signed in (owner, 30 Oct 2026): the real products of the shop this account authorized in Seller Center.
  const [shop, setShop] = useState<{ name: string; at: string; notLive: number } | null>(null);
  const [noShop, setNoShop] = useState(false);
  const [filter, setFilter] = useKept<Filter>("sp-filter", "All");
  const [q, setQ] = useKept("sp-q", "");
  const [syncing, setSyncing] = useState(false);
  const [fix, setFix] = useState<ShopItem | null>(null);
  const [samples, setSamples] = useState(40);

  const count = (f: Filter) => (f === "All" ? items.length : items.filter((i) => listStatus(i.stage) === f).length);
  const shown = items.filter((i) => (filter === "All" || listStatus(i.stage) === filter) && i.name.toLowerCase().includes(q.trim().toLowerCase()));

  const loadReal = (said: boolean) => {
    setSyncing(true);
    loadShop(said)
      .then((s) => {
        setNoShop(!s);
        setShop(s && { name: s.shop, at: s.at, notLive: s.notLive });
        setItems(s?.items ?? []);
        if (s && said) toast(`Synced · ${s.items.length} product${s.items.length === 1 ? "" : "s"}`);
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setSyncing(false));
  };
  useEffect(() => {
    if (!live) return;
    setItems([]);
    loadReal(false);
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => {
    if (live) return loadReal(true);
    setSyncing(true);
    window.setTimeout(() => { setSyncing(false); toast(`Synced · ${items.length} products, nothing new`); }, 1000);
  };
  const syncedAt = (t: string) => `today ${new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}`;

  return (
    <div className="v2-stack v2-in">
      <Title title="Shop Products" sub={!live ? <>{SELLER.shop} · synced {UPDATED}</> : shop ? <>{shop.name} · synced {syncedAt(shop.at)}{shop.notLive ? ` · ${shop.notLive} not live in Seller Center` : ""}</> : noShop ? "No Seller Center shop connected" : "Loading your shop…"}>
        <button type="button" className="btn-outline" onClick={sync} disabled={syncing}>
          {syncing ? <span className="sl-spin" /> : <Icon name="refresh" size={18} />} Sync now
        </button>
        <Link href="/seller/app/submit" className="np-btn v2-btn-sm" style={{ height: 42 }}>Register Products</Link>
      </Title>

      <ConnBanner shop={live ? !noShop : undefined} />

      <div className="sl-chipline" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f} <small>{count(f)}</small>
          </button>
        ))}
      </div>

      <section className="v2-card">
        <input className="np-input" type="search" aria-label="Search your products" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" />
        <div>
          {shown.map((p) => {
            const st = listStatus(p.stage);
            return (
              <div key={p.id} className="sl-prow">
                {/* Product (owner, 29 Oct 2026): the photo and name open the product's page; the row's buttons stay. */}
                <Link href={sellerProductHref(p.id)} className="pg-rowimg" aria-label={`Open ${p.name}`} tabIndex={-1}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                </Link>
                <span className="sl-pinfo">
                  <strong><Link href={sellerProductHref(p.id)} className="pg-name">{p.name}</Link></strong>
                  <small>{rm(p.price)}{p.soldLabel ? ` · ${p.soldLabel}` : p.salesUnknown ? "" : ` · ${p.sold ? `${short(p.sold)} sold` : "No sales yet"}`} · Public {p.publicRate === null ? "unknown" : `${p.publicRate}%`}</small>
                  {(p.fromSellerCenter || p.note) && (
                    <span className="v2-row">
                      {p.fromSellerCenter && <span className="badge badge-blue">From Seller Center</span>}
                      {p.note && st === "Not submitted" && <span className="badge badge-gray">{p.note}</span>}
                    </span>
                  )}
                  {st === "Not approved" && p.reason && <span className="sl-reason">{p.reason}</span>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${BADGE[st]}`}>{st}</span>
                  {st === "Live" && p.tapRate !== undefined && (
                    <span className="sl-rate">{p.publicRate}% <Icon name="arrow" size={12} /> <b>{p.tapRate}%</b> in TAP</span>
                  )}
                  {st === "Under review" && (
                    <small className="v2-small">{p.stage === "Submitted to TikTok" ? `With TikTok since ${p.dates?.["Submitted to TikTok"]}` : p.stage === "Under review" ? "Our review" : "Submitted"}</small>
                  )}
                  {st === "Not submitted" && p.listing !== "PENDING" && <Link href="/seller/app/submit" className="np-btn v2-btn-sm">Register</Link>}
                  {st === "Not approved" && (p.real
                    ? <Link href="/seller/app/submit" className="np-btn v2-btn-sm">Register Again</Link>
                    : <button type="button" className="np-btn v2-btn-sm" onClick={() => setFix(p)}>Fix</button>)}
                  {st === "Live" && <Link href="/seller/app/changes" className="v2-link" style={{ fontSize: 13.5 }}>Change</Link>}
                  {st === "Under review" && p.register && <a href={p.register} target="_blank" rel="noopener noreferrer" className="np-btn v2-btn-sm">Register in Seller Center</a>}
                  {st === "Under review" && !p.register && <Link href="/seller/app/progress" className="v2-link" style={{ fontSize: 13.5 }}>Progress</Link>}
                </span>
              </div>
            );
          })}
          {shown.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>{live && syncing && !items.length ? "Loading your products…" : live && noShop ? "Connect Seller Center to see your products." : live && !items.length ? "No products live or in TikTok review yet." : "No products match."}</p>}
        </div>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="link" size={16} /> Products added in Seller Center show here too.
      </p>

      {fix && (
        <Sheet title="Fix and Resubmit" onClose={() => setFix(null)}>
          <div className="sl-prow" style={{ paddingTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fix.img} alt="" />
            <span className="sl-pinfo"><strong>{fix.name}</strong><span className="sl-reason">{fix.reason}</span></span>
          </div>
          <div className="v2-field">Samples per SKU <small>Most shops pick 30–50</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => {
            setItems((all) => all.map((i) => (i.id === fix.id ? { ...i, stage: "Under review", samples, reason: undefined } : i)));
            setFix(null);
            toast(`${samples} samples added · resubmitted`);
          }}>Resubmit with {samples} samples</button>
        </Sheet>
      )}
    </div>
  );
}
