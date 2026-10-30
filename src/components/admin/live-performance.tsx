"use client";

import { Fragment, useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Av, Search } from "@/components/admin/bits";
import { when } from "@/components/admin/live-lists";
import { rm } from "@/lib/mock";

type Camp = { id: string; name: string; status: string; hidden?: boolean; products: number };
type Merchant = { shop: string; products: number; selling: number; gmv: number; orders: number; creators: number; samples: number; top: { name: string; gmv: number; orders: number }[] };

/**
 * Business › Live Performance on real data (owner, 31 Oct 2026): pick a Techwide campaign and see each merchant's results in
 * it, from TikTok's partner reports (lifetime totals). What to show a merchant when you call them.
 */
export function LivePerformance() {
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cid, setCid] = useState("");
  const [data, setData] = useState<{ merchants: Merchant[]; asOf: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/tap/campaigns", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { campaigns: Camp[] }) => {
        const list = d.campaigns.filter((c) => (c.status === "live" || c.status === "upcoming") && !c.hidden).sort((a, b) => b.products - a.products);
        setCamps(list);
        if (list[0]) setCid(list[0].id);
      })
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "TikTok Shop didn't answer. Please try again."));
  }, []);
  useEffect(() => {
    if (!cid) return;
    setLoading(true);
    setData(null);
    fetch(`/api/v2/admin/performance?campaign=${cid}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [cid]);
  const shown = (data?.merchants ?? []).filter((m) => !q || m.shop.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Live Performance" sub="Each merchant's results in a Techwide campaign, from TikTok. What to show a merchant when you call them." />
      {!camps ? <p className="v2-muted">{err ?? "Loading campaigns…"}</p> : (
        <>
          <div className="ad-bar" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="np-input" style={{ width: "auto", minWidth: 260 }} value={cid} onChange={(e) => setCid(e.target.value)} aria-label="Campaign">
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.products} products)</option>)}
            </select>
            <Search value={q} onChange={setQ} placeholder="Search merchant" />
          </div>
          {loading || !data ? <p className="v2-muted">{loading ? "Reading this campaign from TikTok…" : "Couldn't load this campaign."}</p> : (
            <section className="v2-card" style={{ padding: "8px 12px" }}>
              <div className="v2-tablewrap">
                <table className="v2-table ad-table">
                  <thead><tr><th>Merchant</th><th>Products</th><th>Selling</th><th>Orders</th><th>Creators</th><th>Samples asked</th><th style={{ textAlign: "right" }}>Sales</th></tr></thead>
                  <tbody>
                    {shown.map((m) => (
                      <Fragment key={m.shop}>
                        <tr className="click" onClick={() => setOpen(open === m.shop ? null : m.shop)}>
                          <td className="ad-nowrap"><span className="ad-cell"><Av name={m.shop} size={30} /><b>{m.shop}</b></span></td>
                          <td className="num">{m.products}</td>
                          <td className="num">{m.selling}</td>
                          <td className="num">{m.orders}</td>
                          <td className="num">{m.creators}</td>
                          <td className="num">{m.samples}</td>
                          <td style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{rm(m.gmv, 0)}</td>
                        </tr>
                        {open === m.shop && (
                          <tr>
                            <td colSpan={7}>
                              <small className="v2-small">Best products:</small>
                              {m.top.map((p) => <div key={p.name} className="v2-small">{p.name.slice(0, 80)} · {p.orders} orders · {rm(p.gmv, 0)}</div>)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No merchants match.</p>}
            </section>
          )}
          <p className="v2-small" style={{ margin: 0 }}>Lifetime totals since each product joined the campaign{data?.asOf ? ` · TikTok updated ${when(data.asOf)}` : ""}. Numbers can change for up to 14 days (cancellations, returns).</p>
        </>
      )}
    </div>
  );
}
