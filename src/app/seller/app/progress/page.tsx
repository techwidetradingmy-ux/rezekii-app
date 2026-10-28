"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { SHOP_ITEMS, type ShopItem, type Stage } from "@/lib/mock-seller";

const STEPS: [Exclude<Stage, "Not submitted" | "Not approved">, string, string][] = [
  ["Submitted", "Submitted", ""],
  ["Under review", "Our review", "Within 1 working day"],
  ["Submitted to TikTok", "With TikTok", "1–3 working days"],
  ["Live", "Live", "Creators can apply"],
];
const FILTERS = ["All", "In progress", "Live", "Not approved"] as const;
type Filter = (typeof FILTERS)[number];
const group = (s: Stage): Filter => (s === "Live" ? "Live" : s === "Not approved" ? "Not approved" : "In progress");
const ORDER: Record<Filter, number> = { "In progress": 0, "Not approved": 1, Live: 2, All: 3 };

function Tracker({ item }: { item: ShopItem }) {
  const failed = item.stage === "Not approved";
  const reached = STEPS.filter(([k]) => item.dates?.[k]).length;
  const cur = failed ? reached - 1 : STEPS.findIndex(([k]) => k === item.stage);
  return (
    <div className="sl-track" aria-label={`Status: ${item.stage}`}>
      {STEPS.map(([key, label, eta], k) => {
        const live = item.stage === "Live";
        const state = failed ? (k < cur ? "done" : k === cur ? "stop" : "later") : live || k < cur ? "done" : k === cur ? "now" : "later";
        return (
          <div key={key} className={state}>
            <i>{state === "done" && <Icon name="check" size={14} width={3} />}{state === "stop" && <Icon name="x" size={13} width={3} />}</i>
            <b>{state === "stop" ? "Not approved" : label}</b>
            <small>{item.dates?.[key] ?? (state === "later" && !failed ? eta : "")}</small>
          </div>
        );
      })}
    </div>
  );
}

/** Every product submitted to Techwide's TAP, and where it is now. */
export default function Progress() {
  const { toast } = useDemo();
  const [items, setItems] = useState(SHOP_ITEMS.filter((s) => s.stage !== "Not submitted"));
  const [filter, setFilter] = useState<Filter>("All");
  const [fix, setFix] = useState<ShopItem | null>(null);
  const [samples, setSamples] = useState(40);
  const shown = items.filter((i) => filter === "All" || group(i.stage) === filter).sort((a, b) => ORDER[group(a.stage)] - ORDER[group(b.stage)]);

  return (
    <div className="v2-stack v2-in">
      <Title title="Progress" sub="Submitted → our review → TikTok → live.">
        <Link href="/seller/app/submit" className="np-btn v2-btn-sm" style={{ height: 42 }}>Submit products</Link>
      </Title>

      <div className="sl-chipline" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f} <small>{f === "All" ? items.length : items.filter((i) => group(i.stage) === f).length}</small>
          </button>
        ))}
      </div>

      <div className="v2-stack">
        {shown.map((p) => {
          const g = group(p.stage);
          return (
            <section key={p.id} className="v2-card">
              <div className="sl-prow" style={{ padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="sl-pinfo">
                  <strong>{p.name}</strong>
                  <small>Public {p.publicRate ?? "?"}% → TAP {p.tapRate}% · {p.samples} samples per SKU</small>
                  {p.fromSellerCenter && <span className="v2-row"><span className="badge badge-blue">From Seller Center</span></span>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${g === "Live" ? "" : g === "Not approved" ? "badge-red" : "badge-amber"}`}>{p.stage === "Submitted to TikTok" ? "With TikTok" : p.stage}</span>
                </span>
              </div>
              <Tracker item={p} />
              {p.stage === "Not approved" && (
                <div className="v2-alert red">
                  <span><b>Why:</b> {p.reason}</span>
                  <button type="button" onClick={() => setFix(p)}>Fix and resubmit</button>
                </div>
              )}
              {p.note && <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}><Icon name="doc" size={16} /> {p.note}</p>}
            </section>
          );
        })}
      </div>

      <p className="v2-small" style={{ margin: 0 }}>Most rejections: <b>0 samples</b>, or commission <b>less than +2%</b> above the public rate.</p>

      {fix && (
        <Sheet title="Fix and resubmit" onClose={() => setFix(null)}>
          <p className="v2-muted" style={{ margin: 0 }}>{fix.name}: {fix.reason}</p>
          <div className="v2-field">Samples per SKU <small>Must be more than 0.</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => {
            setItems((all) => all.map((i) => (i.id === fix.id ? { ...i, stage: "Under review", samples, reason: undefined, dates: { Submitted: "Today", "Under review": "Today" } } : i)));
            setFix(null);
            toast("Resubmitted · review within 1 working day");
          }}>Resubmit with {samples} samples</button>
        </Sheet>
      )}
    </div>
  );
}
