"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { Av, Chips, Kv, Pill, Sec, type Tone } from "@/components/admin/bits";
import { FEEDBACK, ME, type FbStatus, type FbType } from "@/lib/mock-admin";

type F = (typeof FEEDBACK)[number] & { reply?: string };
type TypeF = "All" | FbType;
const STATUSES: FbStatus[] = ["New", "In progress", "Handled", "Won't do"];
const TONE: Record<FbStatus, Tone> = { New: "info", "In progress": "warn", Handled: "ok", "Won't do": "mute" };
const TYPE: Record<FbType, [IconName, string]> = { Idea: ["spark", "green"], Bug: ["alert", "red"], Complaint: ["inbox", "amber"] };
const open = (f: F) => f.status === "New" || f.status === "In progress";

/** Feedback from creators and sellers: ideas, bugs, complaints. Mark handled, reply. */
export default function FeedbackInbox() {
  const { toast } = useDemo();
  const [list, setList] = useState<F[]>(FEEDBACK);
  const [show, setShow] = useState<"To do" | "Done">("To do");
  const [type, setType] = useState<TypeF>("All");
  const [sel, setSel] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const base = list.filter((f) => (show === "To do" ? open(f) : !open(f)));
  const shown = base.filter((f) => type === "All" || f.type === type);
  const f = list.find((x) => x.id === sel) ?? null;
  const set = (id: string, patch: Partial<F>) => setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Feedback Inbox" sub="From creators and sellers. Page and device attached." />

      <div className="ad-bar">
        <Seg value={show} options={["To do", "Done"] as const} onChange={setShow} />
      </div>
      <Chips<TypeF> label="Type" value={type} onChange={setType} options={(["All", "Idea", "Bug", "Complaint"] as TypeF[]).map((t) => [t, base.filter((x) => t === "All" || x.type === t).length] as [TypeF, number])} />

      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((x) => (
            <div key={x.id} className="ad-row">
              <button type="button" className="ad-row ad-rowbtn click" style={{ flex: "1 1 300px", padding: "4px 6px", minWidth: 0 }} onClick={() => { setSel(x.id); setReply(""); }}>
                <Av name={x.from} size={36} />
                <span className="main">
                  <b>“{x.text}”</b>
                  <small>{x.from} · {x.role} · {x.when} · {x.page}</small>
                </span>
              </button>
              <span className={`ad-tag ${TYPE[x.type][1]}`}><Icon name={TYPE[x.type][0]} size={13} /> {x.type}</span>
              <Pill tone={TONE[x.status]}>{x.status}</Pill>
              {open(x) && <button type="button" className="ad-btn-ghost" onClick={() => { set(x.id, { status: "Handled" }); toast("Marked handled"); }}><Icon name="check" size={15} /> Handled</button>}
            </div>
          ))}
          {shown.length === 0 && <p className="v2-muted" style={{ padding: "14px 0", margin: 0 }}>{show === "To do" ? "All done." : "Nothing handled yet."}</p>}
        </div>
      </section>

      {f && (
        <Sheet title={`${f.type} from ${f.from}`} onClose={() => setSel(null)}>
          <p style={{ margin: "-4px 0 0", fontSize: 17, fontWeight: 700, lineHeight: 1.45 }}>“{f.text}”</p>
          <Kv rows={[["From", `${f.from} (${f.role})`], ["Page", f.page], ["Device", f.device], ["Sent", f.when], ["ID", f.id]]} />
          <Sec>Status</Sec>
          <div className="v2-chips">
            {STATUSES.map((s) => (
              <button key={s} type="button" className={`v2-chip ${f.status === s ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { set(f.id, { status: s }); toast(`Status: ${s}`); }}>{s}</button>
            ))}
          </div>
          <Sec>Reply</Sec>
          {f.reply && <div className="ad-note"><small>{ME} replied</small>{f.reply}</div>}
          <textarea className="np-input" rows={3} value={reply} placeholder={`Goes to app and email`} onChange={(e) => setReply(e.target.value)} />
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm" disabled={!reply.trim()} onClick={() => { set(f.id, { reply: reply.trim(), status: f.status === "New" ? "In progress" : f.status }); setReply(""); toast(`Reply sent to ${f.from}`); }}><Icon name="send" size={15} /> Send reply</button>
            <button type="button" className="ad-btn-ghost" onClick={() => { set(f.id, { status: "Handled" }); toast(`Handled · ${f.from} notified`); setSel(null); }}><Icon name="check" size={15} /> Mark handled</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
