"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Count, Stat, Title } from "@/components/ui";
import { Ava, Source } from "@/components/seller/seller-ui";
import { rm } from "@/lib/mock";
import { sellerProductHref } from "@/lib/product-pages";
import { NO_PHOTO, shortName } from "@/lib/live-perf";

type Results = {
  linked: boolean;
  totals: { gmv: number; orders: number; creators: number; videos: number; lives: number; live: number };
  products: { id: string; name: string; img: string | null; gmv: number; orders: number; creators: number; selling: number; samples: number; videos: number; lives: number }[];
  creators: { handle: string; name: string; avatar: string | null; followers: number; gmv: number; videos: number; lives: number }[];
  asOf: string | null;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "not yet";

/** A CSV of the per-product numbers, saved on her device. */
function exportCsv(r: Results) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["Product", "Product ID", "Sales (RM)", "Orders", "Creators", "Creators selling", "Samples asked", "Videos", "LIVEs"], ...r.products.map((p) => [p.name, p.id, p.gmv.toFixed(2), p.orders, p.creators, p.selling, p.samples, p.videos, p.lives])];
  const blob = new Blob([rows.map((row) => row.map(q).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rezekii-tap-results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * TAP Performance on real data (owner, 31 Oct 2026). TikTok reports lifetime totals for campaign products, so there are no
 * 7/30/90-day tabs or daily chart here: everything is since each product went live.
 */
export function LiveResults() {
  const { toast } = useDemo();
  const [r, setR] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/v2/seller/results", { cache: "no-store" })
      .then((x) => (x.ok ? x.json() : null))
      .then((d: Results | null) => (d ? setR(d) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (!r) {
    return (
      <div className="v2-stack v2-in">
        <Title title="TAP Performance" />
        <p className="v2-muted">{failed ? "Couldn't reach TikTok Shop. Please try again." : "Loading your results from TikTok…"}</p>
      </div>
    );
  }
  if (!r.linked) {
    return (
      <div className="v2-stack v2-in">
        <Title title="TAP Performance" />
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>Connect your Seller Center shop</b>
          <p className="v2-muted" style={{ margin: 0 }}>Your TAP results show here once your shop is connected.</p>
          <Link href="/seller/app/account" className="np-btn v2-btn-sm">Connect shop</Link>
        </section>
      </div>
    );
  }
  const t = r.totals;
  return (
    <div className="v2-stack v2-in">
      <Title title="TAP Performance" sub={<Source when={when(r.asOf)} />}>
        <button type="button" className="btn-outline" disabled={!r.products.length} onClick={() => { exportCsv(r); toast("Report saved as CSV"); }}><Icon name="doc" size={18} /> Export</button>
      </Title>

      <section className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Stat label="Sales (GMV)" value={<Count value={t.gmv} format={(n) => rm(n, 0)} />} note="Since each product went live" />
        <Stat label="Orders" value={<Count value={t.orders} />} />
        <Stat label="Creators promoting" value={<Count value={t.creators} />} />
        <Stat label="Videos" value={<Count value={t.videos} />} />
        <Stat label="LIVEs" value={<Count value={t.lives} />} />
        <Stat label="Products live" value={<Count value={t.live} />} note="In Techwide's TAP" />
      </section>

      {!r.products.length ? (
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>No products live in TAP yet</b>
          <p className="v2-muted" style={{ margin: 0 }}>Register products and their results show here once they&apos;re live.</p>
          <Link href="/seller/app/submit" className="np-btn v2-btn-sm">Register products</Link>
        </section>
      ) : (
        <div className="v2-split">
          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">Top Creators</h2><span className="v2-small">Since live</span></div>
            {r.creators.length ? (
              <div className="v2-tablewrap">
                <table className="v2-table">
                  <thead>
                    <tr><th>Creator</th><th>Videos</th><th>LIVEs</th><th style={{ textAlign: "right" }}>Sales</th></tr>
                  </thead>
                  <tbody>
                    {r.creators.map((c) => (
                      <tr key={c.handle}>
                        <td><span className="v2-row" style={{ flexWrap: "nowrap", gap: 8 }}><Ava name={`@${c.handle}`} /><span style={{ display: "flex", flexDirection: "column" }}><b style={{ whiteSpace: "nowrap" }}>@{c.handle}</b><small className="v2-small">{c.followers.toLocaleString("en-MY")} followers</small></span></span></td>
                        <td>{c.videos}</td>
                        <td>{c.lives}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{rm(c.gmv, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="v2-muted" style={{ margin: 0 }}>No creators promoting your products yet. Creators on Rezekii see them in the Marketplace.</p>
            )}
          </section>

          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">By Product</h2><span className="v2-small">Sales</span></div>
            <Bars rows={r.products.map((p) => ({ label: shortName(p.name), value: p.gmv, display: rm(p.gmv, 0), href: sellerProductHref(p.id) }))} />
            <div className="v2-divide">
              {r.products.map((p) => (
                <div key={p.id} className="sl-act" style={{ gridTemplateColumns: "36px minmax(0,1fr)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img ?? NO_PHOTO} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                  <span><b style={{ fontSize: 14 }}><Link href={sellerProductHref(p.id)} className="pv-open">{shortName(p.name)}</Link></b><small>{p.orders.toLocaleString("en-MY")} orders · {p.creators} creators · {p.videos} videos{p.samples ? ` · ${p.samples} asked for samples` : ""}</small></span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <p className="v2-small" style={{ margin: 0 }}>TAP sales only, from TikTok. Numbers can change for up to 14 days (cancellations, returns).</p>
    </div>
  );
}
