"use client";

import "@/app/admin.css";
import { useState } from "react";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Kv, Pill, Reasons, Search, Sec, type Tone } from "@/components/admin/bits";
import { SELLERS } from "@/lib/mock-admin";

type Seller = (typeof SELLERS)[number];
type Type = "All" | "Local" | "Cross-border";
const TONE: Record<string, Tone> = { Active: "ok", Waiting: "info", Paused: "mute", "Reconnect needed": "warn", Frozen: "bad" };

/** Every seller account: where they are, local or cross-border, status and how many products are live. */
export default function SellersList() {
  const { toast } = useDemo();
  const [list, setList] = useState(SELLERS);
  const [q, setQ] = useState("");
  const [type, setType] = useState<Type>("All");
  const [status, setStatus] = useState("Any status");
  const [open, setOpen] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const shown = list.filter(
    (s) => (type === "All" || s.type === type) && (status === "Any status" || s.status === status) && (!q || `${s.shop} ${s.state} ${s.country}`.toLowerCase().includes(q.toLowerCase())),
  );
  const s = list.find((x) => x.shop === open) ?? null;
  const statuses = ["Any status", ...Array.from(new Set(list.map((x) => x.status)))];

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Sellers" sub={`${list.length} seller accounts · ${list.reduce((a, x) => a + x.live, 0)} products live in TAP`} />

      <div className="ad-bar">
        <Search value={q} onChange={setQ} placeholder="Search shop, state or country" />
        <select className="np-input ad-select" value={status} aria-label="Status" onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <Chips<Type> label="Seller type" value={type} onChange={setType} options={[["All", list.length], ["Local", list.filter((x) => x.type === "Local").length], ["Cross-border", list.filter((x) => x.type === "Cross-border").length]]} />

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead>
              <tr><th>Shop</th><th>Country · state</th><th>Type</th><th>Status</th><th className="num">Live products</th><th>Joined</th><th>BD</th></tr>
            </thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.shop} className="click" onClick={() => { setOpen(x.shop); setFreezing(false); }}>
                  <td><span className="ad-cell"><Av name={x.shop} size={30} /><b>{x.shop}</b></span></td>
                  <td className="ad-nowrap">{x.country}{x.state !== "—" ? ` · ${x.state}` : ""}</td>
                  <td><span className={`ad-tag ${x.type === "Local" ? "green" : ""}`}>{x.type}</span></td>
                  <td><Pill tone={TONE[x.status]}>{x.status}</Pill></td>
                  <td className="num">{x.live}</td>
                  <td className="ad-nowrap">{x.joined}</td>
                  <td>{x.bd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="v2-muted" style={{ padding: 12 }}>No sellers match.</p>}
      </section>

      {s && (
        <Sheet title={s.shop} onClose={() => setOpen(null)}>
          <Pill tone={TONE[s.status]}>{s.status}</Pill>
          <Kv rows={[["Country", s.country], ["State", s.state], ["Type", s.type], ["Products live", String(s.live)], ["Joined", `${s.joined} 2026`], ["BD contact", s.bd], ["Sample terms", "v2 agreed"]]} />
          {s.status === "Reconnect needed" && <div className="v2-alert"><span>Seller Center access expired. TikTok requests on hold.</span><button type="button" onClick={() => toast("Reminder sent")}>Remind</button></div>}
          {!freezing ? (
            <div className="v2-row">
              {s.status === "Frozen" ? (
                <button type="button" className="np-btn v2-btn-sm" onClick={() => { setList((l) => l.map((x) => (x.shop === s.shop ? { ...x, status: "Active" } : x))); toast("Unfrozen · logged"); }}>Unfreeze</button>
              ) : (
                <button type="button" className="ad-btn-ghost danger" onClick={() => { setFreezing(true); setReason(null); setNote(""); }}>Freeze account</button>
              )}
              <button type="button" className="ad-btn-ghost" onClick={() => toast(`Message sent to ${s.shop}`)}>Message seller</button>
            </div>
          ) : (
            <>
              <Sec>Why freeze?</Sec>
              <Reasons options={["Fake or unsafe products", "Didn't ship samples", "Payment or fraud concern", "Other"]} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder="Note (seller sees the reason)" />
              <div className="v2-row">
                <button type="button" className="np-btn v2-btn-sm ad-btn-danger" disabled={!reason} onClick={() => { setList((l) => l.map((x) => (x.shop === s.shop ? { ...x, status: "Frozen" } : x))); setFreezing(false); toast(`${s.shop} frozen · TAP requests paused · logged`); }}>Freeze now</button>
                <button type="button" className="ad-btn-ghost" onClick={() => setFreezing(false)}>Cancel</button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
