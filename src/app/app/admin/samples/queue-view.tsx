"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminSample } from "@/modules/tap/samples.ts";
import { sampleStage } from "@/modules/tap/stages.ts";
import "../../marketplace/marketplace.css";
import "../../today.css";

/**
 * Partner Center's Manage samples page, To review tab, Malaysia (owner, 16 Oct 2026). TAP agencies approve or reject samples there;
 * TikTok gives apps no API for it (only the seller APIs can review samples), so Rezekii hands over: it copies the product ID
 * for the page's "Search product ID" box (the page ignores IDs in its address).
 */
export const MANAGE_SAMPLES = "https://partner.tiktokshop.com/affiliate-campaign/sample-requests?tab=to_review&market=6";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric" });

/** TikTok's sample statuses as TikTok names them (owner, 15 Oct 2026), with the badge colour. */
const TIKTOK: Record<string, [string, string]> = {
  PENDING: ["Pending approval", "badge-amber"],
  AWAITING_SHIPMENT: ["Approved", "badge"],
  AWAITING_COLLECTION: ["Approved", "badge"],
  SHIPPED: ["Shipped", "badge"],
  CONTENT_PENDING: ["Delivered", "badge-amber"],
  COMPLETED: ["Post criteria met", "badge"],
  REJECT_CANCELLED: ["Rejected", "badge-red"],
  OVERDUE_CANCELLED: ["Cancelled · overdue", "badge-gray"],
  WITHDRAW_CANCELLED: ["Cancelled · withdrawn", "badge-gray"],
  SELLER_NOT_SHIP_CANCELLED: ["Cancelled · seller didn't ship", "badge-gray"],
  UNFULFILL_CANCELLED: ["Cancelled · unfulfilled", "badge-gray"],
  UNFULFILLABLE_CANCELLED: ["Cancelled · unfulfillable", "badge-gray"],
};
const look = (r: AdminSample): [string, string] =>
  r.tiktok ? TIKTOK[r.tiktok.status] ?? [r.tiktok.status.replace(/_/g, " ").toLowerCase(), "badge-gray"] : r.checked ? ["Not submitted in TikTok", "badge-gray"] : ["TikTok Shop not readable", "badge-gray"];

type Tab = "all" | "open" | "done" | "none";
const TABS: [Tab, string][] = [["all", "All"], ["open", "In progress"], ["done", "Posted or cancelled"], ["none", "Not submitted"]];
const inTab = (r: AdminSample, t: Tab) => {
  if (t === "all") return true;
  if (!r.tiktok) return t === "none";
  const stage = sampleStage(r.tiktok.status);
  return t === "open" ? stage >= 1 && stage <= 4 : t === "done" ? stage === 5 || stage === -1 : false;
};

/** Every sample creators asked for on Rezekii with TikTok's status. Approvals happen in TikTok Shop Partner Center (Manage samples). */
export function QueueView() {
  const [tab, setTab] = useState<Tab>("all");
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  // The link opens Partner Center; the click also copies the product ID to paste into its search box.
  const handOver = (productId: string) => {
    navigator.clipboard.writeText(productId).then(() => setCopied({ id: productId, ok: true }), () => setCopied({ id: productId, ok: false }));
  };
  const [rows, setRows] = useState<AdminSample[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [readAt, setReadAt] = useState<number | null>(null);
  const last = useRef(0);

  // TikTok's statuses, read afresh: on opening, on Refresh, and whenever this tab is shown again (e.g. back from approving
  // or rejecting in Partner Center), at most every 5 seconds.
  useEffect(() => {
    let live = true;
    const load = () => {
      if (Date.now() - last.current < 5000) return;
      last.current = Date.now();
      setBusy(true);
      fetch("/api/admin/samples", { cache: "no-store" })
        .then(async (r) => {
          if (!live) return;
          if (!r.ok) return setError("The sample requests could not load. Please refresh.");
          const d = (await r.json()) as { samples: AdminSample[] };
          if (live) { setRows(d.samples); setError(""); setReadAt(Date.now()); }
        })
        .catch(() => live && setError("The sample requests could not load. Please refresh."))
        .finally(() => live && setBusy(false));
    };
    const onShow = () => { if (document.visibilityState === "visible") load(); };
    load();
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("rezekii:samples-refresh", load);
    return () => {
      live = false;
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("rezekii:samples-refresh", load);
    };
  }, []);
  const refresh = () => { last.current = 0; window.dispatchEvent(new Event("rezekii:samples-refresh")); };

  const shown = rows?.filter((r) => inTab(r, tab)) ?? null;
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="button" className="nv-btn2 nv-sm nv-press" onClick={refresh} disabled={busy}>{busy ? "Reading TikTok…" : "Refresh statuses"}</button>
        {readAt && <small style={{ color: "var(--muted)" }}>{`Read from TikTok at ${new Date(readAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kuala_Lumpur" })} · updates when you come back to this tab`}</small>}
      </div>
      <div className="np-seg" role="tablist" aria-label="Status">
        {TABS.map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "on" : ""} onClick={() => setTab(v)}>
            {label}{rows ? ` ${rows.filter((r) => inTab(r, v)).length}` : ""}
          </button>
        ))}
      </div>
      {error && <p className="np-error" role="alert">{error}</p>}
      {!rows && !error && <p className="tap-count">Reading each creator&apos;s sample requests from TikTok…</p>}
      {shown && !shown.length && <section className="card mp-empty"><h2>Nothing here</h2><p>No sample requests with this status.</p></section>}
      {shown && shown.length > 0 && (
        <section className="card">
          <ul className="tap-list">
            {shown.map((r) => {
              const [label, badge] = look(r);
              return (
                <li key={r.id} className="tap-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.image ? <img src={r.image} alt="" width={56} height={56} loading="lazy" /> : <span className="tap-rowimg" aria-hidden="true" />}
                  <div className="tap-rowmain">
                    <a href={`/app/marketplace/${r.productId}`} className="tap-rowname" target="_blank" rel="noopener">{r.name}</a>
                    <small><b>{r.creator}</b> · {[r.shop, `asked ${when(r.askedAt)}`, r.tiktok?.variant, `ID ${r.productId}`].filter(Boolean).join(" · ")}</small>
                  </div>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span className={`badge ${badge}`}>{label}</span>
                    {(r.tiktok?.status === "PENDING" || (!r.tiktok && !r.checked)) && (
                      <a href={MANAGE_SAMPLES} target="_blank" rel="noopener" className="nv-btn2 nv-sm nv-press" onClick={() => handOver(r.productId)}>
                        {r.tiktok ? "Approve in Partner Center" : "Check in Partner Center"}
                      </a>
                    )}
                    {copied?.id === r.productId && (
                      <small style={{ color: "var(--muted)" }}>{copied.ok ? "Product ID copied · paste it in Search product ID" : `Search product ID ${r.productId}`}</small>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
