"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Sheet, Title, Loading } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { Av, Chips, Pill, Search, Switch } from "@/components/admin/bits";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { adminProductHref } from "@/lib/product-pages";
import { shortId, shortIdMatches } from "@/lib/short-id";

/** Loads one admin data part (admins only), with a plain message for anyone else. */
function useData<T>(url: string): [T | null, string | null] {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(url, { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { data?: T; samples?: T }) => setData((d.data ?? d.samples) as T))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  }, [url]);
  return [data, err];
}
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "—");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "—");

type Creator = {
  id: string; handle: string; name: string; avatar: string | null; signIn: string; joined: string; tiktok: boolean; shop: boolean; level: string; links: number; samples: number;
  access: string; tiktokAccount: string | null; shopAccount: string | null; social: { platform: string; name: string; active: boolean }[]; lastSignIn: string | null; admin: boolean;
  goldInvited: boolean; password: boolean;
};
type CFilter = "Everyone" | "TikTok Shop linked" | "Not linked" | "Admins";
/** Users › Creators on real data: every account, how they sign in and what they've connected. */
export function LiveCreators() {
  const [list, err] = useData<Creator[]>("/api/v2/admin/data?part=creators");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CFilter>("Everyone");
  // Manage (owner, 21 Nov 2026, as on rezekii.com): Gold invitation, a new password, or removing the account.
  const [open, setOpen] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Creator>>>({});
  const [gone, setGone] = useState<string[]>([]);
  const all = (list ?? []).filter((c) => !gone.includes(c.id)).map((c) => ({ ...c, ...edits[c.id] }));
  const pick = (f: CFilter) => all.filter((c) => f === "Everyone" || (f === "Admins" ? c.admin : f === "TikTok Shop linked" ? c.shop : !c.shop && !c.admin));
  // Her short user ID or the full one finds her too (owner, 3 Nov 2026: creators quote it to support).
  const shown = pick(filter).filter((c) => !q || `${c.handle} ${c.name} ${c.signIn} ${c.id}`.toLowerCase().includes(q.trim().toLowerCase()) || shortIdMatches(c.id, q));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Creators" sub="Every account on Rezekii, how they sign in and what they've connected." />
      {!list ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search name, handle, email or user ID" /></div>
          <Chips<CFilter> label="Filter" value={filter} onChange={setFilter} options={(["Everyone", "TikTok Shop linked", "Not linked", "Admins"] as CFilter[]).map((f) => [f, pick(f).length])} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Account</th><th>Signs in with</th><th>Connected</th><th>Level</th><th>Links</th><th>Samples</th><th>Joined</th><th>Last Seen</th><th /></tr></thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td className="ad-nowrap"><span className="ad-cell"><Av name={c.name} size={30} /><span><b>{c.name}{c.admin && <> <Pill tone="info">Admin</Pill></>}</b><small>{c.handle || "No TikTok"} · {shortId(c.id)}</small></span></span></td>
                      <td style={{ minWidth: 180 }}><small>{c.signIn}</small></td>
                      <td style={{ minWidth: 170 }}><small>{[c.shopAccount && `Shop ${c.shopAccount}`, c.tiktokAccount && `TikTok ${c.tiktokAccount}`, ...c.social.map((s) => `${s.platform} ${s.name}${s.active ? "" : " (reconnect)"}`)].filter(Boolean).join(" · ") || "Nothing yet"}</small></td>
                      <td>{c.level}</td>
                      <td>{c.links}</td>
                      <td>{c.samples}</td>
                      <td className="ad-nowrap">{day(c.joined)}</td>
                      <td className="ad-nowrap">{day(c.lastSignIn)}</td>
                      <td><button type="button" className="ad-btn-ghost" onClick={() => setOpen(c.id)}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No one matches.</p>}
          </section>
        </>
      )}
      {open && all.find((c) => c.id === open) && (
        <ManageCreator
          c={all.find((c) => c.id === open)!}
          onClose={() => setOpen(null)}
          onChange={(patch) => setEdits((e) => ({ ...e, [open]: { ...e[open], ...patch } }))}
          onGone={() => { setGone((g) => [...g, open]); setOpen(null); }}
        />
      )}
    </div>
  );
}

/** One account's admin actions (as on rezekii.com): Gold invitation, a new password for email sign-in, and removing the account. */
function ManageCreator({ c, onClose, onChange, onGone }: { c: Creator; onClose: () => void; onChange: (patch: Partial<Creator>) => void; onGone: () => void }) {
  const { toast } = useDemo();
  const [pw, setPw] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const call = async (method: "POST" | "DELETE", body: unknown): Promise<string> => {
    setBusy(true);
    const r = await fetch(`/api/admin/creators/${c.id}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    return r?.ok ? "" : j?.error || "That didn't work. Please try again.";
  };
  const gold = async (on: boolean) => {
    const err = await call("POST", { gold: on });
    if (err) return toast(err);
    onChange(on ? { goldInvited: true, level: "gold" } : { goldInvited: false });
    toast(on ? `${c.name} is now Gold` : `Gold invitation withdrawn: ${c.name} moves at the next daily update`);
  };
  const setPassword = async () => {
    const err = await call("POST", { password: pw });
    if (err) return toast(err);
    setPw("");
    toast("New password set. They're signed out on every device.");
  };
  const remove = async () => {
    const err = await call("DELETE", { confirm: typed });
    if (err) return toast(err);
    toast(`${c.name}'s account removed`);
    onGone();
  };
  return (
    <Sheet title={c.name} onClose={onClose}>
      <div className="ad-postsheet">
        <small className="v2-muted">{c.handle || "No TikTok"} · {c.signIn} · {shortId(c.id)}</small>
        <div className="ad-move">
          <span className="ad-row" style={{ padding: 0 }}>
            <span className="main"><b>Gold Invitation</b><small>Invited creators are Gold straight away. Withdrawn, they move at the next daily update.</small></span>
            <Switch on={c.goldInvited} onChange={(v) => void gold(v)} label="Gold invitation" />
          </span>
        </div>
        {c.password && (
          <div className="ad-move">
            <b>Set a New Password</b>
            <small className="v2-muted">For their email sign-in. They&apos;re signed out on every device and sign in with the new one.</small>
            <div className="ad-move-row">
              <input className="np-input" type="password" autoComplete="new-password" aria-label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="np-btn v2-btn-sm" disabled={busy || !pw} onClick={() => void setPassword()}>Save</button>
            </div>
          </div>
        )}
        <div className="ad-move">
          <b>Delete Account</b>
          <small className="v2-muted">Removes their Rezekii account. This can&apos;t be undone. Type DELETE to confirm.</small>
          <div className="ad-move-row">
            <input className="np-input" type="text" aria-label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
            <button type="button" className="ad-btn-ghost danger" disabled={busy || typed !== "DELETE"} onClick={() => void remove()}>Delete Account</button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

type Post = { id: string; handle: string; techwide: boolean; caption: string; status: "published" | "scheduled" | "sending" | "unconfirmed" | "failed" | "paused"; at: string; error: string | null; shareUrl: string | null };
const P_LABEL: Record<Post["status"], [string, "ok" | "warn" | "bad" | "info" | "mute"]> = { published: ["Posted", "ok"], scheduled: ["Scheduled", "info"], sending: ["Sending", "warn"], unconfirmed: ["Not confirmed", "warn"], failed: ["Failed", "bad"], paused: ["Paused: reconnect", "bad"] };
type PFilter = "Needs a look" | "Scheduled" | "Posted";
/** System › Publishing on real data: TikTok posts from 14 days back to 14 days ahead. */
export function LivePublishing() {
  const [list, err] = useData<Post[]>("/api/v2/admin/data?part=posts");
  const [filter, setFilter] = useState<PFilter>("Needs a look");
  const pick = (f: PFilter) => (list ?? []).filter((p) => (f === "Posted" ? p.status === "published" : f === "Scheduled" ? p.status === "scheduled" || p.status === "sending" : ["failed", "unconfirmed", "paused"].includes(p.status)));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Publishing" sub="TikTok posts sent through Rezekii, 14 days back and 14 days ahead." />
      {!list ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <Chips<PFilter> label="Filter" value={filter} onChange={setFilter} options={(["Needs a look", "Scheduled", "Posted"] as PFilter[]).map((f) => [f, pick(f).length])} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {pick(filter).map((p) => (
                <div key={p.id} className="ad-row">
                  <Av name={p.handle} />
                  <span className="main"><b>{p.handle}{p.techwide ? " · Techwide" : ""}</b><small>{(p.caption || "No caption").split("\n")[0].slice(0, 90)}</small>{p.error && <small style={{ color: "var(--red)" }}>{p.error}</small>}</span>
                  <span className="main" style={{ flex: "0 1 150px" }}><b className="ad-nowrap">{when(p.at)}</b></span>
                  <Pill tone={P_LABEL[p.status][1]}>{P_LABEL[p.status][0]}</Pill>
                  {p.shareUrl && <a className="ad-btn-ghost" href={p.shareUrl} target="_blank" rel="noreferrer">Open</a>}
                </div>
              ))}
              {!pick(filter).length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

type Sample = { id: string; creator: string; productId: string; name: string; shop: string | null; image: string | null; askedAt: string; tiktok: { status: string; variant: string; dueAt: number | null } | null; checked: boolean };
type SFilter = "All" | "Waiting in TikTok" | "Not Sent in TikTok";
/** TAP › Sample Review on real data: samples asked for on Rezekii, with TikTok's own status. Creators finish the request in TikTok. */
export function LiveSampleReview() {
  const [list, err] = useData<Sample[]>("/api/admin/samples");
  const [filter, setFilter] = useState<SFilter>("All");
  const pick = (f: SFilter) => (list ?? []).filter((s) => f === "All" || (f === "Waiting in TikTok" ? !!s.tiktok : !s.tiktok));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Sample Review" sub="Samples creators asked for on Rezekii, with TikTok's status. Approve them in Partner Center." />
      {!list ? (err ? <p className="v2-muted">{err}</p> : <Loading text="Loading samples and their TikTok status…" />) : (
        <>
          <Chips<SFilter> label="Filter" value={filter} onChange={setFilter} options={(["All", "Waiting in TikTok", "Not Sent in TikTok"] as SFilter[]).map((f) => [f, pick(f).length])} />
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="ad-list">
              {pick(filter).map((s) => (
                <div key={s.id} className="ad-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="ad-reqimg" src={s.image ?? NO_PHOTO} alt="" />
                  <span className="main"><b><Link href={adminProductHref(s.productId)} className="pv-open">{shortName(s.name)}</Link></b><small>{s.creator} · {s.shop ?? ""} · asked {day(s.askedAt)}</small></span>
                  {s.tiktok ? <Pill tone="info">{s.tiktok.status.toLowerCase().replace(/_/g, " ")}</Pill> : <Pill tone={s.checked ? "warn" : "mute"}>{s.checked ? "Not Sent in TikTok" : "Couldn't check"}</Pill>}
                </div>
              ))}
              {!pick(filter).length && <p className="v2-muted" style={{ padding: "14px 0" }}>Nothing here.</p>}
            </div>
          </section>
          <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}><Icon name="info" size={16} /> Approve or decline samples in Partner Center; the status here updates from TikTok.</p>
        </>
      )}
    </div>
  );
}
