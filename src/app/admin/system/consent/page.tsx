"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Av, Chips, Search } from "@/components/admin/bits";
import { CONSENTS, type ConsentRow } from "@/lib/mock-admin";

type Show = "All" | ConsentRow["status"];
const PILL: Record<ConsentRow["status"], string> = { Active: "ok", Unlinked: "warn", Deleted: "" };

/** Consent log: every agreement to the Terms and Privacy Policy before linking TikTok Shop, with evidence and what happened after. Read-only. */
export default function ConsentLog() {
  const { toast } = useDemo();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<Show>("All");
  const [open, setOpen] = useState<ConsentRow | null>(null);
  const shown = CONSENTS.filter((c) => (show === "All" || c.status === show) && (!q || `${c.who} ${c.id} ${c.grant}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: Show) => CONSENTS.filter((c) => s === "All" || c.status === s).length;

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Consent log" sub="Who agreed to which Terms and Privacy Policy before linking TikTok Shop, and what happened since. Nobody can edit or delete entries.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast(`Exported ${shown.length} records as CSV`)}><Icon name="doc" size={15} /> Export</button>
      </Title>

      <div className="ad-bar">
        <Search value={q} onChange={setQ} placeholder="Search account, record ID or TikTok grant" />
      </div>
      <Chips<Show> label="Status" value={show} onChange={setShow} options={(["All", "Active", "Unlinked", "Deleted"] as Show[]).map((s) => [s, count(s)] as [Show, number])} />

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead><tr><th>Account</th><th>Agreed</th><th>Versions</th><th>Permissions</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td className="ad-nowrap"><span className="ad-cell"><Av name={c.who} size={30} /><span><b>{c.who}</b><small>{c.role} · {c.id}</small></span></span></td>
                  <td className="ad-nowrap">{c.at}</td>
                  <td className="ad-nowrap">Terms v{c.terms} · Privacy v{c.privacy}</td>
                  <td className="ad-nowrap">{c.scopes} granted</td>
                  <td><span className={`ad-pill ${PILL[c.status]}`}>{c.status}</span></td>
                  <td><button type="button" className="ad-btn-ghost" onClick={() => setOpen(c)}>Evidence</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="v2-muted" style={{ padding: 12 }}>No records match.</p>}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Records are kept for 7 years, even after the account&apos;s TikTok Shop data is deleted. Times are Asia/Kuala_Lumpur.</p>

      {open && (
        <Sheet title={`Consent ${open.id}`} onClose={() => setOpen(null)}>
          <div className="ad-cell"><Av name={open.who} size={40} /><span><b>{open.who}</b><small>{open.role}</small></span></div>
          <dl className="ad-dl">
            <dt>Agreed</dt><dd>{open.at}</dd>
            <dt>Terms</dt><dd>v{open.terms}</dd>
            <dt>Privacy Policy</dt><dd>v{open.privacy}</dd>
            <dt>TikTok permissions</dt><dd>{open.scopes} granted · grant {open.grant}</dd>
            <dt>IP address</dt><dd>{open.ip}</dd>
            <dt>Device</dt><dd>{open.device}</dd>
          </dl>
          <ol className="ad-timeline">
            {open.events.map(([when, what]) => <li key={when + what}><b>{when}</b><span>{what}</span></li>)}
          </ol>
          <button type="button" className="np-btn" onClick={() => toast(`Evidence for ${open.id} saved as PDF`)}><Icon name="doc" size={17} /> Save as evidence (PDF)</button>
        </Sheet>
      )}
    </div>
  );
}
