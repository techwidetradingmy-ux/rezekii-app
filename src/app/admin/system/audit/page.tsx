"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Av, Chips, Search } from "@/components/admin/bits";
import { AUDIT } from "@/lib/mock-admin";

type Who = "Everyone" | "Super Admin" | "Ops" | "Business" | "Growth" | "Finance" | "System";

/** Audit log: who did what, when, with the value before and after. Read-only. */
export default function AuditLog() {
  const { toast } = useDemo();
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Who>("Everyone");
  const shown = AUDIT.filter((a) => (who === "Everyone" || a.role === who) && (!q || `${a.who} ${a.action} ${a.target} ${a.before} ${a.after}`.toLowerCase().includes(q.toLowerCase())));
  const roles: Who[] = ["Everyone", "Super Admin", "Ops", "Business", "Growth", "Finance", "System"];

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Audit Log" sub="Every change, before and after. Entries can't be edited or deleted.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast(`Exported ${shown.length} entries as CSV`)}><Icon name="doc" size={15} /> Export</button>
      </Title>

      <div className="ad-bar">
        <Search value={q} onChange={setQ} placeholder="Search log" />
      </div>
      <Chips<Who> label="Role" value={who} onChange={setWho} options={roles.map((r) => [r, r === "Everyone" ? AUDIT.length : AUDIT.filter((a) => a.role === r).length] as [Who, number])} />

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th><th>Before</th><th>After</th></tr></thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td className="ad-nowrap"><span className="ad-cell"><span><b>{a.when}</b><small className="ad-mono">{a.id}</small></span></span></td>
                  <td className="ad-nowrap">
                    <span className="ad-cell">
                      {a.role === "System" ? <span className="ad-av c5" style={{ width: 30, height: 30 }}><Icon name="gear" size={16} /></span> : <Av name={a.who} size={30} />}
                      <span><b>{a.who}</b><small>{a.role}</small></span>
                    </span>
                  </td>
                  <td style={{ minWidth: 170 }}><b>{a.action}</b></td>
                  <td style={{ minWidth: 150 }}>{a.target}</td>
                  <td style={{ minWidth: 120 }}><span className="ad-before">{a.before}</span></td>
                  <td style={{ minWidth: 160 }}><span className="ad-after">{a.after}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <p className="v2-muted" style={{ padding: 12 }}>No entries match.</p>}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Kept for 7 years. Times are Asia/Kuala_Lumpur.</p>
    </div>
  );
}
