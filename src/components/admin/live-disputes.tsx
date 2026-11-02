"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Pill } from "@/components/admin/bits";
import { day } from "@/components/admin/live-lists";

const KINDS = ["Sample not received", "Creator overdue", "Seller complaint", "Creator complaint", "Other"] as const;
type Case = { id: string; kind: string; creator: string | null; shop: string | null; product: string | null; detail: string; status: "open" | "waiting" | "resolved"; outcome: string | null; owner: string | null; opened_by: string; created_at: string };
type Waiting = { creator: string; product: string | null; shop: string | null; videos: number; since: string };
const STATUS: Record<Case["status"], [string, "warn" | "info" | "ok"]> = { open: ["Open", "warn"], waiting: ["Waiting on someone", "info"], resolved: ["Resolved", "ok"] };

/**
 * Support › Disputes on real data (owner, 31 Oct 2026): cases staff open from WhatsApp, email or feedback, and creators TikTok
 * shows with a TAP sample received but no video yet.
 */
export function LiveDisputes() {
  const { toast } = useDemo();
  const [data, setData] = useState<{ cases: Case[]; waiting: Waiting[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () =>
    fetch("/api/v2/admin/lists?part=disputes", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { items: { cases: Case[]; waiting: Waiting[] } }) => setData(x.items))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load the cases. Please try again."));
  useEffect(() => { void load(); }, []);
  const [show, setShow] = useState<"Open" | "Resolved">("Open");
  const [form, setForm] = useState<{ kind: (typeof KINDS)[number]; creator: string; shop: string; product: string; detail: string } | null>(null);
  const [sel, setSel] = useState<Case | null>(null);
  const [outcome, setOutcome] = useState("");
  const post = async (body: unknown, done: string) => {
    const r = await fetch("/api/v2/admin/lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) { toast(x?.error ?? "Didn't save. Please try again."); return false; }
    toast(done);
    void load();
    return true;
  };
  const cases = (data?.cases ?? []).filter((c) => (show === "Open" ? c.status !== "resolved" : c.status === "resolved"));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Disputes" sub="Problems between creators and sellers. Open a case when someone reports one.">
        <button type="button" className="np-btn v2-btn-sm" onClick={() => setForm({ kind: "Sample not received", creator: "", shop: "", product: "", detail: "" })}><Icon name="plus" size={15} /> Open a Case</button>
      </Title>
      {!data ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Filter" value={show} onChange={setShow} options={[["Open", data.cases.filter((c) => c.status !== "resolved").length], ["Resolved", data.cases.filter((c) => c.status === "resolved").length]]} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {cases.map((c) => (
                <button key={c.id} type="button" className="ad-row ad-rowbtn click" onClick={() => { setSel(c); setOutcome(c.outcome ?? ""); }}>
                  <Av name={c.creator ?? c.shop ?? c.kind} />
                  <span className="main"><b>{c.kind}{c.creator ? ` · ${c.creator}` : ""}{c.shop ? ` · ${c.shop}` : ""}</b><small>{c.detail.slice(0, 120)}</small><small>Opened {day(c.created_at)} by {c.opened_by}{c.owner ? ` · ${c.owner} looking after it` : ""}</small></span>
                  <Pill tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Pill>
                </button>
              ))}
              {!cases.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No cases here.</p>}
            </div>
          </section>

          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Sample Received, No Video Yet</h2><span className="badge">{data.waiting.length}</span></div>
            <div className="ad-list">
              {data.waiting.map((w, i) => (
                <div key={i} className="ad-row">
                  <Av name={w.creator} />
                  <span className="main"><b>{w.creator}</b><small>{w.product ?? "Product"}{w.shop ? ` · ${w.shop}` : ""} · {w.videos} video{w.videos === 1 ? "" : "s"} · TikTok status since {day(w.since)}</small></span>
                  <button type="button" className="ad-btn-ghost" onClick={() => setForm({ kind: "Creator overdue", creator: w.creator, shop: w.shop ?? "", product: w.product ?? "", detail: "Sample received, no video yet." })}>Open a Case</button>
                </div>
              ))}
              {!data.waiting.length && <p className="v2-muted" style={{ padding: "14px 0" }}>Everyone with a sample has posted.</p>}
            </div>
            <p className="v2-small" style={{ margin: 0 }}>From TikTok&apos;s sample status in Techwide&apos;s campaigns, read in the daily refresh.</p>
          </section>
        </>
      )}

      {form && (
        <Sheet title="Open a Case" onClose={() => setForm(null)}>
          <label className="v2-field">Kind
            <select className="np-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as (typeof KINDS)[number] })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          </label>
          <label className="v2-field">Creator (optional)<input className="np-input" value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} placeholder="@handle" /></label>
          <label className="v2-field">Shop (optional)<input className="np-input" value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} /></label>
          <label className="v2-field">Product (optional)<input className="np-input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></label>
          <label className="v2-field">What happened<textarea className="np-input" rows={4} maxLength={1000} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label>
          <button type="button" className="np-btn" disabled={!form.detail.trim()} onClick={async () => { if (await post({ open: form }, "Case opened")) setForm(null); }}>Open Case</button>
        </Sheet>
      )}

      {sel && (
        <Sheet title={sel.kind} onClose={() => setSel(null)}>
          <p className="v2-muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{sel.detail}</p>
          <p className="v2-small" style={{ margin: 0 }}>{[sel.creator, sel.shop, sel.product].filter(Boolean).join(" · ")}</p>
          <label className="v2-field">Outcome<textarea className="np-input" rows={3} maxLength={500} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What was agreed" /></label>
          <div className="pp-stack">
            {sel.status !== "resolved" ? (
              <>
                <button type="button" className="np-btn" disabled={!outcome.trim()} onClick={async () => { if (await post({ dispute: sel.id, status: "resolved", outcome }, "Resolved")) setSel(null); }}>Resolve</button>
                <button type="button" className="btn-outline" onClick={async () => { if (await post({ dispute: sel.id, status: sel.status === "waiting" ? "open" : "waiting", outcome }, sel.status === "waiting" ? "Back to open" : "Marked waiting")) setSel(null); }}>{sel.status === "waiting" ? "Back to open" : "Waiting on someone"}</button>
              </>
            ) : (
              <button type="button" className="btn-outline" onClick={async () => { if (await post({ dispute: sel.id, status: "open" }, "Reopened")) setSel(null); }}>Reopen</button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
