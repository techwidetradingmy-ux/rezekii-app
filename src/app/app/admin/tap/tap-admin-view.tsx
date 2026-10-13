"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminCampaign, AdminTapProduct } from "@/modules/admin/tap.ts";
import { n, pct, pulled, rm } from "../../marketplace/format";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../links/links.css";
import "../admin.css";

const COLS = "minmax(280px, 3fr) 70px 70px 100px 130px 120px";
const day = (s: number | null, year = false) => (s ? new Date(s * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "Asia/Kuala_Lumpur" }) : "");
const STATUS: Record<AdminCampaign["status"], [string, string]> = { live: ["Live", "b-green"], upcoming: ["Upcoming", "b-blue"], ended: ["Ended", "b-gray"] };

/** Techwide's TAP campaigns, as designed in the mockup (TAP): campaign cards and each campaign's products. */
export function TapAdminView({ asOf, campaigns, firstProducts }: { asOf: string | null; campaigns: AdminCampaign[]; firstProducts: AdminTapProduct[] }) {
  const [sel, setSel] = useState(campaigns[0]?.id ?? "");
  const [products, setProducts] = useState<Record<string, AdminTapProduct[]>>(campaigns[0] ? { [campaigns[0].id]: firstProducts } : {});
  const [loading, setLoading] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [cq, setCq] = useState("");
  const [allCards, setAllCards] = useState(false);
  const [limit, setLimit] = useState(100);
  const [f, setF] = useState<0 | 1>(0);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const camp = campaigns.find((c) => c.id === sel);
  const all = products[sel] ?? [];
  const ended = campaigns.filter((c) => c.status === "ended").length;
  const qq = cq.trim().toLowerCase();
  const matching = campaigns.filter((c) => (showEnded || c.status !== "ended" || c.id === sel) && (!qq || c.name.toLowerCase().includes(qq)));
  const cards = allCards || qq ? matching : matching.slice(0, 9);

  function pick(id: string) {
    setSel(id);
    setF(0);
    setOpenRows({});
    setLimit(100);
    if (products[id]) return;
    setLoading(true);
    fetch(`/api/admin/tap?campaign=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products?: AdminTapProduct[] }) => setProducts((p) => ({ ...p, [id]: d.products ?? [] })))
      .catch(() => setProducts((p) => ({ ...p, [id]: [] })))
      .finally(() => setLoading(false));
  }
  const list = all.filter((p) => f === 0 || p.samples > 0);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="nv-title">TAP campaigns</h1>
          <p className="nv-sub">From Techwide&apos;s TikTok Shop partner account · what creators see in the Marketplace</p>
        </div>
        <span className="ad-pill" style={{ fontWeight: 700 }}>{asOf ? `Refreshed daily · pulled ${pulled(asOf)}` : "Not refreshed yet"}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <label htmlFor="tpq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search campaigns</label>
        <input id="tpq" type="text" className="nv-input" placeholder={`Search ${campaigns.length} campaigns`} value={cq} onChange={(e) => setCq(e.target.value)} style={{ flex: "1 1 260px", maxWidth: 420 }} />
        {ended > 0 && (
          <button type="button" className={`nv-chip nv-press${showEnded ? " on" : ""}`} aria-pressed={showEnded} onClick={() => setShowEnded(!showEnded)}>Include {ended} ended</button>
        )}
      </div>
      <section className="nv-up" aria-label="Campaigns" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <button key={c.id} type="button" className="nv-card nv-hover nv-press" aria-pressed={sel === c.id} onClick={() => pick(c.id)} style={{ border: `2px solid ${sel === c.id ? "#00c073" : "transparent"}`, padding: 20, textAlign: "left", color: "var(--text)", display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow)", background: "var(--surface)" }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className={`nv-badge ${STATUS[c.status][1]}`}>{c.status === "upcoming" && c.start ? `Starts ${day(c.start)}` : STATUS[c.status][0]}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.start || c.end ? `${day(c.start)} – ${day(c.end, true)}` : ""}</span>
            </span>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{c.name}</span>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--muted)" }}>
              <span><strong style={{ color: "var(--text)", fontSize: 18 }}>{n(c.products)}</strong> products</span>
              <span><strong style={{ color: "var(--text)", fontSize: 18 }}>{n(c.creators)}</strong> creators</span>
              {c.upto > 0 && <span style={{ alignSelf: "center" }}>up to {pct(c.upto)}</span>}
            </span>
          </button>
        ))}
        {!campaigns.length && <div className="nv-card" style={{ padding: 32, color: "var(--muted)" }}>No TAP campaigns yet. They appear after the daily refresh reads Techwide&apos;s partner account.</div>}
      </section>
      {!qq && matching.length > 9 && (
        <button type="button" className="nv-link" style={{ alignSelf: "flex-start" }} onClick={() => setAllCards(!allCards)}>
          {allCards ? "Show fewer campaigns" : `Show all ${matching.length} campaigns`}
        </button>
      )}

      {camp && (
        <section className="nv-up nv-card" aria-labelledby="tpprod" style={{ animationDelay: "80ms", overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <h2 id="tpprod" className="nv-h2" style={{ flex: 1, minWidth: 200 }}>{camp.name} · products</h2>
            <div className="nv-seg" role="group" aria-label="Show" style={{ width: 300, maxWidth: "100%" }}>
              <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: f === 0 ? "translateX(0)" : "translateX(100%)" }} />
              <button type="button" className={f === 0 ? "on" : ""} aria-pressed={f === 0} onClick={() => setF(0)}>All products</button>
              <button type="button" className={f === 1 ? "on" : ""} aria-pressed={f === 1} onClick={() => setF(1)}>With samples {all.filter((p) => p.samples > 0).length}</button>
            </div>
            <Link href="/app/admin/samples" className="nv-link" style={{ fontSize: 13 }}>Sample requests: Rezekii queue</Link>
          </div>
          <div className="nv-scrollx">
            <div role="table" aria-label="Campaign products" style={{ minWidth: 900 }}>
              <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: COLS }}>
                <span role="columnheader">Product</span><span role="columnheader">Open</span><span role="columnheader">TAP</span><span role="columnheader">Sold</span><span role="columnheader">Samples</span><span role="columnheader">Status</span>
              </div>
              {list.slice(0, limit).map((p) => {
                const isOpen = !!openRows[p.id];
                return (
                  <div key={p.id}>
                    <div role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: COLS }}>
                      <span role="cell" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: "var(--surface2)", flexShrink: 0 }} />
                        )}
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.shop}</span>
                        </span>
                      </span>
                      <span role="cell" style={{ color: "var(--muted)" }}>{pct(p.open)}</span>
                      <span role="cell" style={{ fontWeight: 800, color: "var(--gink)" }}>{pct(p.total)}</span>
                      <span role="cell">{n(p.sold)}</span>
                      <span role="cell">
                        <button type="button" className="nv-link" onClick={() => setOpenRows({ ...openRows, [p.id]: !isOpen })} aria-expanded={isOpen} style={{ color: "var(--text)", fontWeight: 700 }}>
                          {p.samples ? `${n(p.samples)} left` : "None"} <span style={{ color: "var(--muted)", fontWeight: 600 }}>{isOpen ? "▲" : "▼"}</span>
                        </button>
                      </span>
                      <span role="cell"><span className={`nv-badge ${!p.available ? "b-gray" : camp.status === "ended" ? "b-gray" : "b-green"}`}>{!p.available ? "Not available" : camp.status === "ended" ? "Ended" : "Live"}</span></span>
                    </div>
                    {isOpen && (
                      <div className="nv-expand" style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "10px 12px 12px 70px", background: "var(--surface2)", borderBottom: "1px solid var(--line)" }}>
                        {p.variants.map(([name, price, stock]) => (
                          <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: "var(--surface)", fontSize: 13 }}>
                            <span style={{ fontWeight: 700 }}>{name}</span>
                            <span style={{ color: "var(--muted)" }}>{rm(price)} · {n(stock)} in stock</span>
                          </span>
                        ))}
                        <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{p.samples ? `${n(p.samples)} free samples left for this product · quotas are set by the shop` : "This shop offers no free samples"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {!loading && list.length > limit && (
            <div style={{ padding: 16, display: "flex", justifyContent: "center", borderTop: "1px solid var(--line)" }}>
              <button type="button" className="nv-btn2 nv-press" onClick={() => setLimit(limit + 100)}>Show more ({n(list.length - limit)} left)</button>
            </div>
          )}
          {loading && <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>{[0, 1, 2].map((i) => <span key={i} className="nv-skel" style={{ height: 46 }} />)}</div>}
          {!loading && !list.length && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", borderTop: "1px solid var(--line)" }}>{f === 1 ? "No products with free samples in this campaign." : "No products in this campaign."}</div>}
        </section>
      )}
    </>
  );
}
