"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { CHANGE_REQUESTS, SHOP_ITEMS, type ChangeReq, type ReqStatus } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";

const KINDS: [ChangeReq["kind"], string, IconName][] = [
  ["Raise commission", "Pay creators more", "tag"],
  ["End early", "Stop before the end date", "x"],
];
const STATUS: Record<ReqStatus, string> = { Sent: "badge-blue", "In progress": "badge-amber", Done: "", "Not possible": "badge-gray" };

/**
 * Ask the Techwide team to raise commission or end a product early. They make the change in TAP. Samples are set when a product is
 * submitted to our TAP, not added here (owner, 29 Oct 2026).
 */
export default function Changes() {
  const { toast } = useDemo();
  const live = SHOP_ITEMS.filter((s) => s.stage === "Live");
  const [kind, setKind] = useState<ChangeReq["kind"]>("Raise commission");
  const [itemId, setItemId] = useState(live[0].id);
  const [raiseBy, setRaiseBy] = useState(2);
  const [endWhen, setEndWhen] = useState("In 7 days");
  const [note, setNote] = useState("");
  const [reqs, setReqs] = useState<ChangeReq[]>(CHANGE_REQUESTS);
  const item = live.find((l) => l.id === itemId) ?? live[0];
  const tap = item.tapRate ?? 0;

  const detail = kind === "Raise commission" ? `${tap}% → ${tap + raiseBy}%` : `End ${endWhen.toLowerCase()}`;

  const send = () => {
    const id = `REQ-${1049 + reqs.length - CHANGE_REQUESTS.length}`;
    setReqs([{ id, kind, item: item.id, detail, when: "Today", status: "Sent", note: note.trim() || "Waiting for our team" }, ...reqs]);
    setNote("");
    toast(`${id} sent`);
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Change or End" sub="We make the change in TAP, usually within 1 working day." />

      <div className="v2-split">
        <section className="v2-card">
          <h2 className="v2-h2">New Request</h2>
          <div className="v2-field">Request type
            <div className="sl-radio-list">
              {KINDS.map(([k, line, icon]) => (
                <label key={k} className={`np-radio ${kind === k ? "on" : ""}`}>
                  <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
                  <span><b>{k}</b><small>{line}</small></span>
                  <Icon name={icon} size={18} />
                </label>
              ))}
            </div>
          </div>

          <label className="v2-field">Product
            <select className="np-input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {live.map((l) => <option key={l.id} value={l.id}>{l.name} · TAP {l.tapRate}%</option>)}
            </select>
          </label>

          {kind === "Raise commission" && (
            <div className="v2-field">Raise by
              <div className="v2-chips">
                {[1, 2, 4, 6].map((n) => (
                  <button key={n} type="button" className={`v2-chip ${raiseBy === n ? "on" : ""}`} onClick={() => setRaiseBy(n)}>+{n}%</button>
                ))}
              </div>
              <small>{tap}% now → <b style={{ color: "var(--gink)" }}>{tap + raiseBy}%</b>. TikTok usually approves in 1–3 working days.</small>
            </div>
          )}
          {kind === "End early" && (
            <div className="v2-field">When
              <div className="v2-chips">
                {["Today", "In 7 days", "On 30 Nov"].map((n) => (
                  <button key={n} type="button" className={`v2-chip ${endWhen === n ? "on" : ""}`} onClick={() => setEndWhen(n)}>{n}</button>
                ))}
              </div>
              <small>Creators with samples still post. Sent samples can&apos;t be taken back.</small>
            </div>
          )}

          <label className="v2-field">Note <small>Optional</small>
            <textarea className="np-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Raya promo starts 1 Dec" />
          </label>
          <button type="button" className="np-btn" onClick={send}>Send Request</button>
        </section>

        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">Your Requests</h2><span className="v2-small">{reqs.length}</span></div>
          <div>
            {reqs.map((r) => {
              const p = SHOP_ITEMS.find((s) => s.id === r.item);
              return (
                <div key={r.id} className="sl-req">
                  <span>
                    <b>{r.kind}: {r.detail}</b>
                    {p && <small><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></small>}
                    <small>{r.id} · {r.when}{r.note ? ` · ${r.note}` : ""}</small>
                  </span>
                  <span className={`badge ${STATUS[r.status]}`} style={{ alignSelf: "flex-start" }}>{r.status}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
