"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SampleRequest } from "@/modules/tap/samples.ts";

export const SAMPLE_STATUS: Record<SampleRequest["status"], [string, string, string]> = {
  requested: ["Waiting for Techwide", "badge-amber", "Techwide will apply for this sample in TikTok Shop for you."],
  applied: ["Applied in TikTok Shop", "badge", "Techwide applied. The seller now approves and ships it; TikTok Shop shows the delivery."],
  rejected: ["Not approved", "badge-red", ""],
  cancelled: ["Cancelled", "badge-gray", ""],
};
export const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric" });

/** The creator's free-sample requests, newest first. A request can be cancelled until Techwide applies for it. */
export function SamplesView() {
  const [requests, setRequests] = useState<SampleRequest[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    fetch("/api/tap/samples")
      .then(async (r) => (r.ok ? ((await r.json()) as { requests: SampleRequest[] }).requests : Promise.reject(new Error("Your samples could not load. Please refresh."))))
      .then(setRequests)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function cancel(id: string) {
    setBusy(id);
    setError("");
    const r = await fetch(`/api/tap/samples/${id}`, { method: "DELETE" });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (r.ok) setRequests((list) => list?.filter((x) => x.id !== id) ?? null);
    else setError(d.error || "Could not cancel. Please try again.");
    setBusy("");
  }

  if (error && !requests) return <p className="np-error" role="alert">{error}</p>;
  if (!requests) return <p className="tap-count">Loading…</p>;
  if (!requests.length)
    return (
      <section className="card mp-empty">
        <h2>No sample requests yet</h2>
        <p>Find a product with a Free sample badge in the TAP Marketplace and tap Request free sample.</p>
        <Link href="/app/marketplace" className="np-btn">Open TAP Marketplace</Link>
      </section>
    );

  return (
    <section className="card">
      {error && <p className="np-error" role="alert">{error}</p>}
      <ul className="tap-list">
        {requests.map((r) => {
          const [label, badge, help] = SAMPLE_STATUS[r.status];
          return (
            <li key={r.id} className="tap-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image ? <img src={r.image} alt="" width={56} height={56} loading="lazy" /> : <span className="tap-rowimg" aria-hidden="true" />}
              <div className="tap-rowmain">
                <Link href={`/app/marketplace/${r.product_id}`} className="tap-rowname">{r.product_name}</Link>
                <small>{[r.shop, `asked ${when(r.created_at)}`].filter(Boolean).join(" · ")}</small>
                {(r.note || help) && <small className="tap-rownote">{r.note ? `Techwide: ${r.note}` : help}</small>}
              </div>
              <span className={`badge ${badge}`}>{label}</span>
              {r.status === "requested" ? (
                <button type="button" className="btn-outline mp-cancel" disabled={busy === r.id} onClick={() => cancel(r.id)}>{busy === r.id ? "Cancelling…" : "Cancel"}</button>
              ) : <span />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
