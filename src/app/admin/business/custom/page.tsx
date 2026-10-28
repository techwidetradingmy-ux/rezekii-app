"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Kv, Pill, Sec, type Tone } from "@/components/admin/bits";
import { CUSTOM, ME, type CustomStatus } from "@/lib/mock-admin";

type Req = (typeof CUSTOM)[number];
const STATUSES: CustomStatus[] = ["New", "Quoted", "In progress", "Done", "Declined"];
const TONE: Record<CustomStatus, Tone> = { New: "info", Quoted: "warn", "In progress": "warn", Done: "ok", Declined: "mute" };
type Filter = "Open" | "Done or declined";

/** Custom service: sellers who want the team to run it for them. */
export default function CustomService() {
  const { toast } = useDemo();
  const [list, setList] = useState<Req[]>(CUSTOM);
  const [filter, setFilter] = useState<Filter>("Open");
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const isOpen = (r: Req) => r.status !== "Done" && r.status !== "Declined";
  const shown = list.filter((r) => (filter === "Open" ? isOpen(r) : !isOpen(r)));
  const r = list.find((x) => x.id === open) ?? null;
  const set = (patch: Partial<Req>) => r && setList((l) => l.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Custom Service" sub="Sellers who want our team to run it." />

      <Chips<Filter> label="Filter" value={filter} onChange={setFilter} options={[["Open", list.filter(isOpen).length], ["Done or declined", list.filter((x) => !isOpen(x)).length]]} />

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((x) => (
            <button key={x.id} type="button" className="ad-row ad-rowbtn click" onClick={() => { setOpen(x.id); setReply(""); }}>
              <Av name={x.shop} />
              <span className="main">
                <b>{x.shop} · {x.want}</b>
                <small>{x.id} · {x.when} · Budget: {x.budget}</small>
              </span>
              {x.owner ? <span className="v2-row" style={{ gap: 6 }}><Av name={x.owner} size={26} /><span className="v2-small">{x.owner}</span></span> : <span className="ad-tag gray">Unassigned</span>}
              <Pill tone={TONE[x.status]}>{x.status}</Pill>
            </button>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
        </div>
      </section>

      {r && (
        <Sheet title={`${r.id} · ${r.shop}`} onClose={() => setOpen(null)}>
          <Pill tone={TONE[r.status]}>{r.status}</Pill>
          <Kv rows={[["Wants", r.want], ["Budget note", r.budget], ["Details", r.detail], ["Asked", r.when]]} />
          <Sec>Status</Sec>
          <div className="v2-chips">
            {STATUSES.map((s) => (
              <button key={s} type="button" className={`v2-chip ${r.status === s ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { set({ status: s }); toast(`Status: ${s} · visible to seller`); }}>{s}</button>
            ))}
          </div>
          <Sec>Owner</Sec>
          <div className="v2-chips">
            {[ME, "Wei Jie", "Nadia"].map((n) => (
              <button key={n} type="button" className={`v2-chip ${r.owner === n ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { set({ owner: n }); toast(`Assigned to ${n}`); }}>{n === ME ? "Me" : n}</button>
            ))}
          </div>
          <Sec>Reply to seller</Sec>
          <textarea className="np-input" rows={3} value={reply} placeholder="Goes to seller app and email" onChange={(e) => setReply(e.target.value)} />
          <button type="button" className="np-btn" disabled={!reply.trim()} onClick={() => { toast(`Reply sent to ${r.shop}`); setReply(""); }}>
            <Icon name="send" size={17} /> Send reply
          </button>
        </Sheet>
      )}
    </div>
  );
}
