"use client";

import "@/app/admin.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Pill, Switch } from "@/components/admin/bits";
import { FLAGS } from "@/lib/mock-admin";

type Heat = { label: string; note: string; lo: number; hi: number | null };

function Stepper({ value, onChange, min = 0, max = 99, suffix = "", label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string; label: string }) {
  return (
    <span className="ad-num" role="group" aria-label={label}>
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <b>{value}{suffix}</b>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </span>
  );
}

/** Settings and presets: commission uplift, AI rule by product heat, sample quantities, activity tiers, terms, WhatsApp, feature flags. */
export default function SystemSettings() {
  const { toast } = useDemo();
  const [dirty, setDirty] = useState(false);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setDirty(true); };

  const [uplift, setUplift] = useState([2, 5, 8]);
  const [newUp, setNewUp] = useState("");
  const [heat, setHeat] = useState<Heat[]>([
    { label: "New product", note: "Listed in the last 30 days, few sales", lo: 10, hi: null },
    { label: "Early", note: "Starting to sell, under 1,000 orders", lo: 8, hi: 10 },
    { label: "Best-seller", note: "Already selling well", lo: 3, hi: 5 },
  ]);
  const [qty, setQty] = useState([30, 40, 50]);
  const [newQty, setNewQty] = useState("");
  const [active, setActive] = useState(10);
  const [high, setHigh] = useState(30);
  const [wa, setWa] = useState({ verify: true, replies: true, link: true });
  const [flags, setFlags] = useState(FLAGS);
  const [terms, setTerms] = useState({ v: 2, since: "24 Oct 2026", agreed: 41 });

  const addUplift = () => {
    const n = Math.round(Number(newUp));
    if (!n || n < 2 || uplift.includes(n)) { toast(n && n < 2 ? "Presets can't be under +2%" : "Already a preset"); return; }
    setUplift([...uplift, n].sort((a, b) => a - b)); setNewUp(""); setDirty(true);
  };
  const addQty = () => {
    const n = Math.round(Number(newQty));
    if (!n || n < 1 || qty.includes(n)) { toast(n !== 0 && n < 1 ? "Samples must be at least 1" : "Already a preset"); return; }
    setQty([...qty, n].sort((a, b) => a - b)); setNewQty(""); setDirty(true);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Settings & presets" sub="What sellers and creators see as defaults. Every change is logged with before and after.">
        <Link href="/admin/system/audit" className="ad-btn-ghost"><Icon name="doc" size={15} /> Audit log</Link>
      </Title>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">Commission uplift presets</h2>
          <span className="v2-small">Buttons sellers tap when submitting: how much above the public rate. The minimum is +2%; anything lower can&apos;t be submitted.</span>
          <div className="v2-chips">
            {uplift.map((u) => (
              <span key={u} className="v2-chip on" style={{ cursor: "default" }}>
                +{u}%{u === 2 && <small>minimum</small>}
                {u !== 2 && <button type="button" aria-label={`Remove +${u}%`} onClick={touch(() => setUplift(uplift.filter((x) => x !== u)))} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "inherit", display: "inline-flex" }}><Icon name="x" size={14} /></button>}
              </span>
            ))}
          </div>
          <div className="v2-row">
            <input className="np-input" style={{ flex: "1 1 120px", minHeight: 40 }} inputMode="numeric" value={newUp} placeholder="Add, e.g. 10" onChange={(e) => setNewUp(e.target.value.replace(/[^\d]/g, ""))} />
            <button type="button" className="ad-btn-ghost" onClick={addUplift}><Icon name="plus" size={15} /> Add preset</button>
          </div>
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Sample quantity presets</h2>
          <span className="v2-small">Per SKU. We suggest 30–50. At least 1; a request with 0 samples can&apos;t be submitted.</span>
          <div className="v2-chips">
            {qty.map((n) => (
              <span key={n} className="v2-chip" style={{ cursor: "default" }}>
                {n}
                <button type="button" aria-label={`Remove ${n}`} disabled={qty.length <= 1} onClick={touch(() => setQty(qty.filter((x) => x !== n)))} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}><Icon name="x" size={14} /></button>
              </span>
            ))}
          </div>
          <div className="v2-row">
            <input className="np-input" style={{ flex: "1 1 120px", minHeight: 40 }} inputMode="numeric" value={newQty} placeholder="Add, e.g. 60" onChange={(e) => setNewQty(e.target.value.replace(/[^\d]/g, ""))} />
            <button type="button" className="ad-btn-ghost" onClick={addQty}><Icon name="plus" size={15} /> Add preset</button>
          </div>
        </section>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">AI suggestion by product heat</h2>
          <span className="ad-tag"><Icon name="spark" size={13} /> Shown to sellers as a suggestion</span>
        </div>
        <span className="v2-small">When a seller picks a product, the AI suggests an uplift by how hot it is. New products need more to get creators interested.</span>
        <div className="ad-heat">
          {heat.map((h, i) => (
            <div key={h.label}>
              <small>{h.label}</small>
              <b>+{h.lo}%{h.hi ? `–${h.hi}%` : " or more"}</b>
              <span className="v2-small">{h.note}</span>
              <div className="v2-row" style={{ gap: 6, marginTop: 4 }}>
                <Stepper label={`${h.label} from`} value={h.lo} min={2} max={h.hi ?? 40} suffix="%" onChange={touch((v: number) => setHeat(heat.map((x, k) => (k === i ? { ...x, lo: v } : x))))} />
                {h.hi !== null && <Stepper label={`${h.label} to`} value={h.hi} min={h.lo} max={40} suffix="%" onChange={touch((v: number) => setHeat(heat.map((x, k) => (k === i ? { ...x, hi: v } : x))))} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">Activity tiers</h2>
          <div className="ad-set">
            <b>Active</b>
            <small>Unlocks advanced samples.</small>
            <div className="v2-row"><Stepper label="Active days" value={active} min={3} max={high - 1} onChange={touch(setActive)} /><span className="v2-muted">days in a row with a video</span></div>
          </div>
          <div className="ad-set">
            <b>Highly active</b>
            <small>Unlocks designated samples and the Highly active badge.</small>
            <div className="v2-row"><Stepper label="Highly active days" value={high} min={active + 1} max={90} onChange={touch(setHigh)} /><span className="v2-muted">days in a row, and</span><Pill tone="ok">100% delivery</Pill></div>
          </div>
          <span className="v2-small">Any video counts toward days in a row for now. Missing a day or an overdue sample drops a creator one tier.</span>
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Sample terms for sellers</h2>
          <div className="v2-row">
            <span className="ad-tag green">Version {terms.v}</span>
            <span className="v2-small">Live since {terms.since} · {terms.agreed} sellers agreed</span>
          </div>
          <span className="v2-small">Sellers agree once when they first connect Seller Center. A new version asks every seller to agree again the next time they submit.</span>
          <div className="v2-row">
            <button type="button" className="ad-btn-ghost" onClick={() => toast("Terms v2 opened for reading")}><Icon name="doc" size={15} /> Read v{terms.v}</button>
            <button type="button" className="ad-btn-ghost" onClick={() => { setTerms({ v: terms.v + 1, since: "Today", agreed: 0 }); toast(`Terms v${terms.v + 1} published · sellers agree on their next submission · logged`); }}>Publish a new version</button>
          </div>
        </section>
      </div>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">WhatsApp</h2>
          <span className="v2-small">Free uses only. Paid business notifications stay off.</span>
          {([
            ["verify", "Verify numbers by user message", "The user sends us a code from WhatsApp. Free."],
            ["replies", "Reply within 24 hours", "Answer messages users send us. Free inside 24 hours."],
            ["link", "Support link", "A chat link on Help pages."],
          ] as const).map(([k, label, note]) => (
            <div key={k} className="np-switchrow">
              <span><b>{label}</b><small>{note}</small></span>
              <Switch label={label} on={wa[k]} onChange={touch((v: boolean) => setWa({ ...wa, [k]: v }))} />
            </div>
          ))}
          <div className="np-switchrow" style={{ opacity: 0.55 }}>
            <span><b>Paid notifications</b><small>Sample approvals, reminders. Costs per message; off until the founders decide.</small></span>
            <button type="button" role="switch" aria-checked="false" aria-label="Paid notifications" className="np-switch" disabled style={{ cursor: "not-allowed" }}><span /></button>
          </div>
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Feature flags</h2>
          {flags.map((f) => (
            <div key={f.key} className="np-switchrow">
              <span><b>{f.label}</b><small>{f.note}</small></span>
              <Switch label={f.label} on={f.on} onChange={touch((v: boolean) => setFlags(flags.map((x) => (x.key === f.key ? { ...x, on: v } : x))))} />
            </div>
          ))}
        </section>
      </div>

      {dirty && <div className="ad-spacer" />}
      {dirty && (
        <div className="ad-batch" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes</span>
          <button type="button" className="ad-btn-ghost" onClick={() => window.location.reload()}>Discard</button>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setDirty(false); toast("Saved · before and after are in the audit log"); }}><Icon name="check" size={16} /> Save changes</button>
        </div>
      )}
    </div>
  );
}
