"use client";

import "@/app/admin.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Celebrate, Sheet, Title } from "@/components/ui";
import { Av, Chips, Reasons } from "@/components/admin/bits";
import { SAMPLES, type SampleReq } from "@/lib/mock-admin";
import { product, type Verdict } from "@/lib/mock";
import { adminProductHref } from "@/lib/product-pages";

type Filter = "Suggest approve" | "Needs a look" | "Suggest reject";
const OF: Record<Filter, Verdict> = { "Suggest approve": "Approve", "Needs a look": "Look", "Suggest reject": "Reject" };
const VERDICT_LABEL: Record<Verdict, string> = { Approve: "Suggest approve", Look: "Needs a look", Reject: "Suggest reject" };

type Done = { result?: "Approved" | "Rejected" | "Waiting"; at?: string; overruled?: { reason: string; note: string; to: "Approve" | "Reject" } };

/** Sample review: the system pre-checks every request against fixed rules; staff decide in Partner Center. */
export default function SampleReview() {
  const { toast } = useDemo();
  const [filter, setFilter] = useState<Filter>("Suggest approve");
  const [done, setDone] = useState<Record<string, Done>>({});
  const [handled, setHandled] = useState(31);
  const [overruled, setOverruled] = useState(2);
  const [disagree, setDisagree] = useState<SampleReq | null>(null);
  const [walk, setWalk] = useState(false);

  const count = (f: Filter) => SAMPLES.filter((s) => s.verdict === OF[f] && done[s.id]?.result !== "Approved" && done[s.id]?.result !== "Rejected").length;
  const list = SAMPLES.filter((s) => s.verdict === OF[filter]);
  const toApprove = SAMPLES.filter((s) => s.verdict === "Approve" && !done[s.id]);

  /** Partner Center opens in a new tab; the result is read back from TikTok a moment later. */
  const act = (s: SampleReq, to: "Approve" | "Reject") => {
    toast(`Partner Center opened for ${s.handle} · ${to === "Approve" ? "approve" : "reject"} there`);
    setDone((d) => ({ ...d, [s.id]: { ...d[s.id], result: "Waiting" } }));
    window.setTimeout(() => {
      setDone((d) => ({ ...d, [s.id]: { ...d[s.id], result: to === "Approve" ? "Approved" : "Rejected", at: "10:46" } }));
      setHandled((n) => n + 1);
    }, 1600);
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Sample Review" sub="System pre-checks each request. You decide.">
        <button type="button" className="np-btn v2-btn-sm" disabled={toApprove.length === 0} onClick={() => setWalk(true)}>
          <Icon name="check" size={16} /> Approve suggested ({toApprove.length})
        </button>
      </Title>

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>Waiting</small><b>{SAMPLES.length - Object.values(done).filter((d) => d.result === "Approved" || d.result === "Rejected").length}</b><em>Oldest 6 h ago</em></div>
        <div className="v2-stat"><small>Handled today</small><b>{handled}</b><em className="up">From TikTok</em></div>
        <div className="v2-stat"><small>Overruled</small><b>{overruled}</b><em>Tunes the rules</em></div>
      </div>

      <div className="v2-alert" style={{ background: "var(--bsoft)", color: "var(--blue)" }}>
        <Icon name="shield" size={20} />
        <span>Decide in Partner Center. We read it back and notify the creator.</span>
      </div>

      <Chips<Filter> label="Filter by system verdict" value={filter} onChange={setFilter} options={[["Suggest approve", count("Suggest approve")], ["Needs a look", count("Needs a look")], ["Suggest reject", count("Suggest reject")]]} />

      <div className="v2-stack" style={{ gap: 14 }}>
        {list.map((s) => (
          <RequestCard key={s.id} s={s} state={done[s.id]} onAct={(to) => act(s, to)} onDisagree={() => setDisagree(s)} />
        ))}
      </div>

      {disagree && (
        <DisagreeSheet
          s={disagree}
          onClose={() => setDisagree(null)}
          onSave={(reason, note, to) => {
            setDone((d) => ({ ...d, [disagree.id]: { ...d[disagree.id], overruled: { reason, note, to } } }));
            setOverruled((n) => n + 1);
            setDisagree(null);
            toast("Decision logged");
          }}
        />
      )}

      {walk && <Walkthrough items={toApprove} onClose={() => setWalk(false)} onDone={(id) => { setDone((d) => ({ ...d, [id]: { result: "Approved", at: "10:47" } })); setHandled((n) => n + 1); }} />}
    </div>
  );
}

function RequestCard({ s, state, onAct, onDisagree }: { s: SampleReq; state?: Done; onAct: (to: "Approve" | "Reject") => void; onDisagree: () => void }) {
  const p = product(s.productId);
  const call: Verdict = state?.overruled?.to ?? s.verdict;
  const finished = state?.result === "Approved" || state?.result === "Rejected";
  // The only sample rule left is the posting streak the seller asks for (owner, 30 Oct 2026).
  const daysOk = !s.missing && s.days >= s.streak;
  const facts: [string, string, boolean][] = [
    ["Days in a row", s.missing ? "Can't count" : !s.streak ? `${s.days} days · none needed` : daysOk ? `${s.days} of ${s.streak} days` : `${s.days} of ${s.streak} days`, daysOk],
    ["Delivery rate", s.delivery, s.deliveryOk],
    ["Overdue samples", s.overdue ? `${s.overdue} overdue` : "None", s.overdue === 0],
    ["Rezekii level", s.level, true],
    ["TikTok level", `Lv.${s.tt}`, true],
    ["Category", s.category, s.categoryOk],
    ["Seller conditions", s.seller, s.sellerOk],
  ];
  return (
    <section className={`v2-card ${finished ? "ad-handled" : ""}`}>
      <div className="ad-req">
        <div className="v2-stack" style={{ gap: 12 }}>
          <div className="ad-req-who">
            <Av name={s.handle} size={42} />
            <span>
              <b>{s.handle}</b>
              <small>{s.id} · asked {s.asked}</small>
            </span>
            {/* Product (owner, 29 Oct 2026): the product opens its page. */}
            <Link href={adminProductHref(p.id)} className="ad-req-prod" style={{ flex: "1 1 240px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-thumb" src={p.img} alt="" />
              <span>
                <b>{p.name}</b>
                <small className="v2-small">{p.shop} · {s.streak ? `needs a ${s.streak}-day streak` : "open to all"}</small>
              </span>
            </Link>
          </div>
          <div className="ad-facts">
            {facts.map(([k, v, ok]) => (
              <div key={k} className={`ad-fact ${ok ? "" : "no"}`}>
                <small>{k}</small>
                <b><Icon name={ok ? "check" : "x"} size={15} width={2.6} />{v}</b>
              </div>
            ))}
          </div>
          {s.missing && <div className="v2-alert" style={{ padding: "10px 14px" }}><span>Missing data: {s.missing}</span></div>}
          <p className="ad-summary">{s.summary}</p>
          {(call === "Reject" || state?.result === "Rejected") && (
            <div className="ad-sees">
              <b>Creator sees</b>
              {state?.overruled?.to === "Reject" ? `${state.overruled.reason}${state.overruled.note ? `: ${state.overruled.note}` : ""}` : s.creatorSees ?? "Not approved this time. Keep posting to unlock more samples."}
            </div>
          )}
          {state?.overruled && (
            <p className="v2-small" style={{ margin: 0 }}>
              You disagreed: {state.overruled.to === "Approve" ? "approve" : "reject"} · reason: {state.overruled.reason}{state.overruled.note ? ` (${state.overruled.note})` : ""} · logged
            </p>
          )}
        </div>

        <div className="ad-req-side">
          <span className={`ad-verdict ${s.verdict}`}>
            <Icon name={s.verdict === "Approve" ? "check" : s.verdict === "Reject" ? "x" : "eye"} size={16} width={2.6} />
            {VERDICT_LABEL[s.verdict]}
          </span>
          {finished ? (
            <span className="ad-okmark"><Icon name="check" size={16} /> {state?.result} in Partner Center · read back {state?.at}</span>
          ) : state?.result === "Waiting" ? (
            <span className="v2-small"><span className="ad-spin"><Icon name="refresh" size={14} /></span> Waiting for TikTok…</span>
          ) : (
            <>
              {call !== "Reject" && (
                <button type="button" className="np-btn v2-btn-sm" onClick={() => onAct("Approve")}>
                  <Icon name="link" size={15} /> Approve in Partner Center
                </button>
              )}
              {call !== "Approve" && (
                <button type="button" className={call === "Reject" ? "np-btn v2-btn-sm ad-btn-danger" : "ad-btn-ghost"} onClick={() => onAct("Reject")}>
                  <Icon name="link" size={15} /> Reject in Partner Center
                </button>
              )}
              {!state?.overruled && s.verdict !== "Look" && (
                <button type="button" className="v2-link" style={{ fontSize: 14 }} onClick={onDisagree}>Disagree</button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DisagreeSheet({ s, onClose, onSave }: { s: SampleReq; onClose: () => void; onSave: (reason: string, note: string, to: "Approve" | "Reject") => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const to = s.verdict === "Approve" ? "Reject" : "Approve";
  return (
    <Sheet title="Disagree" onClose={onClose}>
      <p className="v2-muted" style={{ margin: 0 }}>
        System says <b>{s.verdict === "Approve" ? "approve" : "reject"}</b> {s.handle}. You want to <b>{to === "Approve" ? "approve" : "reject"}</b>. Pick a reason.
      </p>
      <Reasons options={["Seller asked", "Data wrong", "Other"]} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder={to === "Reject" ? "Creator sees this" : "What's different?"} />
      <button type="button" className="np-btn" disabled={!reason || (reason === "Other" && !note.trim())} onClick={() => reason && onSave(reason, note.trim(), to)}>
        Save decision
      </button>
      <span className="v2-small" style={{ textAlign: "center" }}>Logged with your name.</span>
    </Sheet>
  );
}

/** Walks through every "suggest approve" one by one: open Partner Center, result is read back, next. */
function Walkthrough({ items, onClose, onDone }: { items: SampleReq[]; onClose: () => void; onDone: (id: string) => void }) {
  const [list] = useState(items);
  const [i, setI] = useState(0);
  const [state, setState] = useState<"ready" | "waiting" | "back">("ready");
  const [cele, setCele] = useState(false);
  const [approved, setApproved] = useState(0);
  const s = list[i];
  const p = s ? product(s.productId) : null;

  const open = () => {
    setState("waiting");
    window.setTimeout(() => {
      setState("back");
      setApproved((n) => n + 1);
      onDone(s.id);
    }, 1300);
  };
  const next = () => {
    if (i + 1 >= list.length) { setCele(true); return; }
    setI(i + 1);
    setState("ready");
  };

  if (cele) {
    return <Celebrate tone="green" icon="check" title={`${approved} approved`} line="Read back from TikTok" cheer={approved < list.length ? `${list.length - approved} skipped. Approved creators notified.` : "Creators notified."} onClose={onClose} />;
  }
  if (!s || !p) return null;
  return (
    <Sheet title="Suggested Approvals" onClose={onClose}>
      <div className="ad-dots" aria-label={`${i + 1} of ${list.length}`}>
        {list.map((x, k) => <i key={x.id} className={k < i || (k === i && state === "back") ? "on" : k === i ? "now" : ""} />)}
      </div>
      <span className="v2-small">{i + 1} of {list.length}</span>
      <div className="ad-walk">
        <div className="ad-walk-step">
          <Av name={s.handle} size={44} />
          <span>
            <b>{s.handle}</b>
            <small className="v2-small">{s.days} days in a row · {s.level} · TikTok Lv.{s.tt}</small>
          </span>
        </div>
        <div className="ad-req-prod">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ad-thumb" src={p.img} alt="" />
          <span><b>{p.name}</b><small className="v2-small">{s.streak ? `${s.streak}-day streak` : "Open to all"} · {p.shop}</small></span>
        </div>
        <p className="ad-summary">{s.summary}</p>
        {state === "ready" && <button type="button" className="np-btn" onClick={open}><Icon name="link" size={17} /> Approve in Partner Center</button>}
        {state === "waiting" && <div className="v2-alert" style={{ background: "var(--bsoft)", color: "var(--blue)" }}><span className="ad-spin"><Icon name="refresh" size={16} /></span><span>Approve in Partner Center. Waiting…</span></div>}
        {state === "back" && (
          <>
            <div className="v2-alert green"><Icon name="check" size={18} /><span>Approved · read back from TikTok · creator notified</span></div>
            <button type="button" className="np-btn" onClick={next}>{i + 1 >= list.length ? "Finish" : "Next"} <Icon name="arrow" size={17} /></button>
          </>
        )}
        <button type="button" className="ad-btn-ghost" style={{ alignSelf: "center" }} onClick={next} disabled={state === "waiting"}>Skip</button>
      </div>
    </Sheet>
  );
}
