"use client";

import "@/app/admin.css";
import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Kv, Pill, Reasons, Sec, type Tone } from "@/components/admin/bits";
import { COLS, ME, TICKETS, type Col, type ExtTask, type Ticket } from "@/lib/mock-admin";

const NOW = "28 Oct 10:45";
const COL_TONE: Record<Col, Tone> = { New: "info", "In review": "warn", "To submit": "warn", "Waiting on TikTok": "info", "Not approved": "bad", Live: "ok" };
const STATE_LABEL: Record<ExtTask["state"], string> = { Success: "Success", Failed: "Failed", Person: "Waiting for a person", Waiting: "Waiting on TikTok", "Done by hand": "Done by hand", Running: "Running" };
const STATE_TONE: Record<ExtTask["state"], Tone> = { Success: "ok", Failed: "bad", Person: "warn", Waiting: "info", "Done by hand": "ok", Running: "info" };

type Result = { selected: number; run: number; skipped: [string, string][]; ok: string[]; failed: [string, string][]; retried?: boolean };

const needsPerson = (t: Ticket) => t.tasks.some((x) => x.state === "Person");
const hasFail = (t: Ticket) => t.tasks.some((x) => x.state === "Failed");
const whyNot = (t: Ticket) =>
  t.block ? "shop authorisation expired" : t.col === "New" || t.col === "In review" ? "review not finished" : t.col === "Live" ? "already live" : t.col === "Not approved" ? "not approved" : t.col === "Waiting on TikTok" ? "already sent, waiting on TikTok" : "";

/** TAP pipeline: kanban by business status; each card also shows how its external (TikTok) tasks are doing. */
export default function TapPipeline() {
  const { toast } = useDemo();
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  const [mine, setMine] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const seq = useRef(7000);
  const extId = () => `1730 ${4500 + (seq.current++ % 400)} ${String(1000 + seq.current * 7).slice(-4)}`;

  const update = (id: string, fn: (t: Ticket) => Ticket) => setTickets((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  /** Runs every task the API can do; tasks TikTok has no API for stay with a person. */
  const submitOne = (t: Ticket, fail?: string): Ticket => {
    if (fail) {
      return {
        ...t, fail: true, what: "TikTok: 1 failed / 2", age: "now",
        tasks: [{ id: "t1", name: "Product registration", state: "Failed", message: fail, retry: [1, 5], nextRetry: "11:05" }, { id: "t2", name: "Commission setting", state: "Waiting", why: "Runs after product registration succeeds." }],
        history: [...t.history, { when: NOW, what: `Product registration failed (${fail})`, who: "System" }],
      };
    }
    const base: ExtTask[] = t.tasks.length ? t.tasks : [{ id: "t1", name: "Product registration", state: "Running" }, { id: "t2", name: "Commission setting", state: "Running" }];
    const tasks: ExtTask[] = base.map((x) => (x.state === "Failed" || x.state === "Running" ? { id: x.id, name: x.name, state: "Success", extId: extId(), at: "10:45" } : x));
    const person = tasks.some((x) => x.state === "Person");
    return {
      ...t, fail: false, age: "now",
      col: person ? "To submit" : "Waiting on TikTok",
      what: person ? "1 step needs a person" : "Submitted just now",
      tasks: person ? tasks : [...tasks, { id: "t9", name: "TikTok review of the request", state: "Waiting", why: "TikTok usually replies within 5 days." }],
      history: [...t.history, { when: NOW, what: person ? "API steps succeeded; 1 step waiting for a person" : "Sent to TikTok", who: ME }],
    };
  };

  const runBatch = () => {
    const chosen = tickets.filter((t) => sel.includes(t.id));
    const can = chosen.filter((t) => t.col === "To submit" && !t.block);
    const skipped = chosen.filter((t) => !can.includes(t)).map((t) => [`${t.id} ${t.shop}`, whyNot(t)] as [string, string]);
    setRunning(true);
    window.setTimeout(() => {
      const failed = can.filter((t) => t.batchFail).map((t) => [t.id, t.batchFail!] as [string, string]);
      const ok = can.filter((t) => !t.batchFail).map((t) => t.id);
      setTickets((ts) => ts.map((t) => (ok.includes(t.id) ? submitOne(t) : t.batchFail && can.some((c) => c.id === t.id) ? submitOne(t, t.batchFail) : t)));
      setResult({ selected: chosen.length, run: can.length, skipped, ok, failed });
      setSel([]);
      setRunning(false);
      toast(`${ok.length} sent to TikTok${failed.length ? ` · ${failed.length} failed` : ""}`);
    }, 1500);
  };

  const retryFailed = () => {
    if (!result) return;
    const ids = result.failed.map(([id]) => id);
    setRunning(true);
    window.setTimeout(() => {
      setTickets((ts) => ts.map((t) => (ids.includes(t.id) ? { ...submitOne({ ...t, tasks: [] }), batchFail: undefined } : t)));
      setResult({ ...result, ok: [...result.ok, ...ids], failed: [], retried: true });
      setRunning(false);
      toast(`${ids.length} succeeded on retry`);
    }, 1200);
  };

  const visible = (t: Ticket) => (!mine || t.owner === ME) && (!overdue || t.late);
  const toSubmit = tickets.filter((t) => t.col === "To submit");
  const ticket = tickets.find((t) => t.id === open) ?? null;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="TAP pipeline" sub="Every request from sellers, by where it is now. Cards also show how the TikTok side is doing.">
        <button type="button" className={`ad-btn-ghost ${mine ? "on" : ""}`} aria-pressed={mine} onClick={() => setMine(!mine)}>
          <Icon name="user" size={16} /> Mine only
        </button>
        <button type="button" className={`ad-btn-ghost ${overdue ? "on" : ""}`} aria-pressed={overdue} onClick={() => setOverdue(!overdue)}>
          <Icon name="alert" size={16} /> Overdue <small>{tickets.filter((t) => t.late).length}</small>
        </button>
      </Title>

      <p className="v2-small" style={{ margin: "-6px 0 0" }}>
        Products registered directly in Seller Center sync in by themselves (tagged <span className="ad-tag">Seller Center sync</span>). Requests with 0 samples, or commission less than 2% above the public rate, go straight to Not approved with the reason, and the seller is told.
      </p>

      {result && (
        <section className={`v2-card ad-result ${result.failed.length ? "has-fail" : ""}`} aria-live="polite">
          <div className="v2-card-h">
            <h2 className="v2-h2">Submit to TikTok: result</h2>
            <button type="button" className="v2-iconbtn" aria-label="Dismiss result" onClick={() => setResult(null)}><Icon name="x" size={16} /></button>
          </div>
          <div className="ad-sum">
            <span>Selected {result.selected}</span>
            <span className="ok">Can run {result.run}</span>
            {result.skipped.length > 0 && <span className="warn">Not eligible {result.skipped.length}</span>}
            <Icon name="arrow" size={16} />
            <span className="ok"><Icon name="check" size={14} /> {result.ok.length} succeeded</span>
            {result.failed.length > 0 && <span className="bad"><Icon name="x" size={14} /> {result.failed.length} failed</span>}
          </div>
          {result.skipped.length > 0 && (
            <p className="v2-small" style={{ margin: 0 }}>
              Not eligible: {result.skipped.map(([who, why]) => `${who} (${why})`).join(" · ")}
            </p>
          )}
          {result.failed.map(([id, msg]) => (
            <div key={id} className="v2-alert red" style={{ padding: "10px 14px" }}>
              <span>{id} · {msg}</span>
              <button type="button" onClick={() => setOpen(id)}>Open</button>
            </div>
          ))}
          {result.retried && <p className="v2-small" style={{ margin: 0 }}>Retried the failed one. Succeeded requests are now in Waiting on TikTok.</p>}
          {result.failed.length > 0 && (
            <div className="v2-row">
              <button type="button" className="np-btn v2-btn-sm" disabled={running} onClick={retryFailed}>
                {running ? <span className="ad-spin"><Icon name="refresh" size={16} /></span> : <Icon name="refresh" size={16} />} Retry failed only
              </button>
              <button type="button" className="ad-btn-ghost" onClick={() => toast("Result exported as CSV")}>Export result</button>
            </div>
          )}
        </section>
      )}

      <div className="v2-kanban ad-kanban" aria-label="Pipeline">
        {COLS.map((col) => {
          const list = tickets.filter((t) => t.col === col && visible(t));
          return (
            <section key={col} className="v2-col" aria-label={col}>
              <h3>{col} <b>{list.length}</b></h3>
              {col === "To submit" && toSubmit.length > 0 && (
                <button type="button" className="ad-colsel" onClick={() => setSel((s) => Array.from(new Set([...s, ...toSubmit.map((t) => t.id)])))}>
                  Select all {toSubmit.length}
                </button>
              )}
              {list.map((t) => (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  className={`ad-ticket ${sel.includes(t.id) ? "sel" : ""} ${t.late ? "late" : ""}`}
                  onClick={() => setOpen(t.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpen(t.id); }}
                >
                  <span className="ad-tk-top">
                    <input type="checkbox" aria-label={`Select ${t.id}`} checked={sel.includes(t.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(t.id)} />
                    <b className="ad-mono">{t.id}</b>
                    <small>{t.age}</small>
                  </span>
                  <strong>{t.shop}</strong>
                  <small>{t.what}</small>
                  <span className="ad-tk-foot">
                    {t.synced && <span className="ad-tag">Seller Center sync</span>}
                    {t.late && <span className="ad-tag red">Overdue</span>}
                    {hasFail(t) && <span className="ad-tag red">TikTok failed</span>}
                    {needsPerson(t) && <span className="ad-tag amber">Needs a person</span>}
                    {t.block && <span className="ad-tag amber">Reconnect needed</span>}
                    {t.owner ? <Av name={t.owner} size={24} /> : <span className="ad-tag gray">Unassigned</span>}
                  </span>
                </div>
              ))}
              {list.length === 0 && <p className="v2-small" style={{ margin: 0 }}>Nothing here.</p>}
            </section>
          );
        })}
      </div>

      {sel.length > 0 && <div className="ad-spacer" />}
      {sel.length > 0 && (
        <div className="ad-batch" role="region" aria-label="Batch actions">
          <span>
            {running ? (
              <><span className="ad-spin"><Icon name="refresh" size={16} /></span> Submitting to TikTok…</>
            ) : (
              <>Selected {sel.length} · {tickets.filter((t) => sel.includes(t.id) && t.col === "To submit" && !t.block).length} can run</>
            )}
          </span>
          <button type="button" className="ad-btn-ghost" onClick={() => setSel([])} disabled={running}>Clear</button>
          <button type="button" className="np-btn v2-btn-sm" onClick={runBatch} disabled={running}>
            <Icon name="send" size={16} /> Submit to TikTok
          </button>
        </div>
      )}

      {ticket && <TicketSheet t={ticket} onClose={() => setOpen(null)} update={(fn) => update(ticket.id, fn)} submit={() => update(ticket.id, (x) => submitOne(x, x.batchFail))} extId={extId} />}
    </div>
  );
}

function TicketSheet({ t, onClose, update, submit, extId }: { t: Ticket; onClose: () => void; update: (fn: (t: Ticket) => Ticket) => void; submit: () => void; extId: () => string }) {
  const { toast } = useDemo();
  const [note, setNote] = useState("");
  const [marking, setMarking] = useState<string | null>(null);
  const [record, setRecord] = useState("");
  const [shot, setShot] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [whyNote, setWhyNote] = useState("");

  const log = (what: string, who = ME) => ({ when: NOW, what, who });
  /** Changes one task; when nothing is left for TikTok's API or a person, the request moves to Waiting on TikTok. */
  const setTask = (id: string, patch: Partial<ExtTask>, what: string, unblock = false) =>
    update((x) => {
      const tasks = x.tasks.map((k) =>
        k.id === id ? { ...k, ...patch } : unblock && k.state === "Waiting" && k.why?.startsWith("Runs after") ? { id: k.id, name: k.name, state: "Success" as const, extId: extId(), at: "10:45" } : k,
      );
      const clear = tasks.every((k) => k.state === "Success" || k.state === "Done by hand");
      const move = x.col === "To submit" && clear;
      return {
        ...x, tasks: move ? [...tasks, { id: "t9", name: "TikTok review of the request", state: "Waiting", why: "TikTok usually replies within 5 days." }] : tasks,
        fail: tasks.some((k) => k.state === "Failed"), batchFail: undefined,
        col: move ? "Waiting on TikTok" : x.col,
        what: move ? "Submitted just now" : x.what,
        history: [...x.history, log(what)],
      };
    });

  const retry = (k: ExtTask) => {
    setBusy(k.id);
    window.setTimeout(() => {
      setTask(k.id, { state: "Success", extId: extId(), at: "10:45", message: undefined }, `${k.name}: retried, succeeded`, true);
      setBusy(null);
      toast(`${k.name} succeeded`);
    }, 1100);
  };

  const products = t.items.length;
  const totalSamples = t.items.reduce((a, i) => a + i.samples, 0);
  const lowSamples = t.items.some((i) => i.samples < 1);
  const lowRate = t.items.some((i) => i.publicRate !== null && i.rate - i.publicRate < 2);

  return (
    <Sheet title={`${t.id} · ${t.shop}`} onClose={onClose}>
      <div className="v2-row" style={{ gap: 8, marginTop: -6 }}>
        <Pill tone={COL_TONE[t.col]}>{t.col}</Pill>
        {t.synced && <span className="ad-tag">Seller Center sync</span>}
        {t.late && <span className="ad-tag red">Review 2 days over</span>}
        {t.block && <span className="ad-tag amber">Reconnect needed</span>}
      </div>

      {t.reason && <div className="v2-alert red"><span>{t.reason}</span></div>}
      {t.block && <div className="v2-alert"><span>{t.block}</span></div>}

      {/* Main action for this status */}
      <div className="v2-row">
        {t.col === "New" && (
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { update((x) => ({ ...x, col: "In review", owner: x.owner ?? ME, what: `${products} products · ${x.owner ?? ME}`, history: [...x.history, log("Review started")] })); toast("Moved to In review · assigned to you"); }}>Start review</button>
        )}
        {t.col === "In review" && !rejecting && (
          <>
            <button type="button" className="np-btn v2-btn-sm" onClick={() => { update((x) => ({ ...x, col: "To submit", late: false, what: `${products} products · ready`, history: [...x.history, log("Review passed")] })); toast("Review passed · moved to To submit"); }}>Pass review</button>
            <button type="button" className="ad-btn-ghost" onClick={() => toast("Seller asked to change · they see your note in their app")}>Ask seller to change</button>
            <button type="button" className="ad-btn-ghost danger" onClick={() => setRejecting(true)}>Not approve</button>
          </>
        )}
        {t.col === "To submit" && needsPerson(t) && !hasFail(t) && (
          <span className="v2-small">TikTok&apos;s API steps are done. Finish the step waiting for a person below and it moves to Waiting on TikTok.</span>
        )}
        {t.col === "To submit" && (!needsPerson(t) || hasFail(t)) && (
          <button type="button" className="np-btn v2-btn-sm" disabled={!!t.block} onClick={() => { submit(); toast(t.batchFail ? "TikTok returned an error" : "Sent to TikTok"); }}>
            <Icon name="send" size={16} /> Submit to TikTok
          </button>
        )}
        {t.col === "Waiting on TikTok" && <button type="button" className="ad-btn-ghost" onClick={() => toast("Checked TikTok: still waiting · next automatic check 11:00")}><Icon name="refresh" size={16} /> Check now</button>}
        {t.col === "Not approved" && <button type="button" className="ad-btn-ghost" onClick={() => toast("Seller reminded in app and by email")}>Remind seller how to fix</button>}
        {t.col === "Live" && <Link href="/admin/tap/campaigns" className="ad-btn-ghost">Campaign end date and auto-extend</Link>}
      </div>

      {rejecting && (
        <div className="v2-card flat">
          <b>Why isn&apos;t this approved?</b>
          <span className="v2-small">The seller sees this reason.</span>
          <Reasons options={["Samples are 0", "Commission under +2%", "Product not allowed in TAP", "Other"]} value={why} onChange={setWhy} note={whyNote} onNote={setWhyNote} notePlaceholder="What should the seller change?" />
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm ad-btn-danger" disabled={!why} onClick={() => { update((x) => ({ ...x, col: "Not approved", late: false, reason: `${why}${whyNote ? `: ${whyNote}` : ""}. Seller notified.`, what: why ?? "", history: [...x.history, log(`Not approved: ${why}`)] })); setRejecting(false); toast("Not approved · seller notified · logged"); }}>Confirm not approved</button>
            <button type="button" className="ad-btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}

      <Sec right={<button type="button" className="ad-btn-ghost" onClick={() => toast(`Copied ${6 + products * 4} fields for Partner Center`)}><Icon name="doc" size={15} /> Copy all</button>}>Submitted data</Sec>
      <Kv rows={[
        ["Shop", t.shop],
        ["Shop ID", <span key="id" className="ad-mono">{t.shopId}</span>],
        ["Came from", t.source],
        ["TAP campaign", t.campaign],
        ["Dates", t.dates],
        ["Samples", `${totalSamples} in total`],
        ["Checks", lowSamples ? <span key="c" className="ad-down">0 samples on a product</span> : lowRate ? <span key="c" className="ad-down">Commission under +2% on a product</span> : <span key="c" className="ad-okmark"><Icon name="check" size={15} /> All passed</span>],
      ]} />
      <div className="ad-items">
        {t.items.map((i) => (
          <div key={i.name} className="ad-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.img ? <img src={i.img} alt="" /> : <span className="ph"><Icon name="box" size={18} /></span>}
            <span>
              <strong>{i.name}</strong>
              <small>{i.samples} samples · public {i.publicRate === null ? "unknown" : `${i.publicRate}%`}</small>
            </span>
            <span className="v2-rate"><b>{i.rate}%</b></span>
          </div>
        ))}
      </div>

      <Sec>External tasks</Sec>
      {t.tasks.length === 0 ? (
        <p className="v2-small" style={{ margin: 0 }}>{t.col === "Not approved" ? "Nothing was sent to TikTok." : "Tasks are created when you submit to TikTok."}</p>
      ) : (
        <div className="ad-tasks">
          {t.tasks.map((k, i) => (
            <div key={k.id} className={`ad-task ${k.state === "Done by hand" ? "done" : k.state}`}>
              <span className="ico">
                {busy === k.id ? <span className="ad-spin"><Icon name="refresh" size={15} /></span> : <Icon name={k.state === "Failed" ? "x" : k.state === "Person" ? "user" : k.state === "Waiting" || k.state === "Running" ? "refresh" : "check"} size={15} width={2.4} />}
              </span>
              <span className="ad-task-h">
                <b>{i + 1}. {k.name}</b>
                <Pill tone={STATE_TONE[k.state]}>{STATE_LABEL[k.state]}</Pill>
              </span>
              {k.state === "Success" && <p>External ID <span className="ad-mono">{k.extId}</span> · synced {k.at}</p>}
              {k.state === "Done by hand" && <p>Marked done by {ME} · {k.extId}</p>}
              {k.state === "Waiting" && <p>{k.why}</p>}
              {k.state === "Failed" && (
                <>
                  <p>TikTok said: <b>{k.message}</b> · tried {k.retry?.[0]} of {k.retry?.[1]} · next automatic retry {k.nextRetry}</p>
                  <div className="v2-row">
                    <button type="button" className="np-btn v2-btn-sm" disabled={busy === k.id} onClick={() => retry(k)}>Retry now</button>
                    <button type="button" className="ad-btn-ghost" onClick={() => { setTask(k.id, { state: "Person", why: "Handed to a person after TikTok kept refusing." }, `${k.name}: handed to a person`); toast("Handed to a person"); }}>Hand to a person</button>
                  </div>
                </>
              )}
              {k.state === "Person" && (
                <>
                  <p>{k.why} Opening Partner Center doesn&apos;t change anything here; mark it done with proof when it&apos;s finished.</p>
                  {marking !== k.id ? (
                    <div className="v2-row">
                      <button type="button" className="ad-btn-ghost" onClick={() => toast("Partner Center opened in a new tab · nothing changed here")}><Icon name="link" size={15} /> Open Partner Center</button>
                      <button type="button" className="np-btn v2-btn-sm" onClick={() => setMarking(k.id)}>Mark done</button>
                    </div>
                  ) : (
                    <div className="v2-stack" style={{ gap: 8, marginTop: 4 }}>
                      <input className="np-input" value={record} placeholder="External record ID from Partner Center" onChange={(e) => setRecord(e.target.value)} />
                      <label className="ad-btn-ghost" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
                        <Icon name="plus" size={15} /> {shot ? shot : "Or attach a screenshot"}
                        <input type="file" accept="image/*" hidden onChange={(e) => setShot(e.target.files?.[0]?.name ?? "")} />
                      </label>
                      <div className="v2-row">
                        <button
                          type="button"
                          className="np-btn v2-btn-sm"
                          disabled={!record.trim() && !shot}
                          onClick={() => {
                            const proof = record.trim() ? `record ${record.trim()}` : `screenshot ${shot}`;
                            setTask(k.id, { state: "Done by hand", extId: proof }, `${k.name}: marked done by hand (${proof})`);
                            setMarking(null); setRecord(""); setShot("");
                            toast("Marked done · proof saved · logged");
                          }}
                        >
                          Confirm done
                        </button>
                        <button type="button" className="ad-btn-ghost" onClick={() => setMarking(null)}>Cancel</button>
                      </div>
                      <span className="v2-small">An ID or a screenshot is needed so the next person can check it.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Sec>Owner</Sec>
      <div className="v2-row">
        {t.owner ? <><Av name={t.owner} size={30} /><b>{t.owner}</b></> : <span className="v2-muted">Unassigned</span>}
        <span className="sp" />
        <div className="v2-chips">
          {["Aina", "Kumar", "Hazwan"].map((n) => (
            <button key={n} type="button" className={`v2-chip ${t.owner === n ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { update((x) => ({ ...x, owner: n, history: [...x.history, log(`Assigned to ${n}`)] })); toast(`Assigned to ${n}`); }}>
              {n === ME ? "Me" : n}
            </button>
          ))}
        </div>
      </div>

      <Sec>Internal notes</Sec>
      {t.notes.map((n, i) => (
        <div key={i} className="ad-note"><small>{n.who} · {n.when}</small>{n.text}</div>
      ))}
      <div className="v2-row" style={{ alignItems: "flex-end" }}>
        <textarea className="np-input" rows={2} style={{ flex: "1 1 220px" }} value={note} placeholder="Only staff see notes" onChange={(e) => setNote(e.target.value)} />
        <button type="button" className="ad-btn-ghost" disabled={!note.trim()} onClick={() => { update((x) => ({ ...x, notes: [...x.notes, { who: ME, when: "Now", text: note.trim() }] })); setNote(""); }}>Add note</button>
      </div>

      <Sec>History</Sec>
      <ul className="ad-tl">
        {[...t.history].reverse().map((h, i) => (
          <li key={i} className={/failed/i.test(h.what) ? "bad" : /passed|succeeded|Live|Sent/i.test(h.what) ? "ok" : ""}>
            <small>{h.when} · {h.who}</small>
            {h.what}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
