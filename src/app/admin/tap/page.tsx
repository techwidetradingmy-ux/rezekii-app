"use client";

import "@/app/admin.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Kv, Pill, Reasons, Sec, type Tone } from "@/components/admin/bits";
import { COLS, ME, TICKETS, type Col, type ExtTask, type Ticket } from "@/lib/mock-admin";
import { adminProductHref, productIdByName } from "@/lib/product-pages";
import { useKept } from "@/lib/keep";
import { toTickets } from "@/lib/live-admin";

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
  const { toast, live, me } = useDemo();
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  // An admin signed in (owner, 30 Oct 2026): sellers' real requests, and the real admins who can own them.
  const admin = live && me?.role === "admin";
  const [team, setTeam] = useState<{ admins: string[]; me: string } | null>(null);
  const loadReal = () =>
    fetch("/api/v2/admin/tap")
      .then((r) => r.json())
      .then((d) => { if (d.error) return toast(d.error); setTickets(toTickets(d.requests)); setTeam({ admins: d.admins, me: d.me }); })
      .catch(() => toast("Couldn't load the requests. Please try again."));
  useEffect(() => {
    if (!admin) return;
    setTickets([]);
    loadReal();
  }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps
  /** One step on a real request; reloads the pipeline after. */
  const actReal = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
    const r = await fetch("/api/v2/admin/tap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) })
      .then((x) => x.json())
      .catch(() => ({ ok: false, error: "Couldn't reach Rezekii. Please try again." }));
    if (!r.ok) { toast(r.error ?? "That didn't work. Please try again."); return false; }
    await loadReal();
    return true;
  };
  const [mine, setMine] = useKept("tap-mine", false);
  const [overdue, setOverdue] = useKept("tap-overdue", false);
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

  const runBatch = async () => {
    if (admin) {
      // Real: each request goes to TikTok one by one; a shop without a campaign needs its commission set in the request first.
      const chosen = tickets.filter((t) => sel.includes(t.id));
      const can = chosen.filter((t) => t.col === "To submit" && (t.real?.hasCampaign || t.real?.suggest != null));
      const skipped = chosen.filter((t) => !can.includes(t)).map((t) => [`${t.id} ${t.shop}`, t.col === "To submit" ? "set the campaign commission in the request first" : whyNot(t)] as [string, string]);
      setRunning(true);
      const ok: string[] = [], failed: [string, string][] = [];
      for (const t of can) {
        const r = await fetch("/api/v2/admin/tap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: t.real!.id, action: "submit", commission: t.real!.suggest }) })
          .then((x) => x.json()).catch(() => ({ ok: false, error: "Couldn't reach Rezekii." }));
        if (r.ok) ok.push(t.id); else failed.push([t.id, r.error ?? "TikTok didn't take it"]);
      }
      await loadReal();
      setResult({ selected: chosen.length, run: can.length, skipped, ok, failed });
      setSel([]);
      setRunning(false);
      toast(`${ok.length} sent to TikTok${failed.length ? ` · ${failed.length} failed` : ""}`);
      return;
    }
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
      <Title title="TAP Pipeline" sub="Seller requests by stage, with TikTok status.">
        <button type="button" className={`ad-btn-ghost ${mine ? "on" : ""}`} aria-pressed={mine} onClick={() => setMine(!mine)}>
          <Icon name="user" size={16} /> Mine only
        </button>
        <button type="button" className={`ad-btn-ghost ${overdue ? "on" : ""}`} aria-pressed={overdue} onClick={() => setOverdue(!overdue)}>
          <Icon name="alert" size={16} /> Overdue <small>{tickets.filter((t) => t.late).length}</small>
        </button>
      </Title>

      <p className="v2-small" style={{ margin: "-6px 0 0" }}>
        Requests with 0 samples or under +2% go straight to Not approved.
      </p>

      {result && (
        <section className={`v2-card ad-result ${result.failed.length ? "has-fail" : ""}`} aria-live="polite">
          <div className="v2-card-h">
            <h2 className="v2-h2">Submit to TikTok: Result</h2>
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
          {result.retried && <p className="v2-small" style={{ margin: 0 }}>Retried. Successful requests are now in Waiting on TikTok.</p>}
          {result.failed.length > 0 && (
            <div className="v2-row">
              <button type="button" className="np-btn v2-btn-sm" disabled={running} onClick={retryFailed}>
                {running ? <span className="ad-spin"><Icon name="refresh" size={16} /></span> : <Icon name="refresh" size={16} />} Retry failed only
              </button>
              <button type="button" className="ad-btn-ghost" onClick={() => toast("Result exported as CSV")}>Export Result</button>
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

      {ticket && <TicketSheet t={ticket} onClose={() => setOpen(null)} update={(fn) => update(ticket.id, fn)} submit={() => update(ticket.id, (x) => submitOne(x, x.batchFail))} extId={extId} real={admin && ticket.real ? { act: (body) => actReal(ticket.real!.id, body), reload: loadReal, admins: team?.admins ?? [], me: team?.me ?? "" } : undefined} />}
    </div>
  );
}

type RealSteps = { act: (body: Record<string, unknown>) => Promise<boolean>; reload: () => Promise<unknown>; admins: string[]; me: string };

function TicketSheet({ t, onClose, update, submit, extId, real }: { t: Ticket; onClose: () => void; update: (fn: (t: Ticket) => Ticket) => void; submit: () => void; extId: () => string; real?: RealSteps }) {
  const { toast } = useDemo();
  const [busyStep, setBusyStep] = useState(false);
  const [commission, setCommission] = useState(t.real?.suggest != null ? String(t.real.suggest) : "");
  /** A real step: shows the toast only when it worked. */
  const step = async (body: Record<string, unknown>, done: string) => {
    setBusyStep(true);
    const ok = await real!.act(body);
    setBusyStep(false);
    if (ok) toast(done);
    return ok;
  };
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
        {t.late && <span className="ad-tag red">{t.lateBy ?? "2 days overdue"}</span>}
        {t.block && <span className="ad-tag amber">Reconnect needed</span>}
      </div>

      {t.reason && <div className="v2-alert red"><span>{t.reason}</span></div>}
      {t.block && <div className="v2-alert"><span>{t.block}</span></div>}

      {/* Main action for this status */}
      <div className="v2-row">
        {t.col === "New" && real && <button type="button" className="np-btn v2-btn-sm" disabled={busyStep} onClick={() => step({ action: "start" }, "Moved to In review · assigned to you")}>Start Review</button>}
        {t.col === "New" && !real && (
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { update((x) => ({ ...x, col: "In review", owner: x.owner ?? ME, what: `${products} products · ${x.owner ?? ME}`, history: [...x.history, log("Review started")] })); toast("Moved to In review · assigned to you"); }}>Start Review</button>
        )}
        {t.col === "In review" && !rejecting && (
          <>
            <button type="button" className="np-btn v2-btn-sm" disabled={busyStep} onClick={() => { if (real) return void step({ action: "pass" }, "Review passed · moved to To submit"); update((x) => ({ ...x, col: "To submit", late: false, what: `${products} products · ready`, history: [...x.history, log("Review passed")] })); toast("Review passed · moved to To submit"); }}>Pass Review</button>
            {!real && <button type="button" className="ad-btn-ghost" onClick={() => toast("Change requested · seller notified")}>Ask Seller to Change</button>}
            <button type="button" className="ad-btn-ghost danger" onClick={() => setRejecting(true)}>Not Approve</button>
          </>
        )}
        {t.col === "To submit" && needsPerson(t) && !hasFail(t) && (
          <span className="v2-small">API steps done. Finish the manual step below.</span>
        )}
        {t.col === "To submit" && real && (
          <>
            {/* The shop's first request creates Techwide's campaign for it, open to this shop only, for the longest TikTok allows. */}
            {!t.real?.hasCampaign && (
              <label className="sl-custom" style={{ flex: "1 1 100%" }}>
                <span style={{ fontWeight: 800 }}>Campaign commission</span>
                <input className="np-input" inputMode="decimal" style={{ maxWidth: 90 }} value={commission} onChange={(e) => setCommission(e.target.value)} aria-label="Campaign commission, percent" />
                <span style={{ fontWeight: 800 }}>%</span>
              </label>
            )}
            <button type="button" className="np-btn v2-btn-sm" disabled={busyStep || (!t.real?.hasCampaign && !(Number(commission) > 1 && Number(commission) < 80))} onClick={() => step({ action: "submit", commission: Number(commission) }, t.real?.hasCampaign ? "Sent to TikTok · seller can register it now" : "Campaign created and published · seller can register it now")}>
              <Icon name="send" size={16} /> {busyStep ? "Sending…" : "Submit to TikTok"}
            </button>
          </>
        )}
        {t.col === "To submit" && !real && (!needsPerson(t) || hasFail(t)) && (
          <button type="button" className="np-btn v2-btn-sm" disabled={!!t.block} onClick={() => { submit(); toast(t.batchFail ? "TikTok returned an error" : "Sent to TikTok"); }}>
            <Icon name="send" size={16} /> Submit to TikTok
          </button>
        )}
        {t.col === "Waiting on TikTok" && real && t.real?.pendingOnTikTok && <button type="button" className="np-btn v2-btn-sm" disabled={busyStep} onClick={() => step({ action: "approve" }, "Approved on TikTok · live")}><Icon name="check" size={16} /> Approve on TikTok</button>}
        {t.col === "Waiting on TikTok" && real && !t.real?.pendingOnTikTok && <button type="button" className="ad-btn-ghost" onClick={() => real.reload().then(() => toast("Checked TikTok"))}><Icon name="refresh" size={16} /> Check Now</button>}
        {t.col === "Waiting on TikTok" && !real && <button type="button" className="ad-btn-ghost" onClick={() => toast("Still waiting · next check 11:00")}><Icon name="refresh" size={16} /> Check Now</button>}
        {t.col === "Not approved" && !real && <button type="button" className="ad-btn-ghost" onClick={() => toast("Seller reminded in app and by email")}>Remind Seller</button>}
        {t.col === "Live" && <Link href="/admin/tap/campaigns" className="ad-btn-ghost">End Date & Auto-Extend</Link>}
      </div>

      {rejecting && (
        <div className="v2-card flat">
          <b>Why not approved?</b>
          <span className="v2-small">Seller sees this.</span>
          <Reasons options={["Samples Are 0", "Commission under +2%", "Product Not Allowed in TAP", "Other"]} value={why} onChange={setWhy} note={whyNote} onNote={setWhyNote} notePlaceholder="What should the seller change?" />
          <div className="v2-row">
            <button type="button" className="np-btn v2-btn-sm ad-btn-danger" disabled={!why || busyStep} onClick={() => { if (real) { void step({ action: "reject", reason: `${why}${whyNote ? `: ${whyNote}` : ""}` }, "Not approved · the seller sees why").then((ok) => ok && setRejecting(false)); return; } update((x) => ({ ...x, col: "Not approved", late: false, reason: `${why}${whyNote ? `: ${whyNote}` : ""}. Seller notified.`, what: why ?? "", history: [...x.history, log(`Not approved: ${why}`)] })); setRejecting(false); toast("Not approved · seller notified · logged"); }}>Confirm Not Approved</button>
            <button type="button" className="ad-btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}

      <Sec right={<button type="button" className="ad-btn-ghost" onClick={() => {
        if (!real) return toast(`Copied ${6 + products * 4} fields for Partner Center`);
        const text = [`Shop: ${t.shop}`, `Shop code: ${t.shopId}`, `Campaign: ${t.campaign}`, ...t.items.map((i) => `${i.name} · ${i.rateLabel ?? `${i.rate}%`} · ${i.samples} samples per SKU`)].join("\n");
        navigator.clipboard.writeText(text).then(() => toast("Copied"), () => toast("Couldn't copy. Select the text instead."));
      }}><Icon name="doc" size={15} /> Copy all</button>}>Submitted data</Sec>
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
        {t.items.map((i) => {
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.img ? <img src={i.img} alt="" /> : <span className="ph"><Icon name="box" size={18} /></span>}
              <span>
                <strong>{i.name}</strong>
                <small>{i.samples} samples · public {i.publicRate === null ? "unknown" : `${i.publicRate}%`}</small>
              </span>
              <span className="v2-rate"><b>{i.rateLabel ?? `${i.rate}%`}</b></span>
            </>
          );
          // Product (owner, 29 Oct 2026): items that are on Rezekii open the product page.
          const pid = productIdByName(i.name);
          return pid ? <Link key={i.name} href={adminProductHref(pid)} className="ad-item">{body}</Link> : <div key={i.name} className="ad-item">{body}</div>;
        })}
      </div>

      <Sec>External tasks</Sec>
      {t.tasks.length === 0 ? (
        <p className="v2-small" style={{ margin: 0 }}>{t.col === "Not approved" ? "Nothing was sent to TikTok." : "Created when you submit."}</p>
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
                  <p>TikTok said: <b>{k.message}</b> · tried {k.retry?.[0]} of {k.retry?.[1]} · next retry {k.nextRetry}</p>
                  <div className="v2-row">
                    <button type="button" className="np-btn v2-btn-sm" disabled={busy === k.id} onClick={() => retry(k)}>Retry Now</button>
                    <button type="button" className="ad-btn-ghost" onClick={() => { setTask(k.id, { state: "Person", why: "Handed to a person after TikTok kept refusing." }, `${k.name}: handed to a person`); toast("Handed to a person"); }}>Hand to a Person</button>
                  </div>
                </>
              )}
              {k.state === "Person" && (
                <>
                  <p>{k.why} Mark done with proof when finished.</p>
                  {marking !== k.id ? (
                    <div className="v2-row">
                      <button type="button" className="ad-btn-ghost" onClick={() => toast("Partner Center opened")}><Icon name="link" size={15} /> Open Partner Center</button>
                      <button type="button" className="np-btn v2-btn-sm" onClick={() => setMarking(k.id)}>Mark Done</button>
                    </div>
                  ) : (
                    <div className="v2-stack" style={{ gap: 8, marginTop: 4 }}>
                      <input className="np-input" value={record} placeholder="Partner Center record ID" onChange={(e) => setRecord(e.target.value)} />
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
                      <span className="v2-small">ID or screenshot required.</span>
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
          {(real ? real.admins : ["Aina", "Kumar", "Hazwan"]).map((n) => (
            <button key={n} type="button" className={`v2-chip ${t.owner === n ? "on" : ""}`} style={{ height: 34, fontSize: 13 }} onClick={() => { if (real) return void step({ action: "assign", name: n }, `Assigned to ${n}`); update((x) => ({ ...x, owner: n, history: [...x.history, log(`Assigned to ${n}`)] })); toast(`Assigned to ${n}`); }}>
              {n === (real ? real.me : ME) ? "Me" : n}
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
        <button type="button" className="ad-btn-ghost" disabled={!note.trim() || busyStep} onClick={() => { if (real) { void step({ action: "note", text: note.trim() }, "Note added").then((ok) => ok && setNote("")); return; } update((x) => ({ ...x, notes: [...x.notes, { who: ME, when: "Now", text: note.trim() }] })); setNote(""); }}>Add Note</button>
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
