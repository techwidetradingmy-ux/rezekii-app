"use client";

import { useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Av } from "@/components/admin/bits";
import { NO_PHOTO } from "@/lib/live-perf";

type Item = { rank: number; id: string | null; name: string; sub: string; img: string | null; rating: number | null; followers?: number | null; gmv: string | null };
type Data = { salesDay: string | null; fetchedAt: string | null; items: Item[]; categories: [string, string][] };
const dayOf = (v: string) => new Date(`${v}T12:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const stamp = (v: string) => new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const PERIOD: Record<string, string> = { "1D": "1 day", "7D": "7 days", "30D": "30 days" };

/**
 * TikTok's best-seller lists for admins only (owner, 31 Oct 2026): the newest TikTok has published, read as soon as it's out.
 * Creators don't see these. Each list says which day's sales it covers.
 */
export function LiveBestSellers() {
  const [list, setList] = useState<"products" | "creators">("products");
  const [period, setPeriod] = useState("1D");
  const [cat, setCat] = useState("ALL");
  const [currency, setCurrency] = useState<"LOCAL" | "USD">("LOCAL");
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setD(null);
    fetch(`/api/v2/admin/best?list=${list}&period=${period}&cat=${cat}&currency=${currency}`, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("Sign in with a Techwide admin account to see this page.")) : r.ok ? r.json() : Promise.reject(new Error("Couldn't load the list."))))
      .then(setD)
      .catch((e: Error) => setErr(e.message));
  }, [list, period, cat, currency]);
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="TikTok Best Sellers" sub="TikTok Shop Malaysia's best-selling products and creators, as TikTok publishes them. Admins only." />
      <div className="v2-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="v2-chips" role="group" aria-label="List">
          {(["products", "creators"] as const).map((l) => <button key={l} type="button" className={`v2-chip ${list === l ? "on" : ""}`} onClick={() => setList(l)}>{l === "products" ? "Products" : "Creators"}</button>)}
        </div>
        <div className="v2-chips" role="group" aria-label="Period">
          {Object.entries(PERIOD).map(([k, label]) => <button key={k} type="button" className={`v2-chip ${period === k ? "on" : ""}`} onClick={() => setPeriod(k)}>{label}</button>)}
        </div>
        {list === "products" && (
          <select className="np-input" style={{ width: 230, height: 38 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="ALL">All categories</option>
            {(d?.categories ?? []).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <div className="v2-chips" role="group" aria-label="Currency">
          {(["LOCAL", "USD"] as const).map((c) => <button key={c} type="button" className={`v2-chip ${currency === c ? "on" : ""}`} onClick={() => setCurrency(c)}>{c === "LOCAL" ? "RM" : "USD"}</button>)}
        </div>
      </div>
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : !d.salesDay ? (
        <section className="v2-card flat"><p className="v2-muted" style={{ margin: 0 }}>TikTok hasn&apos;t sent this list yet.</p></section>
      ) : (
        <section className="v2-card" style={{ padding: "8px 12px" }}>
          <div className="v2-card-h" style={{ padding: "0 8px" }}>
            <h2 className="v2-h2">Sales {period === "1D" ? `on ${dayOf(d.salesDay)}` : `in the ${PERIOD[period]} to ${dayOf(d.salesDay)}`}</h2>
            <span className="v2-small">TikTok publishes each day&apos;s list the next afternoon{d.fetchedAt ? ` · read ${stamp(d.fetchedAt)}` : ""}</span>
          </div>
          <div className="v2-tablewrap">
            <table className="v2-table ad-table">
              <thead><tr><th>#</th><th>{list === "products" ? "Product" : "Creator"}</th>{list === "products" ? <th>Rating</th> : <th>Followers</th>}<th style={{ textAlign: "right" }}>GMV range (TikTok&apos;s figure)</th></tr></thead>
              <tbody>{d.items.map((x) => (
                <tr key={`${x.rank}-${x.id}`}>
                  <td className="num">{x.rank}</td>
                  <td>
                    <span className="ad-cell">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {list === "products" ? <img src={x.img ?? NO_PHOTO} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} /> : <Av name={x.sub || x.name} size={32} />}
                      <span><b>{x.name}</b><small>{x.sub}</small></span>
                    </span>
                  </td>
                  <td>{list === "products" ? (x.rating !== null ? `${x.rating} ★` : "—") : x.followers != null ? x.followers.toLocaleString("en-MY") : "—"}</td>
                  <td style={{ textAlign: "right" }}>{x.gmv ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
