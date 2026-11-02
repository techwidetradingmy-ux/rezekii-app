"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Sheet, Title } from "@/components/ui";
import { Av, Chips, Pill, Reasons } from "@/components/admin/bits";
import { when } from "@/components/admin/live-lists";
import type { BetaPerson } from "@/modules/beta/access.ts";

type Data = { people: BetaPerson[]; taken: number; cap: number; group: string | null };
type Tab = "Creators" | "Sellers" | "Let In" | "Declined";
const REASONS = ["Not a real creator account", "Duplicate account", "Not in Malaysia", "Other"];

/**
 * Users › Review › Beta Sign-Ups (owner, 2 Nov 2026): every new account waits until an admin lets it in. 50 creator places
 * (changeable here); sellers wait on a waitlist. Let In and Decline both email the person.
 */
export function LiveBeta() {
  const { toast } = useDemo();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Creators");
  const [busy, setBusy] = useState<string | null>(null);
  const [no, setNo] = useState<BetaPerson | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [cap, setCap] = useState("");
  const [group, setGroup] = useState("");
  const load = () =>
    fetch("/api/v2/admin/beta", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: Data) => { setD(x); setCap(String(x.cap)); setGroup(x.group ?? ""); })
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  useEffect(() => { void load(); }, []);

  const decide = async (p: BetaPerson, approve: boolean, why = "") => {
    setBusy(`${p.user_id}:${p.side}`);
    const r = await fetch("/api/v2/admin/beta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user: p.user_id, side: p.side, approve, reason: why }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string; emailed?: boolean } | null;
    setBusy(null);
    if (!r?.ok) return toast(x?.error ?? "Didn't save. Please try again.");
    const sent = x?.emailed ? " We emailed them." : " They have no email, so tell them on WhatsApp.";
    toast(approve ? `${p.name} is in.${sent}` : `Declined.${sent}`);
    setNo(null);
    void load();
  };
  const save = async () => {
    const r = await fetch("/api/v2/admin/beta", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ cap: Number(cap), group }) }).catch(() => null);
    const x = (await r?.json().catch(() => null)) as { error?: string } | null;
    if (!r?.ok) return toast(x?.error ?? "Didn't save. Please try again.");
    toast("Beta settings saved");
    void load();
  };

  const waiting = (side: string) => (d?.people ?? []).filter((p) => p.side === side && p.status === "waiting").sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  const lists: Record<Tab, BetaPerson[]> = {
    Creators: waiting("creator"),
    Sellers: waiting("seller"),
    "Let In": (d?.people ?? []).filter((p) => p.status === "approved"),
    Declined: (d?.people ?? []).filter((p) => p.status === "declined"),
  };
  const full = !!d && d.taken >= d.cap;
  const wa = (n: string | null) => (n ? `https://wa.me/${n.replace(/\D/g, "")}` : null);

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Beta Sign-Ups" sub="New accounts wait on a “You're on the List” screen until you let them in. They get an email either way." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <section className="v2-card v2-stack" style={{ gap: 12 }}>
            <div className="v2-row" style={{ justifyContent: "space-between", gap: 10 }}>
              <b>Creator Places</b>
              <span className={full ? "ad-tag amber" : "v2-muted"}>{d.taken} of {d.cap} taken{full ? " · new creators go on the waitlist" : ""}</span>
            </div>
            <Progress value={Math.min(d.taken, d.cap)} max={Math.max(d.cap, 1)} />
            <div className="v2-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="v2-stack" style={{ gap: 4, width: 110 }}>
                <small className="v2-muted">Places</small>
                <input className="np-input" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="Creator places" />
              </label>
              <label className="v2-stack" style={{ gap: 4, flex: "1 1 240px", minWidth: 0 }}>
                <small className="v2-muted">WhatsApp Group Link</small>
                <input className="np-input" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="https://chat.whatsapp.com/…" aria-label="WhatsApp group link" />
              </label>
              <button type="button" className="np-btn v2-btn-sm" disabled={!cap} onClick={() => void save()}>Save</button>
            </div>
            {!d.group && <small className="v2-muted">Add the group link to show a Join Our WhatsApp Group button on the waiting screen.</small>}
          </section>

          <Chips<Tab> label="Sign-ups" value={tab} onChange={setTab} options={[["Creators", lists.Creators.length], ["Sellers", lists.Sellers.length], ["Let In", lists["Let In"].length], ["Declined", lists.Declined.length]]} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {lists[tab].map((p, i) => (
                <div key={`${p.user_id}:${p.side}`} className="ad-row" style={{ alignItems: "flex-start" }}>
                  <Av name={p.name} size={40} />
                  <span className="main">
                    <b>{p.name}{p.handle ? ` · @${p.handle}` : ""}{tab === "Let In" || tab === "Declined" ? ` · ${p.side === "seller" ? "Seller" : "Creator"}` : ""}</b>
                    <small>{[p.email, p.whatsapp].filter(Boolean).join(" · ") || "No email or WhatsApp yet"}</small>
                    <small>
                      Signed up {when(p.requested_at)}
                      {p.status === "waiting" ? ` · Place ${i + 1}` : p.decided_at ? ` · ${p.status === "approved" ? "Let in" : "Declined"} ${when(p.decided_at)}${p.decided_by ? ` by ${p.decided_by}` : ""}` : ""}
                    </small>
                    {p.reason && <small>Reason: {p.reason}</small>}
                    {p.group_at && <span><Pill tone="ok">Tapped Join Group</Pill></span>}
                  </span>
                  <span className="acts">
                    {wa(p.whatsapp) && <a className="ad-btn-ghost" href={wa(p.whatsapp)!} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>}
                    {p.status !== "declined" && <button type="button" className="ad-btn-ghost danger" disabled={busy !== null} onClick={() => { setNo(p); setReason(null); setNote(""); }}>Decline</button>}
                    {p.status !== "approved" && (
                      <button type="button" className="np-btn v2-btn-sm" disabled={busy !== null || (p.side === "creator" && full)} title={p.side === "creator" && full ? "All places are taken. Raise the limit first." : undefined} onClick={() => void decide(p, true)}>
                        <Icon name="check" size={16} /> {busy === `${p.user_id}:${p.side}` ? "Letting In…" : "Let In"}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!lists[tab].length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
        </>
      )}
      {no && (
        <Sheet title={`Decline ${no.name}`} onClose={() => setNo(null)}>
          <p className="v2-muted" style={{ margin: 0 }}>They see this reason on their screen and by email.</p>
          <Reasons options={REASONS} value={reason} onChange={setReason} note={note} onNote={setNote} notePlaceholder="Anything to add" />
          <button type="button" className="np-btn ad-btn-danger" disabled={!reason || (reason === "Other" && !note.trim()) || busy !== null} onClick={() => void decide(no, false, [reason === "Other" ? "" : reason, note.trim()].filter(Boolean).join(". "))}>Decline</button>
        </Sheet>
      )}
    </div>
  );
}
