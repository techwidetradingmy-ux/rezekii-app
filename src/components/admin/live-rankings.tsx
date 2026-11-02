"use client";

import { useCallback, useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Av } from "@/components/admin/bits";
import { NO_PHOTO } from "@/lib/live-perf";
import type { ListResult } from "@/modules/rankings/query.ts";
import { labelCase } from "@/lib/label-case";

type Status = {
  built: { day: string; at: string } | null;
  newestLists: string | null;
  building: boolean;
  search: { creators: number; running: boolean; left: number };
};
type Data = Status & { list: ListResult | null; categories: [string, string][] };

const VIEWS = ["Creators", "Products", "Videos", "LIVEs"] as const;
const SLOTS = ["1 day", "7 days", "30 days"] as const;
const dayOf = (v: string) => new Date(`${v}T12:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const stamp = (v: string) => new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(Math.round(v)));
const rm = (lo: number, hi: number) => `RM ${short(lo)}–${short(hi)}`;
const mins = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/**
 * Rankings for admins (owner, 31 Oct 2026: "keep the rankings we loaded in the admin dashboard, with a button at the top; it
 * doesn't renew by itself, only when an admin presses Refresh"). The same for the creator search.
 */
export function LiveRankings() {
  const [view, setView] = useState(0);
  const [slot, setSlot] = useState(0);
  const [cat, setCat] = useState("");
  const [pg, setPg] = useState(1);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"rankings" | "search" | null>(null);

  const load = useCallback(() => {
    fetch(`/api/v2/admin/rankings?view=${view}&slot=${slot}&cat=${cat}&pg=${pg}`, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("Sign in with a Techwide admin account to see this page.")) : r.ok ? r.json() : Promise.reject(new Error("Couldn't load the rankings."))))
      .then((x: Data) => { setD(x); setErr(null); })
      .catch((e: Error) => setErr(e.message));
  }, [view, slot, cat, pg]);
  useEffect(load, [load]);
  // While a batch or the search is running, check every 20 seconds so the page shows the new batch when it's in.
  useEffect(() => {
    if (!d?.building && !d?.search.running) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [d?.building, d?.search.running, load]);

  async function refresh(what: "rankings" | "search") {
    setBusy(what);
    const r = await fetch("/api/v2/admin/rankings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ what }) }).catch(() => null);
    const x = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) setErr(x?.error ?? "Couldn't start it. Try again.");
    else setD((old) => (old ? { ...old, ...x } : old));
    setBusy(null);
  }

  const l = d?.list;
  const catName = new Map(d?.categories ?? []);
  const pick = (f: () => void) => () => { f(); setPg(1); };
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Rankings" sub="TikTok Shop Malaysia's top creators, products, videos and LIVEs, built from TikTok's best-seller lists. It doesn't update by itself: press Refresh to build a new batch from the newest lists. Admins only." />

      <section className="v2-card flat rk-bar">
        <div>
          <b>Rankings</b>
          <small>
            {d?.built ? `From TikTok's lists of ${dayOf(d.built.day)} · built ${stamp(d.built.at)}` : "Not built yet"}
            {d?.building ? " · Building a new batch (about a minute)…" : d?.newestLists && d.built && d.newestLists > d.built.day ? ` · Newer lists ready: ${dayOf(d.newestLists)}` : ""}
          </small>
        </div>
        <button type="button" className="btn-outline v2-btn-sm" disabled={!d || d.building || busy !== null} onClick={() => refresh("rankings")}>
          <Icon name="refresh" size={15} /> {d?.building ? "Building…" : "Refresh"}
        </button>
      </section>
      <section className="v2-card flat rk-bar">
        <div>
          <b>Creator search</b>
          <small>{d ? `${d.search.creators.toLocaleString("en-MY")} creators found in TikTok's Creator Marketplace` : "…"}{d?.search.running ? ` · Searching (${d.search.left} parts left, takes a few hours)…` : ""}</small>
        </div>
        <button type="button" className="btn-outline v2-btn-sm" disabled={!d || d.search.running || busy !== null} onClick={() => refresh("search")}>
          <Icon name="refresh" size={15} /> {d?.search.running ? "Searching…" : "Refresh"}
        </button>
      </section>

      <div className="v2-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="v2-chips" role="group" aria-label="List">
          {VIEWS.map((v, i) => <button key={v} type="button" className={`v2-chip ${view === i ? "on" : ""}`} onClick={pick(() => { setView(i); setCat(""); })}>{v}</button>)}
        </div>
        <div className="v2-chips" role="group" aria-label="Period">
          {SLOTS.map((s, i) => <button key={s} type="button" className={`v2-chip ${slot === i ? "on" : ""}`} onClick={pick(() => setSlot(i))}>{labelCase(s)}</button>)}
        </div>
        {view === 1 && (
          <select className="np-input" style={{ width: 230, height: 38 }} value={cat} onChange={(e) => { setCat(e.target.value); setPg(1); }} aria-label="Category">
            <option value="">All categories</option>
            {(d?.categories ?? []).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
      </div>

      {err && <p className="v2-muted" style={{ margin: 0 }}>{err}</p>}
      {!d ? (!err && <p className="v2-muted">Loading…</p>) : !l ? (
        <section className="v2-card flat"><p className="v2-muted" style={{ margin: 0 }}>No rankings yet. Press Refresh to build them from the saved lists.</p></section>
      ) : (
        <section className="v2-card" style={{ padding: "8px 12px" }}>
          <div className="v2-card-h" style={{ padding: "0 8px" }}>
            <h2 className="v2-h2">Top {VIEWS[view].toLowerCase().replace("lives", "LIVEs")} · {SLOTS[slot]} to {dayOf(l.asOf)}</h2>
            <span className="v2-small">{l.total.toLocaleString("en-MY")} in this list · GMV is TikTok&apos;s range</span>
          </div>
          <div className="v2-tablewrap">
            <table className="v2-table ad-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{["Creator", "Product", "Video", "LIVE"][view]}</th>
                  <th>{["Followers", "Rating", "Views", "Length"][view]}</th>
                  <th style={{ textAlign: "right" }}>GMV</th>
                </tr>
              </thead>
              <tbody>
                {l.creators?.map(({ row: c, det }) => (
                  <tr key={c[1]}>
                    <td className="num">{c[0]}</td>
                    <td><span className="ad-cell">{det?.a ? <Img src={det.a} round /> : <Av name={c[2] || c[1]} size={32} />}<span><b>{c[2] || c[1]}</b><small>@{c[1]}</small></span></span></td>
                    <td>{c[3] ? c[3].toLocaleString("en-MY") : "—"}</td>
                    <td style={{ textAlign: "right" }}>{rm(c[5], c[6])}</td>
                  </tr>
                ))}
                {l.products?.map(({ row: r, meta: m }, i) => (
                  <tr key={m[0]}>
                    <td className="num">{cat ? r[4] : i + 1}</td>
                    <td><span className="ad-cell"><Img src={m[5]} /><span><b>{m[1]}</b><small>{m[2]} · {catName.get(m[4]) ?? m[4]}</small></span></span></td>
                    <td>{m[3] ? `${m[3]} ★` : "—"}</td>
                    <td style={{ textAlign: "right" }}>{rm(r[1], r[2])}</td>
                  </tr>
                ))}
                {l.videos?.map((v) => (
                  <tr key={v[1]}>
                    <td className="num">{v[0]}</td>
                    <td><span className="ad-cell"><Img src={v[13] ?? null} /><span><b>{v[2]}</b><small>Posted {v[10]}</small></span></span></td>
                    <td>{short(v[4])}</td>
                    <td style={{ textAlign: "right" }}>{rm(v[8], v[9])}</td>
                  </tr>
                ))}
                {l.lives?.map((x) => (
                  <tr key={`${x[1]}-${x[5]}`}>
                    <td className="num">{x[0]}</td>
                    <td><span className="ad-cell">{x[8] ? <Img src={x[8]} round /> : <Av name={x[2] || x[1]} size={32} />}<span><b>{x[2] || x[1]}</b><small>{x[3] || `@${x[1]}`} · {x[5]}</small></span></span></td>
                    <td>{mins(x[4])}</td>
                    <td style={{ textAlign: "right" }}>{rm(x[6], x[7])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {l.shown < l.total && (
            <div style={{ display: "flex", justifyContent: "center", padding: 10 }}>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => setPg((p) => p + 1)}>Show More</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Img({ src, round = false }: { src: string | null; round?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src ?? NO_PHOTO} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: round ? "50%" : 8, objectFit: "cover", flex: "none" }} />;
}
