"use client";

import "@/app/admin.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Pill, Switch } from "@/components/admin/bits";
import { FLAGS } from "@/lib/mock-admin";
import { POST_CREDITS } from "@/lib/mock-publish";

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
    { label: "New product", note: "Under 30 days, few sales", lo: 10, hi: null },
    { label: "Early", note: "Under 1,000 orders", lo: 8, hi: 10 },
    { label: "Best-seller", note: "Selling well", lo: 3, hi: 5 },
  ]);
  const [qty, setQty] = useState([30, 40, 50]);
  const [newQty, setNewQty] = useState("");
  const [active, setActive] = useState(10);
  const [high, setHigh] = useState(30);
  const [wa, setWa] = useState({ verify: true, replies: true, link: true });
  const [flags, setFlags] = useState(FLAGS);
  const [terms, setTerms] = useState({ v: 2, since: "24 Oct 2026", agreed: 41 });
  const [perChannel, setPerChannel] = useState(POST_CREDITS);

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
      <Title title="Settings & Presets" sub="Defaults for sellers and creators. Every change is logged.">
        <Link href="/admin/system/audit" className="ad-btn-ghost"><Icon name="doc" size={15} /> Audit log</Link>
      </Title>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">Uplift Presets</h2>
          <span className="v2-small">Above the public rate. Minimum +2%.</span>
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
          <h2 className="v2-h2">Sample Presets</h2>
          <span className="v2-small">Per SKU. Suggest 30–50. Minimum 1.</span>
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
          <h2 className="v2-h2">AI Uplift by Heat</h2>
          <span className="ad-tag"><Icon name="spark" size={13} /> Suggestion only</span>
        </div>
        <span className="v2-small">Newer products need a higher uplift.</span>
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

      <section className="v2-card">
        <h2 className="v2-h2">Posting Price</h2>
        <span className="v2-small">Drafts free. Failed or cancelled channels refunded. Applies to new posts.</span>
        <div className="v2-row" style={{ gap: 10 }}>
          <Stepper label="credits per channel" value={perChannel} min={0} max={50} onChange={touch(setPerChannel)} />
          <span className="v2-small">credits per channel · 4 channels = {perChannel * 4}</span>
        </div>
      </section>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">Activity Tiers</h2>
          <div className="ad-set">
            <b>Active</b>
            <small>Unlocks advanced samples.</small>
            <div className="v2-row"><Stepper label="Active days" value={active} min={3} max={high - 1} onChange={touch(setActive)} /><span className="v2-muted">video days in a row</span></div>
          </div>
          <div className="ad-set">
            <b>Highly active</b>
            <small>Unlocks designated samples + badge.</small>
            <div className="v2-row"><Stepper label="Highly active days" value={high} min={active + 1} max={90} onChange={touch(setHigh)} /><span className="v2-muted">days in a row, and</span><Pill tone="ok">100% delivery</Pill></div>
          </div>
          <span className="v2-small">Any video counts. A missed day or overdue sample drops one tier.</span>
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Sample Terms for Sellers</h2>
          <div className="v2-row">
            <span className="ad-tag green">Version {terms.v}</span>
            <span className="v2-small">Live since {terms.since} · {terms.agreed} sellers agreed</span>
          </div>
          <span className="v2-small">Sellers agree on first connect, and again for each new version.</span>
          <div className="v2-row">
            <button type="button" className="ad-btn-ghost" onClick={() => toast("Terms v2 opened for reading")}><Icon name="doc" size={15} /> Read v{terms.v}</button>
            <button type="button" className="ad-btn-ghost" onClick={() => { setTerms({ v: terms.v + 1, since: "Today", agreed: 0 }); toast(`Terms v${terms.v + 1} published · logged`); }}>Publish new version</button>
          </div>
        </section>
      </div>

      <div className="v2-grid2">
        <section className="v2-card">
          <h2 className="v2-h2">WhatsApp</h2>
          <span className="v2-small">Free uses only.</span>
          {([
            ["verify", "Verify numbers", "User sends us a code."],
            ["replies", "24-hour replies", "Free within 24 hours."],
            ["link", "Support link", "Chat link on Help pages."],
          ] as const).map(([k, label, note]) => (
            <div key={k} className="np-switchrow">
              <span><b>{label}</b><small>{note}</small></span>
              <Switch label={label} on={wa[k]} onChange={touch((v: boolean) => setWa({ ...wa, [k]: v }))} />
            </div>
          ))}
          <div className="np-switchrow" style={{ opacity: 0.55 }}>
            <span><b>Paid notifications</b><small>Costs per message. Off until founders decide.</small></span>
            <button type="button" role="switch" aria-checked="false" aria-label="Paid notifications" className="np-switch" disabled style={{ cursor: "not-allowed" }}><span /></button>
          </div>
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Feature Flags</h2>
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
          <span>Unsaved changes</span>
          <button type="button" className="ad-btn-ghost" onClick={() => window.location.reload()}>Discard</button>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setDirty(false); toast("Saved · logged"); }}><Icon name="check" size={16} /> Save changes</button>
        </div>
      )}
    </div>
  );
}
