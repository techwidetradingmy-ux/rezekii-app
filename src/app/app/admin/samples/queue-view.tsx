"use client";

import { useEffect, useState } from "react";
import type { AdminSample } from "@/modules/tap/samples.ts";
import { sampleStage } from "@/modules/tap/stages.ts";

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

/** Read-only: every sample creators asked for on Rezekii with TikTok's status. Approvals happen in TikTok Shop Partner Center. */
export function QueueView() {
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<AdminSample[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/admin/samples", { cache: "no-store" })
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) return setError("The sample requests could not load. Please refresh.");
        const d = (await r.json()) as { samples: AdminSample[] };
        if (live) setRows(d.samples);
      })
      .catch(() => live && setError("The sample requests could not load. Please refresh."));
    return () => {
      live = false;
    };
  }, []);

  const shown = rows?.filter((r) => inTab(r, tab)) ?? null;
  return (
    <>
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
                  <span className={`badge ${badge}`}>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
