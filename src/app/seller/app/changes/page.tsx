"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { CHANGE_REQUESTS, SHOP_ITEMS, type ChangeReq, type ReqStatus } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { labelCase } from "@/lib/label-case";
import { Rich } from "@/components/seller/seller-ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

const KINDS: [ChangeReq["kind"], string, IconName][] = [
  ["Raise commission", tx("Pay creators more"), "tag"],
  ["End early", tx("Stop before the end date"), "x"],
];
/** When to end, and how the request reads for each (English is kept on the request; shown with t()). */
const ENDS: [string, string][] = [[tx("Today"), tx("End today")], [tx("In 7 days"), tx("End in 7 days")], [tx("On 30 Nov"), tx("End on 30 Nov")]];
const STATUS: Record<ReqStatus, string> = { Sent: "badge-blue", "In progress": "badge-amber", Done: "", "Not possible": "badge-gray" };

/**
 * Ask the Techwide team to raise commission or end a product early. They make the change in TAP. Samples are set when a product is
 * submitted to our TAP, not added here (owner, 29 Oct 2026).
 */
export default function Changes() {
  const t = useT();
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

  const detail = kind === "Raise commission" ? `${tap}% → ${tap + raiseBy}%` : ENDS.find(([w]) => w === endWhen)?.[1] ?? "";

  const send = () => {
    const id = `REQ-${1049 + reqs.length - CHANGE_REQUESTS.length}`;
    setReqs([{ id, kind, item: item.id, detail, when: "Today", status: "Sent", note: note.trim() || tx("Waiting for our team") }, ...reqs]);
    setNote("");
    toast(t("{id} sent", { id }));
  };

  return (
    <div className="v2-stack v2-in">
      <Title title={t("Change or End")} sub={t("We make the change in TAP, usually within 1 working day.")} />

      <div className="v2-split">
        <section className="v2-card">
          <h2 className="v2-h2">{t("New Request")}</h2>
          <div className="v2-field">{t("Request type")}
            <div className="sl-radio-list">
              {KINDS.map(([k, line, icon]) => (
                <label key={k} className={`np-radio ${kind === k ? "on" : ""}`}>
                  <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
                  <span><b>{t(k)}</b><small>{t(line)}</small></span>
                  <Icon name={icon} size={18} />
                </label>
              ))}
            </div>
          </div>

          <label className="v2-field">{t("Product")}
            <select className="np-input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {live.map((l) => <option key={l.id} value={l.id}>{l.name} · TAP {l.tapRate}%</option>)}
            </select>
          </label>

          {kind === "Raise commission" && (
            <div className="v2-field">{t("Raise by")}
              <div className="v2-chips">
                {[1, 2, 4, 6].map((n) => (
                  <button key={n} type="button" className={`v2-chip ${raiseBy === n ? "on" : ""}`} onClick={() => setRaiseBy(n)}>+{n}%</button>
                ))}
              </div>
              <small><Rich b={{ color: "var(--gink)" }} text={t("{now}% now → <b>{next}%</b>. TikTok usually approves in 1–3 working days.", { now: tap, next: tap + raiseBy })} /></small>
            </div>
          )}
          {kind === "End early" && (
            <div className="v2-field">{t("When")}
              <div className="v2-chips">
                {ENDS.map(([w]) => (
                  <button key={w} type="button" className={`v2-chip ${endWhen === w ? "on" : ""}`} onClick={() => setEndWhen(w)}>{t(w)}</button>
                ))}
              </div>
              <small>{t("Creators with samples still post. Sent samples can't be taken back.")}</small>
            </div>
          )}

          <label className="v2-field">{t("Note")} <small>{t("Optional")}</small>
            <textarea className="np-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("e.g. Raya promo starts 1 Dec")} />
          </label>
          <button type="button" className="np-btn" onClick={send}>{t("Send Request")}</button>
        </section>

        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">{t("Your Requests")}</h2><span className="v2-small">{reqs.length}</span></div>
          <div>
            {reqs.map((r) => {
              const p = SHOP_ITEMS.find((s) => s.id === r.item);
              return (
                <div key={r.id} className="sl-req">
                  <span>
                    <b>{t(r.kind)}: {t(r.detail)}</b>
                    {p && <small><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></small>}
                    <small>{r.id} · {t(r.when)}{r.note ? ` · ${t(r.note)}` : ""}</small>
                  </span>
                  <span className={`badge ${STATUS[r.status]}`} style={{ alignSelf: "flex-start" }}>{t(labelCase(r.status))}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
