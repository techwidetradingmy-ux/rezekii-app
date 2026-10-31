"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Av, Chips, Pill } from "@/components/admin/bits";
import { day, useList, when } from "@/components/admin/live-lists";

type Waiting = { id: string; handle: string; name: string; signIn: string; shopAccount: string | null; access: string; reason: string | null; requestedAt: string | null };
/**
 * Users › Review on real data (owner, 31 Oct 2026): creators who linked TikTok Shop and are waiting for access. Approve, or
 * decline with a reason they'll see. Sellers need no review.
 */
export function LiveReview() {
  const { toast } = useDemo();
  const [d, setD] = useState<{ creators: Waiting[]; places: number; auto: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [no, setNo] = useState<{ id: string; reason: string } | null>(null);
  const load = () =>
    fetch("/api/v2/admin/data?part=review", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { data: { creators: Waiting[]; places: number; auto: boolean } }) => setD(x.data))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  useEffect(() => { void load(); }, []);
  const decide = async (id: string, approve: boolean, reason = "") => {
    const r = await fetch(`/api/admin/creators/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: approve ? "approve" : "reject", reason }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) return toast(x?.error ?? "Didn't save. Please try again.");
    toast(approve ? "Approved. They can use Rezekii now." : "Declined. They'll see your reason.");
    setNo(null);
    void load();
  };
  const setAuto = async (auto: boolean) => {
    const r = await fetch("/api/admin/creators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ auto }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't save. Please try again.");
    toast(auto ? "New creators are approved automatically" : "New creators wait for a person");
    void load();
  };
  const waiting = (d?.creators ?? []).filter((c) => c.access === "waitlist").sort((a, b) => (a.requestedAt ?? "").localeCompare(b.requestedAt ?? ""));
  const declined = (d?.creators ?? []).filter((c) => c.access === "rejected");
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Review" sub="Creators who linked TikTok Shop and are waiting for access. Sellers don't need a review." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <section className="v2-card">
            <div className="ad-row" style={{ padding: 0 }}>
              <span className="main"><b>Approve new creators automatically</b><small>{d.places} TikTok Shop places used</small></span>
              <button type="button" role="switch" aria-checked={d.auto} aria-label="Approve new creators automatically" className={`np-switch ${d.auto ? "on" : ""}`} onClick={() => void setAuto(!d.auto)}><span /></button>
            </div>
          </section>
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Waiting</h2><span className="badge">{waiting.length}</span></div>
            <div className="ad-list">
              {waiting.map((c) => (
                <div key={c.id} className="ad-row" style={{ flexWrap: "wrap" }}>
                  <Av name={c.name} />
                  <span className="main"><b>{c.name} {c.shopAccount ?? c.handle}</b><small>{c.signIn} · waiting since {day(c.requestedAt)}</small></span>
                  {no?.id === c.id ? (
                    <span className="acts" style={{ flex: "1 1 100%" }}>
                      <input className="np-input" maxLength={200} placeholder="Reason they'll see" value={no.reason} onChange={(e) => setNo({ id: c.id, reason: e.target.value })} />
                      <button type="button" className="np-btn v2-btn-sm" disabled={!no.reason.trim()} onClick={() => void decide(c.id, false, no.reason)}>Decline</button>
                      <button type="button" className="ad-btn-ghost" onClick={() => setNo(null)}>Cancel</button>
                    </span>
                  ) : (
                    <span className="acts">
                      <button type="button" className="np-btn v2-btn-sm" onClick={() => void decide(c.id, true)}>Approve</button>
                      <button type="button" className="ad-btn-ghost" onClick={() => setNo({ id: c.id, reason: "" })}>Decline</button>
                    </span>
                  )}
                </div>
              ))}
              {!waiting.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No one is waiting.</p>}
            </div>
          </section>
          {declined.length > 0 && (
            <section className="v2-card" style={{ padding: "6px 20px" }}>
              <div className="v2-card-h"><h2 className="v2-h2">Declined</h2><span className="badge">{declined.length}</span></div>
              <div className="ad-list">
                {declined.map((c) => (
                  <div key={c.id} className="ad-row">
                    <Av name={c.name} />
                    <span className="main"><b>{c.name} {c.shopAccount ?? c.handle}</b><small>{c.reason ?? "No reason given"}</small></span>
                    <button type="button" className="ad-btn-ghost" onClick={() => void decide(c.id, true)}>Approve now</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type Fb = {
  id: string; kind: string; message: string; mood: number | null; reply_by: string; page: string | null; status: "new" | "handled"; created_at: string; shot: boolean;
  reply: string | null; replied_at: string | null; replied_by: string | null;
  who: { name: string; handle: string | null; email: string | null; whatsapp: string | null };
};
const FACES = ["😞", "😕", "😐", "🙂", "😍"];
/** The form's four types (owner, 31 Oct 2026: the inbox is sorted by them). */
const TYPES = ["All types", "Change request", "Something's broken", "Question", "Idea", "Compliment"] as const;
type FType = (typeof TYPES)[number];
const TYPE_TONE: Record<string, "bad" | "warn" | "info" | "ok"> = { "Something's broken": "bad", Question: "warn", Idea: "info", Compliment: "ok", "Change request": "warn" };
/** Support › Feedback Inbox on real data: what creators and sellers sent from the Feedback form. */
export function LiveFeedback() {
  const { toast } = useDemo();
  const [items, err, load] = useList<Fb>("feedback");
  const [filter, setFilter] = useState<"New" | "Handled">("New");
  const [type, setType] = useState<FType>("All types");
  const [shot, setShot] = useState<string | null>(null);
  const inStatus = (items ?? []).filter((f) => (filter === "New" ? f.status === "new" : f.status === "handled"));
  const shown = inStatus.filter((f) => type === "All types" || f.kind === type);
  const mark = async (f: Fb, status: Fb["status"]) => {
    const r = await fetch("/api/v2/admin/lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feedback: f.id, status }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't save. Please try again.");
    toast(status === "handled" ? "Marked handled" : "Moved back to new");
    void load();
  };
  // Reply inside Rezekii (owner, 1 Nov 2026): she reads it in Settings › My Messages.
  const [writing, setWriting] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const reply = async (f: Fb) => {
    if (!draft.trim()) return;
    const r = await fetch("/api/v2/admin/lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feedback: f.id, reply: draft }) }).catch(() => null);
    if (!r?.ok) return toast("Didn't send. Please try again.");
    toast("Reply sent. They'll see it in the app.");
    setWriting(null);
    setDraft("");
    void load();
  };
  const wa = (n: string | null) => (n ? `https://wa.me/${n.replace(/\D/g, "")}` : null);
  const see = async (f: Fb) => {
    const d = (await fetch(`/api/v2/admin/lists?shot=${f.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as { screenshot?: string } | null;
    if (d?.screenshot) setShot(d.screenshot);
    else toast("Couldn't load the screenshot.");
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Feedback Inbox" sub="Ideas, problems, questions and compliments from creators and sellers." />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Filter" value={filter} onChange={setFilter} options={[["New", items.filter((f) => f.status === "new").length], ["Handled", items.filter((f) => f.status === "handled").length]]} />
          <Chips<FType> label="Type" value={type} onChange={setType} options={TYPES.map((t) => [t, t === "All types" ? inStatus.length : inStatus.filter((f) => f.kind === t).length])} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {shown.map((f) => (
                <div key={f.id} className="ad-row" style={{ alignItems: "flex-start" }}>
                  <Av name={f.who.name} />
                  <span className="main">
                    <b><Pill tone={TYPE_TONE[f.kind] ?? "info"}>{f.kind}</Pill> {f.who.handle ? `@${f.who.handle}` : f.who.name}{f.mood ? ` ${FACES[f.mood - 1]}` : ""}</b>
                    <small style={{ whiteSpace: "pre-wrap" }}>{f.message}</small>
                    <small>{when(f.created_at)}{f.page ? ` · ${f.page}` : ""}</small>
                    {f.reply && <small className="ad-reply"><b>Replied{f.replied_by ? ` by ${f.replied_by}` : ""}:</b> {f.reply}</small>}
                    {writing === f.id && (
                      <span className="ad-replybox">
                        <textarea className="np-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder="Your reply. They read it in the app." aria-label="Reply" />
                        <span className="v2-row" style={{ gap: 6 }}>
                          <button type="button" className="np-btn v2-btn-sm" disabled={!draft.trim()} onClick={() => void reply(f)}>Send Reply</button>
                          <button type="button" className="ad-btn-ghost" onClick={() => { setWriting(null); setDraft(""); }}>Cancel</button>
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="acts">
                    {writing !== f.id && <button type="button" className="ad-btn-ghost" onClick={() => { setWriting(f.id); setDraft(f.reply ?? ""); }}>{f.reply ? "Edit Reply" : "Reply"}</button>}
                    {wa(f.who.whatsapp) && <a className="ad-btn-ghost" href={wa(f.who.whatsapp)!} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> Reply on WhatsApp</a>}
                    {f.shot && <button type="button" className="ad-btn-ghost" onClick={() => void see(f)}>Screenshot</button>}
                    <button type="button" className="ad-btn-ghost" onClick={() => void mark(f, f.status === "new" ? "handled" : "new")}>{f.status === "new" ? "Mark handled" : "Back to new"}</button>
                  </span>
                </div>
              ))}
              {!shown.length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
        </>
      )}
      {shot && (
        <div className="ss-back" onClick={() => setShot(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt="Screenshot sent with the feedback" style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}

type AdminRow = { email: string; fixed: boolean; addedBy: string | null; addedAt: string | null; id?: string };
/** Users › Admin Access on real data: who can open the admin side. Add someone by their Google email. */
export function LiveAdminAccess() {
  const { toast } = useDemo();
  const [items, err, load] = useList<AdminRow>("admins");
  const [email, setEmail] = useState("");
  const add = async () => {
    const r = await fetch("/api/admin/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) return toast(d?.error ?? "Didn't save. Please try again.");
    toast(`${email} can now sign in to admin with Google`);
    setEmail("");
    void load();
  };
  const remove = async (a: AdminRow) => {
    const r = await fetch(`/api/admin/admins?${a.id ? `id=${a.id}` : `email=${encodeURIComponent(a.email)}`}`, { method: "DELETE" }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) return toast(d?.error ?? "Didn't remove. Please try again.");
    toast(`${a.email} no longer has admin access`);
    void load();
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Admin Access" sub="Who can open the admin side. Changes are logged." />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <section className="v2-card">
            <form className="v2-row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void add(); }}>
              <input type="email" className="np-input" style={{ flex: 1 }} placeholder="name@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Google email to add" />
              <button type="submit" className="np-btn v2-btn-sm" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}><Icon name="plus" size={15} /> Add admin</button>
            </form>
          </section>
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {items.map((a) => (
                <div key={a.id ?? a.email} className="ad-row">
                  <Av name={a.email} />
                  <span className="main"><b>{a.email}</b><small>{a.fixed ? "Built in, can't be removed here" : a.id ? "Signs in with email and password" : `Added by ${a.addedBy ?? "someone"}${a.addedAt ? ` · ${day(a.addedAt)}` : ""}`}</small></span>
                  {!a.fixed && <button type="button" className="ad-btn-ghost" onClick={() => void remove(a)}>Remove</button>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
