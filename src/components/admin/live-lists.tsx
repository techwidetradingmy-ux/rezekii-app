"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Av, Chips, Pill, Search } from "@/components/admin/bits";
import { REFERRAL_REWARD } from "@/lib/mock";

/** Loads one admin list (admins only), with a plain message for anyone else. */
export function useList<T>(part: string): [T[] | null, string | null, () => void] {
  const [items, setItems] = useState<T[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () =>
    fetch(`/api/v2/admin/lists?part=${part}`, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { items: T[] }) => setItems(d.items))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this list. Please try again."));
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [items, err, load];
}
export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "—");
export const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }) : "—");
const csv = (name: string, rows: (string | number)[][]) => {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

type Audit = { at: string; actor: string; kind: string; what: string };
/** System › Audit log on real data: every staff action Rezekii records, newest first. */
export function LiveAudit() {
  const { toast } = useDemo();
  const [items, err] = useList<Audit>("audit");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("Everything");
  const kinds = ["Everything", ...new Set((items ?? []).map((a) => a.kind))];
  const shown = (items ?? []).filter((a) => (kind === "Everything" || a.kind === kind) && (!q || `${a.actor} ${a.what}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Audit Log" sub="Every staff action, newest first. Entries can't be edited or deleted.">
        <button type="button" className="ad-btn-ghost" disabled={!shown.length} onClick={() => { csv("rezekii-audit", [["When", "Who", "Area", "What"], ...shown.map((a) => [a.at, a.actor, a.kind, a.what])]); toast(`Exported ${shown.length} entries as CSV`); }}><Icon name="doc" size={15} /> Export</button>
      </Title>
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search log" /></div>
          <Chips<string> label="Area" value={kind} onChange={setKind} options={kinds.map((k) => [k, k === "Everything" ? items.length : items.filter((a) => a.kind === k).length])} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>When</th><th>Who</th><th>Area</th><th>What</th></tr></thead>
                <tbody>
                  {shown.map((a, i) => (
                    <tr key={i}>
                      <td className="ad-nowrap"><b>{when(a.at)}</b></td>
                      <td className="ad-nowrap"><span className="ad-cell"><Av name={a.actor} size={30} /><b>{a.actor}</b></span></td>
                      <td className="ad-nowrap">{a.kind}</td>
                      <td style={{ minWidth: 260 }}>{a.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No entries match.</p>}
          </section>
          <p className="v2-small" style={{ margin: 0 }}>Showing the latest {items.length}. Times are Malaysia time.</p>
        </>
      )}
    </div>
  );
}

type Custom = { id: string; who: string; shop: string | null; services: string[]; budget: string | null; goal: string | null; whatsapp: string; status: "new" | "contacted" | "quoted" | "won" | "lost"; created_at: string };
const C_LABEL: Record<Custom["status"], [string, "info" | "warn" | "ok" | "mute"]> = { new: ["New", "info"], contacted: ["Contacted", "warn"], quoted: ["Quoted", "warn"], won: ["Won", "ok"], lost: ["Lost", "mute"] };
/** Business › Custom Service on real data: sellers' requests, with a status the team moves along. */
export function LiveCustom() {
  const { toast } = useDemo();
  const [items, err, load] = useList<Custom>("custom");
  const [filter, setFilter] = useState<"Open" | "Won or lost">("Open");
  const isOpen = (r: Custom) => r.status !== "won" && r.status !== "lost";
  const shown = (items ?? []).filter((r) => (filter === "Open" ? isOpen(r) : !isOpen(r)));
  const move = async (r: Custom, status: Custom["status"]) => {
    const res = await fetch("/api/v2/admin/lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ custom: r.id, status }) }).catch(() => null);
    if (!res?.ok) return toast("Didn't save. Please try again.");
    toast(`Marked ${C_LABEL[status][0].toLowerCase()}`);
    void load();
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Custom Service" sub="Sellers who want our team to run it. Reply on WhatsApp with a plan and a quote." />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Filter" value={filter} onChange={setFilter} options={[["Open", items.filter(isOpen).length], ["Won or lost", items.filter((x) => !isOpen(x)).length]]} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {shown.map((r) => (
                <div key={r.id} className="ad-row" style={{ alignItems: "flex-start" }}>
                  <Av name={r.shop ?? r.who} />
                  <span className="main">
                    <b>{r.shop ?? r.who} · {r.services.join(", ")}</b>
                    <small>{r.budget ?? "No budget given"} · {day(r.created_at)} · {r.whatsapp}</small>
                    {r.goal && <small>{r.goal}</small>}
                  </span>
                  <Pill tone={C_LABEL[r.status][1]}>{C_LABEL[r.status][0]}</Pill>
                  <span className="acts" style={{ flexWrap: "wrap" }}>
                    <a className="ad-btn-ghost" href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>
                    <select className="np-input" style={{ width: "auto", padding: "6px 10px" }} aria-label="Status" value={r.status} onChange={(e) => void move(r, e.target.value as Custom["status"])}>
                      {(Object.keys(C_LABEL) as Custom["status"][]).map((s) => <option key={s} value={s}>{C_LABEL[s][0]}</option>)}
                    </select>
                  </span>
                </div>
              ))}
              {!shown.length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

type Wait = { spot: number; name: string; handle: string | null; types: string[]; videos: number; platforms: string[]; note: string | null; joined: string };
/** Growth › AI Video waitlist on real data, in joining order. */
export function LiveWaitlist() {
  const { toast } = useDemo();
  const [items, err] = useList<Wait>("waitlist");
  const [sort, setSort] = useState<"Joining order" | "Most videos">("Joining order");
  const shown = [...(items ?? [])].sort((a, b) => (sort === "Most videos" ? b.videos - a.videos : a.spot - b.spot));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="AI Video Waitlist" sub="Creators who want to try AI Video first. Pick the first trial batch from here.">
        <button type="button" className="ad-btn-ghost" disabled={!shown.length} onClick={() => { csv("rezekii-ai-video-waitlist", [["Place", "Creator", "TikTok", "Videos a month", "Types", "Apps", "Note", "Joined"], ...shown.map((w) => [w.spot, w.name, w.handle ? `@${w.handle}` : "", w.videos, w.types.join("; "), w.platforms.join("; "), w.note ?? "", w.joined])]); toast("Exported as CSV"); }}><Icon name="doc" size={15} /> Export</button>
      </Title>
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips label="Sort" value={sort} onChange={setSort} options={[["Joining order", items.length], ["Most videos"]]} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>#</th><th>Creator</th><th>Videos a month</th><th>Types</th><th>Apps</th><th>Joined</th></tr></thead>
                <tbody>
                  {shown.map((w) => (
                    <tr key={w.spot}>
                      <td><b>{w.spot}</b></td>
                      <td className="ad-nowrap"><span className="ad-cell"><Av name={w.name} size={30} /><span><b>{w.name}</b><small>{w.handle ? `@${w.handle}` : "No TikTok linked"}</small></span></span></td>
                      <td>{w.videos}</td>
                      <td style={{ minWidth: 180 }}>{w.types.join(", ")}{w.note && <small className="v2-small" style={{ display: "block" }}>{w.note}</small>}</td>
                      <td>{w.platforms.join(", ")}</td>
                      <td className="ad-nowrap">{day(w.joined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No one has joined yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}

type Ref = { side: string; via: string | null; inviter: string; friend: string; joined: string | null; qualified: string | null };
/** Growth › Referrals on real data: who invited whom, and whether it counted. */
export function LiveReferrals() {
  const [items, err] = useList<Ref>("referrals");
  const [filter, setFilter] = useState<"All" | "Successful" | "Not yet">("All");
  const shown = (items ?? []).filter((r) => filter === "All" || (filter === "Successful" ? !!r.qualified : !r.qualified));
  const ok = (items ?? []).filter((r) => r.qualified).length;
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Referrals" sub={`Creators invite creators, sellers invite sellers. It counts when the friend links TikTok Shop within 14 days: +${REFERRAL_REWARD.inviter} credits each.`} />
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="v2-grid4 ad-stats">
            <div className="v2-stat"><small>Joined with a link</small><b>{items.length}</b></div>
            <div className="v2-stat"><small>Successful</small><b>{ok}</b><em>{items.length ? `${Math.round((ok / items.length) * 100)}% of sign-ups` : ""}</em></div>
            <div className="v2-stat"><small>Creator invites</small><b>{items.filter((r) => r.side === "creator").length}</b></div>
            <div className="v2-stat"><small>Seller invites</small><b>{items.filter((r) => r.side === "seller").length}</b></div>
          </div>
          <Chips label="Filter" value={filter} onChange={setFilter} options={[["All", items.length], ["Successful", ok], ["Not yet", items.length - ok]]} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Invited by</th><th>Friend</th><th>Side</th><th>Joined</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr key={i}>
                      <td className="ad-nowrap"><b>{r.inviter}</b></td>
                      <td className="ad-nowrap">{r.friend}</td>
                      <td>{r.side === "seller" ? "Seller" : "Creator"}</td>
                      <td className="ad-nowrap">{day(r.joined)}</td>
                      <td>{r.qualified ? <Pill tone="ok">Successful · {day(r.qualified)}</Pill> : <Pill tone="info">Not yet</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>Nothing here.</p>}
          </section>
        </>
      )}
    </div>
  );
}

type Credit = { id: string; who: string; side: string; amount: number; kind: string; what: string; created_at: string; expires_at: string | null };
const KINDS: Record<string, string> = { welcome: "Welcome", mission: "Mission", chest: "Chest", streak: "Streak", referral: "Referral", post: "Post Everywhere", refund: "Refund", expired: "Expired", admin: "Admin" };
/** Accounts › Ledger on real data: every credit in and out, read-only. */
export function LiveLedger() {
  const { toast } = useDemo();
  const [items, err] = useList<Credit>("ledger");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("All");
  const kinds = ["All", ...new Set((items ?? []).map((c) => c.kind))];
  const shown = (items ?? []).filter((c) => (kind === "All" || c.kind === kind) && (!q || `${c.who} ${c.what}`.toLowerCase().includes(q.toLowerCase())));
  const sum = (f: (c: Credit) => boolean) => (items ?? []).filter(f).reduce((t, c) => t + c.amount, 0);
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Ledger" sub="Every credit in and out. Entries can't be edited; corrections are new entries.">
        <button type="button" className="ad-btn-ghost" disabled={!shown.length} onClick={() => { csv("rezekii-credit-ledger", [["When", "Account", "Side", "Type", "Credits", "What", "Expires"], ...shown.map((c) => [c.created_at, c.who, c.side, KINDS[c.kind] ?? c.kind, c.amount, c.what, c.expires_at ?? ""])]); toast("Exported as CSV"); }}><Icon name="doc" size={15} /> Export</button>
      </Title>
      {!items ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="v2-grid4 ad-stats">
            <div className="v2-stat"><small>Given</small><b>{sum((c) => c.amount > 0).toLocaleString("en-MY")}</b><em>Credits in</em></div>
            <div className="v2-stat"><small>Used</small><b>{Math.abs(sum((c) => c.kind === "post")).toLocaleString("en-MY")}</b><em>Post Everywhere</em></div>
            <div className="v2-stat"><small>Expired</small><b>{Math.abs(sum((c) => c.kind === "expired")).toLocaleString("en-MY")}</b></div>
            <div className="v2-stat"><small>Balance in wallets</small><b>{sum(() => true).toLocaleString("en-MY")}</b><em>Latest {items.length} entries</em></div>
          </div>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search account or reason" /></div>
          <Chips<string> label="Type" value={kind} onChange={setKind} options={kinds.map((k) => [k === "All" ? "All" : k, k === "All" ? items.length : items.filter((c) => c.kind === k).length])} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>When</th><th>Account</th><th>Type</th><th>What</th><th style={{ textAlign: "right" }}>Credits</th></tr></thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td className="ad-nowrap">{when(c.created_at)}</td>
                      <td className="ad-nowrap"><b>{c.who}</b><small className="v2-small" style={{ display: "block" }}>{c.side === "seller" ? "Seller wallet" : "Creator wallet"}</small></td>
                      <td className="ad-nowrap">{KINDS[c.kind] ?? c.kind}</td>
                      <td style={{ minWidth: 200 }}>{c.what}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: c.amount < 0 ? "var(--red)" : undefined }}>{c.amount > 0 ? "+" : ""}{c.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>Nothing matches.</p>}
          </section>
        </>
      )}
    </div>
  );
}
