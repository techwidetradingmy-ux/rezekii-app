"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Title } from "@/components/ui";
import { Av, Chips, Pill, Search } from "@/components/admin/bits";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { adminProductHref } from "@/lib/product-pages";

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
};
type CFilter = "Everyone" | "TikTok Shop linked" | "Not linked" | "Admins";
/** Users › Creators on real data: every account, how they sign in and what they've connected. */
export function LiveCreators() {
  const [list, err] = useData<Creator[]>("/api/v2/admin/data?part=creators");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CFilter>("Everyone");
  const pick = (f: CFilter) => (list ?? []).filter((c) => f === "Everyone" || (f === "Admins" ? c.admin : f === "TikTok Shop linked" ? c.shop : !c.shop && !c.admin));
  const shown = pick(filter).filter((c) => !q || `${c.handle} ${c.name} ${c.signIn}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Creators" sub="Every account on Rezekii, how they sign in and what they've connected." />
      {!list ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search name, handle or email" /></div>
          <Chips<CFilter> label="Filter" value={filter} onChange={setFilter} options={(["Everyone", "TikTok Shop linked", "Not linked", "Admins"] as CFilter[]).map((f) => [f, pick(f).length])} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Account</th><th>Signs in with</th><th>Connected</th><th>Level</th><th>Links</th><th>Samples</th><th>Joined</th><th>Last Seen</th></tr></thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td className="ad-nowrap"><span className="ad-cell"><Av name={c.name} size={30} /><span><b>{c.name}{c.admin && <> <Pill tone="info">Admin</Pill></>}</b><small>{c.handle || "No TikTok"}</small></span></span></td>
                      <td style={{ minWidth: 180 }}><small>{c.signIn}</small></td>
                      <td style={{ minWidth: 170 }}><small>{[c.shopAccount && `Shop ${c.shopAccount}`, c.tiktokAccount && `TikTok ${c.tiktokAccount}`, ...c.social.map((s) => `${s.platform} ${s.name}${s.active ? "" : " (reconnect)"}`)].filter(Boolean).join(" · ") || "Nothing yet"}</small></td>
                      <td>{c.level}</td>
                      <td>{c.links}</td>
                      <td>{c.samples}</td>
                      <td className="ad-nowrap">{day(c.joined)}</td>
                      <td className="ad-nowrap">{day(c.lastSignIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No one matches.</p>}
          </section>
        </>
      )}
    </div>
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
      {!list ? <p className="v2-muted">{err ?? "Loading samples and their TikTok status…"}</p> : (
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
