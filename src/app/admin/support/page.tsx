"use client";

import "@/app/admin.css";
import { LiveDisputes } from "@/components/admin/live-disputes";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Av, Chips, Kv, Pill, Sec, type Tone } from "@/components/admin/bits";
import { DISPUTES, ME, type DisputeStatus } from "@/lib/mock-admin";

type D = (typeof DISPUTES)[number];
type Kind = "All" | D["kind"];
const STATUS: DisputeStatus[] = ["Open", "Waiting on creator", "Waiting on seller", "Resolved"];
const TONE: Record<DisputeStatus, Tone> = { Open: "info", "Waiting on creator": "warn", "Waiting on seller": "warn", Resolved: "ok" };
const KIND_ICON: Record<D["kind"], [IconName, string]> = {
  "Sample not received": ["box", "linear-gradient(135deg,#7aa2ff,#1d4ed8)"],
  "Creator overdue": ["alert", "linear-gradient(135deg,#ffb35c,#f08a00)"],
  "Seller complaint": ["inbox", "linear-gradient(135deg,#ff7aa8,#e8005a)"],
};

/** Disputes between creators and sellers: sample not received, creator overdue, seller complaint. */
export default function Disputes() {
  const { toast, live } = useDemo();
  const [list, setList] = useState<D[]>(DISPUTES);
  const [show, setShow] = useState<"Open" | "Resolved">("Open");
  const [kind, setKind] = useState<Kind>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [to, setTo] = useState<"Creator" | "Seller" | "Both">("Both");
  const [msg, setMsg] = useState("");
  // Signed in (owner, 31 Oct 2026): real cases.
  if (live) return <LiveDisputes />;

  const openOnes = list.filter((x) => x.status !== "Resolved");
  const base = show === "Open" ? openOnes : list.filter((x) => x.status === "Resolved");
  const shown = base.filter((x) => kind === "All" || x.kind === kind);
  const d = list.find((x) => x.id === open) ?? null;
  const set = (patch: Partial<D>) => d && setList((l) => l.map((x) => (x.id === d.id ? { ...x, ...patch } : x)));
  const addLog = (text: string) => d && set({ log: [...d.log, { when: "28 Oct 10:50", who: ME, text }] });

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Disputes" sub="Sample, video or seller problems. Each has an owner and due date." />

      <div className="ad-bar">
        <Seg value={show} options={["Open", "Resolved"] as const} onChange={setShow} />
        <span className="sp" />
        <span className="v2-small">{openOnes.filter((x) => x.late).length} due today</span>
      </div>
      <Chips<Kind> label="Kind" value={kind} onChange={setKind} options={(["All", "Sample not received", "Creator overdue", "Seller complaint"] as Kind[]).map((k) => [k, base.filter((x) => k === "All" || x.kind === k).length] as [Kind, number])} />

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((x) => (
            <button key={x.id} type="button" className="ad-row ad-rowbtn click" onClick={() => { setOpen(x.id); setMsg(""); }}>
              <span className="ad-qico" style={{ background: KIND_ICON[x.kind][1] }}><Icon name={KIND_ICON[x.kind][0]} size={18} /></span>
              <span className="main">
                <b>{x.title}</b>
                <small>{x.id} · {x.kind} · {x.creator} and {x.seller} · opened {x.opened}</small>
              </span>
              {x.owner ? <Av name={x.owner} size={26} /> : <span className="ad-tag gray">Unassigned</span>}
              {x.status !== "Resolved" && <span className={`ad-tag ${x.late ? "red" : "gray"}`}>Due {x.due}</span>}
              <Pill tone={TONE[x.status]}>{x.status}</Pill>
            </button>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0", margin: 0 }}>Nothing here.</p>}
        </div>
      </section>

      {d && (
        <Sheet title={`${d.id} · ${d.kind}`} onClose={() => setOpen(null)}>
          <b style={{ fontSize: 16, marginTop: -6 }}>{d.title}</b>
          <Kv rows={[["Creator", d.creator], ["Seller", d.seller], ["Opened", d.opened], ["Due", d.due], ["Owner", d.owner ?? "Unassigned"]]} />
          <Sec>Status</Sec>
          <div className="v2-chips">
            {STATUS.map((s) => (
              <button key={s} type="button" className={`v2-chip ${d.status === s ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { set({ status: s }); toast(`Status: ${s}`); }}>{s}</button>
            ))}
          </div>
          {!d.owner && <button type="button" className="ad-btn-ghost" onClick={() => { set({ owner: ME }); toast("Assigned to you"); }}><Icon name="user" size={15} /> Assign to Me</button>}

          <Sec>What happened</Sec>
          <ul className="ad-tl">
            {[...d.log].reverse().map((l, i) => (
              <li key={i} className={l.who === "System" ? "warn" : ""}><small>{l.when} · {l.who}</small>{l.text}</li>
            ))}
          </ul>

          <Sec>Reply</Sec>
          <Seg value={to} options={["Creator", "Seller", "Both"] as const} onChange={setTo} />
          <textarea className="np-input" rows={3} value={msg} placeholder={`Message to ${to === "Both" ? "both" : `the ${to.toLowerCase()}`} (in app and by email)`} onChange={(e) => setMsg(e.target.value)} />
          <button type="button" className="ad-btn-ghost" disabled={!msg.trim()} onClick={() => { addLog(`Replied to ${to.toLowerCase()}: ${msg.trim()}`); setMsg(""); toast("Reply sent"); }}><Icon name="send" size={15} /> Send Reply</button>

          {d.status !== "Resolved" && (
            <>
              <Sec>Decide</Sec>
              <div className="v2-row">
                <button type="button" className="np-btn v2-btn-sm" onClick={() => { set({ status: "Resolved", log: [...d.log, { when: "28 Oct 10:52", who: ME, text: "Decided for the creator. Closed." }] }); toast("Closed · added to both reliability records"); }}>Creator is Right</button>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => { set({ status: "Resolved", log: [...d.log, { when: "28 Oct 10:52", who: ME, text: "Decided for the seller. Closed." }] }); toast("Closed · added to both reliability records"); }}>Seller is Right</button>
              </div>
              <span className="v2-small">Goes on both records. Both are notified.</span>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
