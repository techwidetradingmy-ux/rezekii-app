"use client";

import "@/app/admin.css";
import { LiveAdminAccess } from "@/components/admin/live-people";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { Av, Pill, Search, Sec } from "@/components/admin/bits";
import { ME, PLAIN_ACCOUNTS, ROLE_NOTE, ROLES, STAFF, type Role, type Staff } from "@/lib/mock-admin";

type Log = { when: string; text: string };

/** Admin Access: staff sign in like everyone else; a Super Admin grants access to an account and picks a role. */
export default function AdminAccess() {
  const { toast, live } = useDemo();
  const [staff, setStaff] = useState<Staff[]>(STAFF);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [log, setLog] = useState<Log[]>([{ when: "Today 09:40", text: "Hazwan granted Business to nadia@rezekii.com" }]);
  // Signed in (owner, 31 Oct 2026): real data.
  if (live) return <LiveAdminAccess />;

  const found = q.trim().length < 2 ? [] : PLAIN_ACCOUNTS.filter((a) => !staff.some((s) => s.email === a.email) && `${a.name} ${a.email}`.toLowerCase().includes(q.toLowerCase()));
  const account = PLAIN_ACCOUNTS.find((a) => a.email === pick) ?? null;
  const supers = staff.filter((s) => s.role === "Super Admin").length;
  const addLog = (text: string) => setLog((l) => [{ when: "Just now", text }, ...l]);

  const grant = () => {
    if (!account || !role) return;
    setStaff((s) => [...s, { name: account.name, short: account.name.split(" ")[0], email: account.email, role, since: "Today", last: "Not signed in yet" }]);
    addLog(`${ME} granted ${role} to ${account.email}`);
    toast(`${account.name} now has ${role} access`);
    setPick(null); setRole(null); setQ("");
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Admin Access" sub="Staff use normal sign-in. Grant access and pick a role." />

      <section className="v2-card">
        <h2 className="v2-h2">Give Access</h2>
        <Search value={q} onChange={(v) => { setQ(v); setPick(null); }} placeholder="Search name or email" />
        {q.trim().length >= 2 && !account && (
          <div className="ad-list">
            {found.map((a) => (
              <button key={a.email} type="button" className="ad-row ad-rowbtn click" onClick={() => setPick(a.email)}>
                <Av name={a.name} />
                <span className="main"><b>{a.name}</b><small>{a.email} · {a.kind} · joined {a.joined}</small></span>
                <Icon name="arrow" size={18} />
              </button>
            ))}
            {found.length === 0 && <p className="v2-small" style={{ margin: 0 }}>No account found. They must sign up first.</p>}
          </div>
        )}
        {account && (
          <div className="v2-stack" style={{ gap: 12 }}>
            <div className="ad-walk-step">
              <Av name={account.name} size={40} />
              <span><b>{account.name}</b><small className="v2-small">{account.email} · {account.kind}</small></span>
              <button type="button" className="v2-link" onClick={() => { setPick(null); setRole(null); }}>Change</button>
            </div>
            <Sec>Pick a role</Sec>
            <div className="ad-form" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {ROLES.map((r) => (
                <label key={r} className={`np-radio ${role === r ? "on" : ""}`} style={{ alignItems: "flex-start" }}>
                  <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} style={{ marginTop: 3 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {r}
                    <small className="v2-small" style={{ fontWeight: 500 }}>{ROLE_NOTE[r]}</small>
                  </span>
                </label>
              ))}
            </div>
            <button type="button" className="np-btn" disabled={!role} onClick={grant} style={{ alignSelf: "flex-start" }}>
              <Icon name="shield" size={17} /> Give {role ?? "access"}
            </button>
          </div>
        )}
      </section>

      <section className="v2-card" style={{ paddingBottom: 8 }}>
        <div className="v2-card-h">
          <h2 className="v2-h2">Staff with Access</h2>
          <span className="badge">{staff.length}</span>
        </div>
        <div className="ad-list">
          {staff.map((s) => {
            const self = s.short === ME;
            const lastSuper = s.role === "Super Admin" && supers === 1;
            return (
              <div key={s.email} className="ad-row">
                <Av name={s.name} size={38} />
                <span className="main">
                  <b>{s.name}{self ? " (you)" : ""}</b>
                  <small>{s.email} · since {s.since} · last active {s.last}</small>
                </span>
                <select
                  className="np-input ad-select"
                  aria-label={`Role for ${s.name}`}
                  value={s.role}
                  disabled={self || lastSuper}
                  onChange={(e) => { const r = e.target.value as Role; setStaff((l) => l.map((x) => (x.email === s.email ? { ...x, role: r } : x))); addLog(`${ME} changed ${s.email} from ${s.role} to ${r}`); toast(`${s.short} is now ${r} · logged`); }}
                >
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                {revoking === s.email ? (
                  <span className="acts">
                    <button type="button" className="np-btn v2-btn-sm ad-btn-danger" onClick={() => { setStaff((l) => l.filter((x) => x.email !== s.email)); addLog(`${ME} removed access for ${s.email}`); setRevoking(null); toast(`Access removed · ${s.short} signed out`); }}>Revoke Now</button>
                    <button type="button" className="ad-btn-ghost" onClick={() => setRevoking(null)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" className="ad-btn-ghost danger" disabled={self || lastSuper} title={self ? "You can't remove your own access" : lastSuper ? "Keep at least one Super Admin" : undefined} onClick={() => setRevoking(s.email)}>Revoke</button>
                )}
              </div>
            );
          })}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Revoking is instant. You can&apos;t remove yourself or the last Super Admin.</p>
      </section>

      <section className="v2-card flat">
        <div className="v2-card-h">
          <b>Access changes</b>
          <Link href="/admin/system/audit">Audit Log</Link>
        </div>
        <ul className="ad-tl">
          {log.map((l, i) => (
            <li key={i} className={/removed/.test(l.text) ? "bad" : "ok"}><small>{l.when}</small>{l.text}</li>
          ))}
        </ul>
      </section>

      <p className="v2-small" style={{ margin: 0 }}>
        <Pill tone="info">Note</Pill> Support role comes in phase 2.
      </p>
    </div>
  );
}
