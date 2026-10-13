"use client";

import { useEffect, useState } from "react";
import type { SampleRequest } from "@/modules/tap/samples.ts";

const SAMPLE_STATUS: Record<SampleRequest["status"], [string, string]> = {
  requested: ["Waiting for Techwide", "badge-amber"],
  applied: ["Applied in TikTok Shop", "badge"],
  rejected: ["Not approved", "badge-red"],
  cancelled: ["Cancelled", "badge-gray"],
};
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric" });

type Row = SampleRequest & { creator: string };
const TABS: [string, string][] = [["requested", "To apply"], ["applied", "Applied"], ["rejected", "Rejected"], ["all", "All"]];

/**
 * Techwide's sample queue. For each request: apply for the sample in TikTok Shop (Partner Center), then mark it Applied here.
 * Reject with a short note if it can't be sent; the creator sees the note.
 */
export function QueueView() {
  const [tab, setTab] = useState("requested");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/samples?status=${tab}`)
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) return setError("The queue could not load. Please refresh.");
        const d = (await r.json()) as { requests: Row[] };
        if (live) setRows(d.requests);
      })
      .catch(() => live && setError("The queue could not load. Please refresh."));
    return () => {
      live = false;
    };
  }, [tab]);

  const pick = (v: string) => {
    if (v === tab) return;
    setTab(v);
    setRows(null);
    setError("");
  };

  async function decide(id: string, status: "applied" | "rejected") {
    setBusy(id);
    setError("");
    const r = await fetch("/api/admin/samples", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status, note: notes[id] ?? "" }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (r.ok) setRows((list) => (tab === "all" ? list?.map((x) => (x.id === id ? { ...x, status, note: notes[id] || x.note } : x)) : list?.filter((x) => x.id !== id)) ?? null);
    else setError(d.error || "Could not save. Please try again.");
    setBusy("");
  }

  return (
    <>
      <div className="np-seg" role="tablist" aria-label="Status">
        {TABS.map(([v, label]) => <button key={v} type="button" role="tab" aria-selected={tab === v} className={tab === v ? "on" : ""} onClick={() => pick(v)}>{label}</button>)}
      </div>
      {error && <p className="np-error" role="alert">{error}</p>}
      {!rows && !error && <p className="tap-count">Loading…</p>}
      {rows && !rows.length && <section className="card mp-empty"><h2>Nothing here</h2><p>{tab === "requested" ? "No sample requests are waiting." : "No requests with this status."}</p></section>}
      {rows && rows.length > 0 && (
        <section className="card">
          <ul className="tap-list">
            {rows.map((r) => {
              const [label, badge] = SAMPLE_STATUS[r.status];
              const open = r.status === "requested" || r.status === "applied";
              return (
                <li key={r.id} className="tap-row tap-qrow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.image ? <img src={r.image} alt="" width={56} height={56} loading="lazy" /> : <span className="tap-rowimg" aria-hidden="true" />}
                  <div className="tap-rowmain">
                    <a href={`/app/marketplace/${r.product_id}`} className="tap-rowname" target="_blank" rel="noopener">{r.product_name}</a>
                    <small><b>{r.creator}</b> · {[r.shop, when(r.created_at), `ID ${r.product_id}`].filter(Boolean).join(" · ")}</small>
                    {r.note && <small className="tap-rownote">Note: {r.note}</small>}
                  </div>
                  <span className={`badge ${badge}`}>{label}</span>
                  {open && (
                    <div className="tap-qact">
                      <input className="np-input" placeholder="Note for the creator (optional)" maxLength={300} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} aria-label="Note for the creator" />
                      {r.status === "requested" && <button type="button" className="np-btn" disabled={busy === r.id} onClick={() => decide(r.id, "applied")}>Mark applied</button>}
                      <button type="button" className="btn-outline" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}>Reject</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
