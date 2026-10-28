"use client";

import "@/app/seller.css";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { CHANGE_REQUESTS, SHOP_ITEMS, type ChangeReq, type ReqStatus } from "@/lib/mock-seller";

const KINDS: [ChangeReq["kind"], string, IconName][] = [
  ["Raise commission", "Pay creators more through TAP", "tag"],
  ["Add samples", "Top up samples per SKU", "box"],
  ["End early", "Stop a product before its end date", "x"],
];
const STATUS: Record<ReqStatus, string> = { Sent: "badge-blue", "In progress": "badge-amber", Done: "", "Not possible": "badge-gray" };

/** Ask the Techwide team to raise commission, add samples or end a product early. They make the change in TAP. */
export default function Changes() {
  const { toast } = useDemo();
  const live = SHOP_ITEMS.filter((s) => s.stage === "Live");
  const [kind, setKind] = useState<ChangeReq["kind"]>("Raise commission");
  const [itemId, setItemId] = useState(live[0].id);
  const [raiseBy, setRaiseBy] = useState(2);
  const [addN, setAddN] = useState(20);
  const [endWhen, setEndWhen] = useState("In 7 days");
  const [note, setNote] = useState("");
  const [reqs, setReqs] = useState<ChangeReq[]>(CHANGE_REQUESTS);
  const item = live.find((l) => l.id === itemId) ?? live[0];
  const tap = item.tapRate ?? 0;

  const detail = kind === "Raise commission" ? `${tap}% → ${tap + raiseBy}%` : kind === "Add samples" ? `+${addN} samples per SKU` : `End ${endWhen.toLowerCase()}`;

  const send = () => {
    const id = `REQ-${1049 + reqs.length - CHANGE_REQUESTS.length}`;
    setReqs([{ id, kind, item: item.id, detail, when: "Today", status: "Sent", note: note.trim() || "Waiting for the Techwide team to pick it up" }, ...reqs]);
    setNote("");
    toast(`${id} sent to the Techwide team`);
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Change or End" sub="Send a request and our team makes the change in TAP. Most are done within 1 working day." />

      <div className="v2-split">
        <section className="v2-card">
          <h2 className="v2-h2">New request</h2>
          <div className="v2-field">What do you want to do?
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
              <small>{tap}% now → <b style={{ color: "var(--gink)" }}>{tap + raiseBy}%</b> in TAP. TikTok approves the new rate, usually in 1–3 working days.</small>
            </div>
          )}
          {kind === "Add samples" && (
            <div className="v2-field">Add per SKU
              <div className="v2-chips">
                {[10, 20, 30, 50].map((n) => (
                  <button key={n} type="button" className={`v2-chip ${addN === n ? "on" : ""}`} onClick={() => setAddN(n)}>+{n}</button>
                ))}
              </div>
              <small>{item.samplesLeft} of {item.samples} left now. Added samples are your marketing cost, shipped through TikTok.</small>
            </div>
          )}
          {kind === "End early" && (
            <div className="v2-field">When
              <div className="v2-chips">
                {["Today", "In 7 days", "On 30 Nov"].map((n) => (
                  <button key={n} type="button" className={`v2-chip ${endWhen === n ? "on" : ""}`} onClick={() => setEndWhen(n)}>{n}</button>
                ))}
              </div>
              <small>Creators who already have samples still finish their videos. Samples already sent can&apos;t be taken back.</small>
            </div>
          )}

          <label className="v2-field">Anything we should know? <small>Optional</small>
            <textarea className="np-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Raya promo starts 1 Dec" />
          </label>
          <button type="button" className="np-btn" onClick={send}>Send request</button>
        </section>

        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">Your requests</h2><span className="v2-small">{reqs.length}</span></div>
          <div>
            {reqs.map((r) => {
              const p = SHOP_ITEMS.find((s) => s.id === r.item);
              return (
                <div key={r.id} className="sl-req">
                  <span>
                    <b>{r.kind}: {r.detail}</b>
                    <small>{p?.name}</small>
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
