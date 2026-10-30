"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Av, Pill } from "@/components/admin/bits";
import { day } from "@/components/admin/live-lists";
import { NO_PHOTO } from "@/lib/live-perf";
import { rm } from "@/lib/mock";

type Data = {
  product: { id: string; name: string; shop: string | null; image: string | null; category: string | null; price: number | null; sold: number | null; openRate: number | null; silverRate: number | null; stock: number | null; onRezekii: boolean; campaign: string | null; campaignEnd: number | null; samples: boolean };
  creators: { handle: string; name: string | null; gmv: number; videos: number; lives: number; sample: string | null; rate: number | null; asOf: string }[];
  wishes: { who: string; videos: number; lives: number; rights: number; months: number; note: string | null; at: string; declined: boolean; raise: number | null }[];
  requests: { id: string; status: string; raise_pct: number | null; samples_per_sku: number | null; reason: string | null; owner_name: string | null; created_at: string; updated_at: string; total_rate: number | null }[];
};
const pct = (r: number | null) => (r === null ? "—" : `${r / 100}%`);
const STAGE: Record<string, string> = { submitted: "Submitted", in_review: "In review", approved: "Approved by Techwide", with_tiktok: "With TikTok", live: "Live", not_approved: "Not approved", withdrawn: "Withdrawn" };

/** The admin Product page on real data (owner, 31 Oct 2026). */
export function LiveProduct({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/v2/admin/product?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => (r.status === 403 ? Promise.reject(new Error("Sign in with a Techwide admin account to see this page.")) : r.ok ? r.json() : Promise.reject(new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't load this product."))))
      .then(setD)
      .catch((e: Error) => setErr(e.message));
  }, [id]);
  if (!d) return <div className="v2-stack v2-in"><p className="v2-muted">{err ?? "Loading…"}</p>{err && <Link href="/admin/tap/requests" className="np-btn v2-btn-sm" style={{ alignSelf: "flex-start" }}>Open Wish List</Link>}</div>;
  const p = d.product;
  const gmv = d.creators.reduce((t, c) => t + c.gmv, 0);
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title={p.name} sub={`${p.shop ?? "Shop unknown"}${p.category ? ` · ${p.category}` : ""}`} />
      <section className="v2-card" style={{ flexDirection: "row", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image ?? NO_PHOTO} alt="" style={{ width: 120, height: 120, borderRadius: 14, objectFit: "cover" }} />
        <div className="v2-grid4 ad-stats" style={{ flex: 1, minWidth: 260 }}>
          <div className="v2-stat"><small>Price</small><b>{p.price !== null ? rm(p.price) : "—"}</b></div>
          <div className="v2-stat"><small>Sold on TikTok Shop</small><b>{p.sold?.toLocaleString("en-MY") ?? "—"}</b></div>
          <div className="v2-stat"><small>Open plan</small><b>{pct(p.openRate)}</b>{p.silverRate !== null && <em>{pct(p.silverRate)} for Silver and Gold</em>}</div>
          <div className="v2-stat"><small>On Rezekii</small><b>{p.onRezekii ? "Yes" : "Not yet"}</b>{p.campaign && <em>{p.campaign}</em>}</div>
        </div>
      </section>

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-card-h" style={{ padding: "0 8px" }}><h2 className="v2-h2">Creators Promoting It</h2><span className="v2-small">{d.creators.length} · {rm(gmv, 0)} through their links</span></div>
        {d.creators.length ? (
          <div className="v2-tablewrap">
            <table className="v2-table ad-table">
              <thead><tr><th>Creator</th><th>Videos</th><th>LIVEs</th><th>Sample</th><th>Rate</th><th style={{ textAlign: "right" }}>Sales</th></tr></thead>
              <tbody>{d.creators.map((c) => (
                <tr key={c.handle}>
                  <td className="ad-nowrap"><span className="ad-cell"><Av name={c.handle} size={30} /><span><b>{c.handle}</b><small>{c.name ?? ""}</small></span></span></td>
                  <td className="num">{c.videos}</td><td className="num">{c.lives}</td>
                  <td>{c.sample && c.sample !== "NotRequested" ? c.sample.replace(/([a-z])([A-Z])/g, "$1 $2") : "—"}</td>
                  <td>{c.rate !== null ? `${c.rate / 100}%` : "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>{rm(c.gmv, 0)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="v2-muted" style={{ padding: 12 }}>No creators promoting it in Techwide&apos;s campaign yet.</p>}
      </section>

      <div className="v2-grid2">
        <section className="v2-card" style={{ padding: "6px 20px" }}>
          <div className="v2-card-h"><h2 className="v2-h2">Seller&apos;s TAP Request</h2></div>
          <div className="ad-list">
            {d.requests.map((r) => (
              <div key={r.id} className="ad-row">
                <span className="main"><b>{STAGE[r.status] ?? r.status}</b><small>{r.raise_pct ? `+${r.raise_pct}% · ` : ""}{r.samples_per_sku ? `${r.samples_per_sku} samples per variant · ` : ""}since {day(r.created_at)}{r.owner_name ? ` · ${r.owner_name}` : ""}</small>{r.reason && <small>{r.reason}</small>}</span>
                <Pill tone={r.status === "live" ? "ok" : r.status === "not_approved" ? "bad" : "info"}>{STAGE[r.status] ?? r.status}</Pill>
              </div>
            ))}
            {!d.requests.length && <p className="v2-muted" style={{ margin: 0 }}>The seller hasn&apos;t sent it through Rezekii.</p>}
          </div>
        </section>
        <section className="v2-card" style={{ padding: "6px 20px" }}>
          <div className="v2-card-h"><h2 className="v2-h2">Creators&apos; Wishes</h2><span className="badge">{d.wishes.length}</span></div>
          <div className="ad-list">
            {d.wishes.map((w, i) => (
              <div key={i} className="ad-row">
                <span className="main"><b>{w.who}</b><small>{w.videos} videos{w.lives ? `, ${w.lives} LIVE` : ""} a month for {w.months} month{w.months === 1 ? "" : "s"}{w.rights ? ` · ${w.rights} days ad rights` : ""} · {day(w.at)}</small>{w.note && <small>“{w.note}”</small>}</span>
                {w.declined ? <Pill tone="bad">Seller said no</Pill> : w.raise !== null ? <Pill tone="ok">+{w.raise}%</Pill> : null}
              </div>
            ))}
            {!d.wishes.length && <p className="v2-muted" style={{ margin: 0 }}>No creator has wished for it.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
