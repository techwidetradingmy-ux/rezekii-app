"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner } from "@/components/seller/seller-ui";
import { SELLER, rm, short } from "@/lib/mock";
import { SHOP_ITEMS, UPDATED, listStatus, type ShopItem } from "@/lib/mock-seller";

const FILTERS = ["All", "Not submitted", "Under review", "Live", "Not approved"] as const;
type Filter = (typeof FILTERS)[number];
const BADGE: Record<Exclude<Filter, "All">, string> = { "Not submitted": "badge-gray", "Under review": "badge-amber", Live: "", "Not approved": "badge-red" };

/** Every product in the connected shop, with its status in Techwide's TAP. */
export default function ShopProducts() {
  const { toast } = useDemo();
  const [items, setItems] = useState<ShopItem[]>(SHOP_ITEMS);
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [fix, setFix] = useState<ShopItem | null>(null);
  const [samples, setSamples] = useState(40);

  const count = (f: Filter) => (f === "All" ? items.length : items.filter((i) => listStatus(i.stage) === f).length);
  const shown = items.filter((i) => (filter === "All" || listStatus(i.stage) === filter) && i.name.toLowerCase().includes(q.trim().toLowerCase()));

  const sync = () => {
    setSyncing(true);
    window.setTimeout(() => { setSyncing(false); toast(`Synced · ${items.length} products, nothing new since 09:12`); }, 1000);
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Shop products" sub={<>Read from {SELLER.shop} on Seller Center · synced {UPDATED}</>}>
        <button type="button" className="btn-outline" onClick={sync} disabled={syncing}>
          {syncing ? <span className="sl-spin" /> : <Icon name="refresh" size={18} />} Sync now
        </button>
        <Link href="/seller/app/submit" className="np-btn v2-btn-sm" style={{ height: 42 }}>Submit products</Link>
      </Title>

      <ConnBanner />

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="sl-pinfo">
                  <strong>{p.name}</strong>
                  <small>{rm(p.price)} · {p.sold ? `${short(p.sold)} sold` : "No sales yet"} · Public commission {p.publicRate === null ? "unknown" : `${p.publicRate}%`}</small>
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
                  {st === "Live" && (
                    <span className="sl-rate">{p.publicRate}% <Icon name="arrow" size={12} /> <b>{p.tapRate}%</b> in TAP</span>
                  )}
                  {st === "Under review" && (
                    <small className="v2-small">{p.stage === "Submitted to TikTok" ? `With TikTok since ${p.dates?.["Submitted to TikTok"]}` : p.stage === "Under review" ? "Our team is checking it" : "Submitted"}</small>
                  )}
                  {st === "Not submitted" && <Link href="/seller/app/submit" className="np-btn v2-btn-sm">Submit</Link>}
                  {st === "Not approved" && <button type="button" className="np-btn v2-btn-sm" onClick={() => setFix(p)}>Fix</button>}
                  {st === "Live" && <Link href="/seller/app/changes" className="v2-link" style={{ fontSize: 13.5 }}>Change</Link>}
                  {st === "Under review" && <Link href="/seller/app/progress" className="v2-link" style={{ fontSize: 13.5 }}>Progress</Link>}
                </span>
              </div>
            );
          })}
          {shown.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>No products match. Try another filter.</p>}
        </div>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="link" size={16} /> Products you add to Techwide&apos;s TAP campaign directly in Seller Center show up here too, tagged From Seller Center.
      </p>

      {fix && (
        <Sheet title="Fix and resubmit" onClose={() => setFix(null)}>
          <div className="sl-prow" style={{ paddingTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fix.img} alt="" />
            <span className="sl-pinfo"><strong>{fix.name}</strong><span className="sl-reason">{fix.reason}</span></span>
          </div>
          <div className="v2-field">Samples per SKU <small>Must be more than 0. Most shops pick 30–50.</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => {
            setItems((all) => all.map((i) => (i.id === fix.id ? { ...i, stage: "Under review", samples, reason: undefined } : i)));
            setFix(null);
            toast(`${samples} samples added · back with our team for review`);
          }}>Resubmit with {samples} samples</button>
        </Sheet>
      )}
    </div>
  );
}
