"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Av, Chips, Pill, Reasons, Search, Sec } from "@/components/admin/bits";
import { LEDGER_ALL, ME, PENDING_ADJ, type LedgerRow } from "@/lib/mock-admin";

type Type = "All" | LedgerRow["type"];
type Pending = { id: string; account: string; amount: number; reason: string; by: string; when: string; approver?: string };
const TYPES: Type[] = ["All", "Grant", "Spend", "Reserve", "Adjust", "Reverse", "Referral", "Refund"];
const ACCOUNTS = ["@aisyah.glow", "@kak.ros.kitchen", "@mei.ling.deals", "@farah.home", "@nurul.beauty", "@zara.home", "Seri Living MY", "Urban Basics MY"];

/** Wallet ledger: every credit entry; manual adjustments need a second person's approval. */
export default function Ledger() {
  const { toast } = useDemo();
  const [rows, setRows] = useState<LedgerRow[]>(LEDGER_ALL);
  const [pending, setPending] = useState<Pending[]>(PENDING_ADJ);
  const [type, setType] = useState<Type>("All");
  const [q, setQ] = useState("");
  const [adjust, setAdjust] = useState(false);

  const shown = rows.filter((r) => (type === "All" || r.type === type) && (!q || `${r.account} ${r.source}`.toLowerCase().includes(q.toLowerCase())));

  const approve = (p: Pending) => {
    setPending((l) => l.filter((x) => x.id !== p.id));
    setRows((l) => [{ id: `L-8822${l.length}`, when: "28 Oct 10:48", account: p.account, type: "Adjust", amount: p.amount, source: p.reason, expires: "28 Jan", by: `${p.by} · approved by ${ME}`, status: "Approved" }, ...l]);
    toast(`Approved · ${p.amount > 0 ? "+" : ""}${p.amount} credits to ${p.account} · logged`);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Ledger" sub="Every credit in and out. Balances come from these rows.">
        <button type="button" className="np-btn v2-btn-sm" onClick={() => setAdjust(true)}><Icon name="plus" size={16} /> Adjust credits</button>
      </Title>

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>In all wallets</small><b>1,218,450</b><em>From the ledger</em></div>
        <div className="v2-stat"><small>Issued today</small><b>4,120</b><em className="up">Missions and referrals</em></div>
        <div className="v2-stat"><small>Used today</small><b>1,830</b><em>AI tools and boosts</em></div>
        <div className="v2-stat"><small>Pending approval</small><b style={{ color: pending.length ? "var(--amber)" : undefined }}>{pending.length}</b><em>Manual adjustments</em></div>
      </div>

      {pending.length > 0 && (
        <section className="v2-card" style={{ borderLeft: "4px solid #f5a623" }}>
          <div className="v2-card-h">
            <h2 className="v2-h2">Waiting for approval</h2>
            <span className="v2-small">Needs a second approver</span>
          </div>
          <div className="ad-list">
            {pending.map((p) => {
              const mine = p.by === ME;
              return (
                <div key={p.id} className="ad-row">
                  <Av name={p.by} size={34} />
                  <span className="main">
                    <b>{p.amount > 0 ? "+" : ""}{p.amount.toLocaleString("en-MY")} credits · {p.account}</b>
                    <small>{p.id} · {p.reason} · asked by {p.by} · {p.when}</small>
                  </span>
                  {mine ? (
                    <Pill tone="warn">Waiting for approval{p.approver ? ` · ${p.approver}` : ""}</Pill>
                  ) : (
                    <span className="acts">
                      <button type="button" className="ad-btn-ghost danger" onClick={() => { setPending((l) => l.filter((x) => x.id !== p.id)); toast(`Declined · ${p.by} notified · logged`); }}>Decline</button>
                      <button type="button" className="np-btn v2-btn-sm" onClick={() => approve(p)}><Icon name="check" size={16} /> Approve</button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {pending.some((p) => p.by === ME) && <span className="v2-small">You can&apos;t approve your own adjustment.</span>}
        </section>
      )}

      <div className="ad-bar">
        <Search value={q} onChange={setQ} placeholder="Search account or source" />
      </div>
      <Chips<Type> label="Entry type" value={type} onChange={setType} options={TYPES.map((t) => [t, t === "All" ? rows.length : rows.filter((r) => r.type === t).length] as [Type, number])} />

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead><tr><th>When</th><th>Account</th><th>Type</th><th className="num">Credits</th><th>Source</th><th>Expires</th><th>By · reason</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="ad-nowrap"><span className="ad-cell"><span><b>{r.when}</b><small className="ad-mono">{r.id}</small></span></span></td>
                  <td className="ad-nowrap"><b>{r.account}</b></td>
                  <td><span className={`ad-tag ${r.type === "Grant" || r.type === "Referral" || r.type === "Refund" ? "green" : r.type === "Reverse" ? "red" : r.type === "Adjust" ? "amber" : "gray"}`}>{r.type}</span></td>
                  <td className={`num ${r.amount > 0 ? "ad-up" : "ad-down"}`}>{r.amount > 0 ? "+" : "−"}{Math.abs(r.amount).toLocaleString("en-MY")}</td>
                  <td style={{ minWidth: 220 }}>{r.source}</td>
                  <td className="ad-nowrap">{r.expires}</td>
                  <td style={{ minWidth: 160 }}>{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="v2-muted" style={{ padding: 12 }}>No entries match.</p>}
      </section>

      {adjust && (
        <AdjustSheet
          onClose={() => setAdjust(false)}
          onSubmit={(p) => { setPending((l) => [p, ...l]); setAdjust(false); toast(`Sent to ${p.approver} for approval`); }}
        />
      )}
    </div>
  );
}

function AdjustSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: (p: Pending) => void }) {
  const [account, setAccount] = useState("");
  const [dir, setDir] = useState<"Add" | "Remove">("Add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [approver, setApprover] = useState("Farid");
  const n = Math.round(Number(amount));
  const ok = ACCOUNTS.includes(account) && n > 0 && n <= 5000 && !!reason && !!note.trim();

  return (
    <Sheet title="Adjust credits" onClose={onClose}>
      <label className="v2-field">
        Account
        <input className="np-input" list="ad-accounts" value={account} placeholder="Handle or shop name" onChange={(e) => setAccount(e.target.value)} />
        <datalist id="ad-accounts">{ACCOUNTS.map((a) => <option key={a} value={a} />)}</datalist>
        {account && !ACCOUNTS.includes(account) && <small>Pick an account from the list.</small>}
      </label>
      <div className="ad-form">
        <div className="v2-field">Direction<Seg value={dir} options={["Add", "Remove"] as const} onChange={setDir} /></div>
        <label className="v2-field">Credits<input className="np-input" inputMode="numeric" value={amount} placeholder="e.g. 200" onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} /><small>Max 5,000</small></label>
      </div>
      <Sec>Reason</Sec>
      <Reasons options={["Make-good for an outage", "Correction", "Goodwill", "Other"]} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder="Required: what happened + case number" />
      <label className="v2-field">
        Second approver
        <select className="np-input" value={approver} onChange={(e) => setApprover(e.target.value)}>
          <option value="Farid">Farid Hakim (Finance)</option>
          <option value="Hazwan">Hazwan Idris (Super Admin)</option>
        </select>
      </label>
      <button
        type="button"
        className="np-btn"
        disabled={!ok}
        onClick={() => onSubmit({ id: `ADJ-0${62 + Math.floor(Math.random() * 30)}`, account, amount: dir === "Add" ? n : -n, reason: `${reason}: ${note.trim()}`, by: ME, when: "Just now", approver })}
      >
        Send for approval
      </button>
      <span className="v2-small" style={{ textAlign: "center" }}>Applies after {approver} approves. Both names are logged.</span>
    </Sheet>
  );
}
