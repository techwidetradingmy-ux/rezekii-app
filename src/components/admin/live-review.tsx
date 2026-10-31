"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Pill } from "@/components/admin/bits";
import { NO_PHOTO } from "@/lib/live-perf";

type Item = { id: string; name: string; shop: string | null; image: string | null; open: number | null; total: number | null; sold: number; stock: number | null; samples: number; available: boolean; variants: [string, number | null, number][] };
type Shop = { shop: string; campaignId: string; products: Item[]; error: string | null };
type Data = { shops: Shop[]; reasons: [string, string][] };
const pct = (r: number | null) => (r === null ? "—" : `${r / 100}%`);

/**
 * Product Review on real data (owner, 31 Oct 2026): products shops registered in their own campaign, waiting for Techwide.
 * Approve or decline here (TikTok's review API); a decline needs the reason, which the shop sees in Rezekii.
 */
export function LiveProductReview() {
  const { toast } = useDemo();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [why, setWhy] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, "approved" | "declined">>({});
  const load = () =>
    fetch("/api/v2/admin/review", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("Sign in with a Techwide admin account to see this page.")) : r.ok ? r.json() : Promise.reject(new Error("Couldn't reach TikTok Shop. Please try again."))))
      .then((x: Data) => { setD(x); setErr(null); })
      .catch((e: Error) => setErr(e.message));
  useEffect(() => { void load(); }, []);

  const decide = async (s: Shop, p: Item, approve: boolean) => {
    const reason = why[p.id];
    if (!approve && !reason) return toast("Pick the reason the shop will see.");
    setBusy(p.id);
    const r = await fetch("/api/admin/tap/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaign: s.campaignId, product: p.id, name: p.name, decision: approve ? "approve" : "decline", reason, item: p }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    if (!r?.ok) return toast(x?.error ?? "TikTok didn't take the decision. Please try again.");
    setDone((m) => ({ ...m, [p.id]: approve ? "approved" : "declined" }));
    toast(approve ? `Approved: ${p.name.slice(0, 40)}. ${s.shop} is told.` : `Declined: ${p.name.slice(0, 40)}. ${s.shop} sees the reason.`);
  };

  const waiting = d ? d.shops.reduce((t, s) => t + s.products.filter((p) => !done[p.id]).length, 0) : 0;
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Product Review" sub="Products shops registered in their own campaign in Seller Center, waiting for Techwide. Decisions go straight to TikTok, and the shop is told in Rezekii.">
        <button type="button" className="ad-btn-ghost" onClick={() => { setD(null); void load(); }}><Icon name="refresh" size={15} /> Check again</button>
      </Title>
      {!d ? <p className="v2-muted">{err ?? "Reading every shop's campaign from TikTok…"}</p> : (
        <>
          <p className="v2-small" style={{ margin: 0 }}><b>{waiting}</b> waiting across {d.shops.length} shop{d.shops.length === 1 ? "" : "s"}.</p>
          {d.shops.map((s) => (
            <section key={s.campaignId} className="v2-card" style={{ padding: "6px 20px" }}>
              <div className="v2-card-h"><h2 className="v2-h2">{s.shop}</h2><span className="v2-small">Techwide X {s.shop} · {s.products.length} waiting</span></div>
              {s.error && <p className="v2-muted" style={{ margin: 0 }}>{s.error}</p>}
              <div className="ad-list">
                {s.products.map((p) => (
                  <div key={p.id} className="ad-row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image ?? NO_PHOTO} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} />
                    <span className="main" style={{ flex: "1 1 260px", minWidth: 0 }}>
                      <b>{p.name}</b>
                      <small>Open plan {pct(p.open)} · Total {pct(p.total)} · {p.samples} free samples · {p.stock ?? "—"} in stock · {p.sold.toLocaleString("en-MY")} sold{p.available ? "" : " · not available"}</small>
                    </span>
                    {done[p.id] ? (
                      <Pill tone={done[p.id] === "approved" ? "ok" : "bad"}>{done[p.id] === "approved" ? "Approved" : "Declined"}</Pill>
                    ) : (
                      <span className="v2-row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <select className="np-input" style={{ height: 38, width: 190 }} value={why[p.id] ?? ""} onChange={(e) => setWhy((m) => ({ ...m, [p.id]: e.target.value }))} aria-label="Reason to decline">
                          <option value="">Reason to decline…</option>
                          {d.reasons.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                        <button type="button" className="btn-outline v2-btn-sm" disabled={busy === p.id} onClick={() => void decide(s, p, false)}>Decline</button>
                        <button type="button" className="np-btn v2-btn-sm" disabled={busy === p.id} onClick={() => void decide(s, p, true)}>{busy === p.id ? "…" : "Approve"}</button>
                      </span>
                    )}
                  </div>
                ))}
                {!s.products.length && !s.error && <p className="v2-muted" style={{ margin: 0 }}>Nothing waiting.</p>}
              </div>
            </section>
          ))}
          {!d.shops.length && <section className="v2-card flat"><p className="v2-muted" style={{ margin: 0 }}>No shop has connected Seller Center yet.</p></section>}
        </>
      )}
    </div>
  );
}
