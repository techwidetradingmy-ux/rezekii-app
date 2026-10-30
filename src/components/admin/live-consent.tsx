"use client";

import { useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Chips, Pill, Search } from "@/components/admin/bits";
import { when } from "@/components/admin/live-lists";

type Entry = { id: string; who: string; handle: string | null; role: string; action: "agreed" | "withdrawn"; terms: string; privacy: string; ip: string | null; user_agent: string | null; created_at: string; linked: { shop: string | null; at: string } | null };

/**
 * System › Consent Log on real data (owner, 31 Oct 2026): every agreement to the Terms and Privacy Policy before linking
 * TikTok Shop, and every withdrawal, with the versions, where it came from, and the link that followed. Read-only.
 */
export function LiveConsent() {
  const [d, setD] = useState<{ entries: Entry[]; before: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Agreed" | "Withdrawn">("All");
  useEffect(() => {
    fetch("/api/v2/admin/lists?part=consent", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { items: { entries: Entry[]; before: number } }) => setD(x.items))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load the log. Please try again."));
  }, []);
  const shown = (d?.entries ?? []).filter((e) => (filter === "All" || e.action === filter.toLowerCase()) && (!q || `${e.who} ${e.handle ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Consent Log" sub="Every agreement to the Terms and Privacy Policy before linking TikTok Shop, and every withdrawal. Read-only." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          <div className="ad-bar"><Search value={q} onChange={setQ} placeholder="Search name or handle" /></div>
          <Chips label="Filter" value={filter} onChange={setFilter} options={[["All", d.entries.length], ["Agreed", d.entries.filter((e) => e.action === "agreed").length], ["Withdrawn", d.entries.filter((e) => e.action === "withdrawn").length]]} />
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>When</th><th>Who</th><th>What</th><th>Versions</th><th>TikTok Shop</th><th>From</th></tr></thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.id}>
                      <td className="ad-nowrap">{when(e.created_at)}</td>
                      <td className="ad-nowrap"><b>{e.who}</b><small className="v2-small" style={{ display: "block" }}>{e.handle ? `@${e.handle}` : e.role}</small></td>
                      <td>{e.action === "agreed" ? <Pill tone="ok">Agreed</Pill> : <Pill tone="mute">Withdrew (unlinked)</Pill>}</td>
                      <td className="ad-nowrap">Terms {e.terms} · Privacy {e.privacy}</td>
                      <td className="ad-nowrap">{e.linked ? `@${e.linked.shop ?? ""} · ${when(e.linked.at)}` : "Not linked now"}</td>
                      <td style={{ minWidth: 160 }}><small>{e.ip ?? "—"}{e.user_agent ? ` · ${e.user_agent.slice(0, 40)}…` : ""}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p className="v2-muted" style={{ padding: 12 }}>No entries yet.</p>}
          </section>
          {d.before > 0 && <p className="v2-small" style={{ margin: 0 }}>{d.before} account{d.before === 1 ? "" : "s"} linked TikTok Shop before this log started on 31 Oct 2026, so they have no entry here.</p>}
        </>
      )}
    </div>
  );
}
