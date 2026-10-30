"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Title } from "@/components/ui";
import { Pill } from "@/components/admin/bits";

type Data = {
  days: { day: string; given: number; used: number; refunded: number; expired: number }[];
  checks: { label: string; ok: boolean; detail: string }[];
  totals: { given: number; used: number; refunded: number; expired: number; wallets: number };
};
const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Accounts › Reconciliation on real data (owner, 31 Oct 2026): credits per day and the checks that must always hold. */
export function LiveReconcile() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v2/admin/data?part=reconcile", { cache: "no-store" })
      .then((r) => (r.status === 403 ? Promise.reject(new Error("admin")) : r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: { data: Data }) => setD(x.data))
      .catch((e: Error) => setErr(e.message === "admin" ? "Sign in with a Techwide admin account to see this page." : "Couldn't load this. Please try again."));
  }, []);
  const bad = d?.checks.filter((c) => !c.ok) ?? [];
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Reconciliation" sub="Credits in and out each day, and the checks that must always hold. From the credit ledger." />
      {!d ? <p className="v2-muted">{err ?? "Loading…"}</p> : (
        <>
          {bad.length > 0 && <div className="v2-alert red" role="alert"><Icon name="alert" size={20} /><span>{bad.length} check{bad.length === 1 ? "" : "s"} failed. See below.</span></div>}
          <div className="v2-grid4 ad-stats">
            <div className="v2-stat"><small>Given, all time</small><b>{d.totals.given.toLocaleString("en-MY")}</b></div>
            <div className="v2-stat"><small>Used</small><b>{d.totals.used.toLocaleString("en-MY")}</b><em>{d.totals.refunded} refunded</em></div>
            <div className="v2-stat"><small>Expired</small><b>{d.totals.expired.toLocaleString("en-MY")}</b></div>
            <div className="v2-stat"><small>In wallets now</small><b>{d.totals.wallets.toLocaleString("en-MY")}</b></div>
          </div>
          <section className="v2-card" style={{ padding: "6px 20px" }}>
            <div className="v2-card-h"><h2 className="v2-h2">Checks</h2></div>
            <div className="ad-list">
              {d.checks.map((c) => <div key={c.label} className="ad-row"><span className="main"><b>{c.label}</b><small>{c.detail}</small></span>{c.ok ? <Pill tone="ok">OK</Pill> : <Pill tone="bad">Check</Pill>}</div>)}
            </div>
          </section>
          <section className="v2-card" style={{ padding: "8px 12px" }}>
            <div className="v2-tablewrap">
              <table className="v2-table ad-table">
                <thead><tr><th>Day</th><th>Given</th><th>Used</th><th>Refunded</th><th>Expired</th><th>Net</th></tr></thead>
                <tbody>
                  {[...d.days].reverse().map((x) => (
                    <tr key={x.day}>
                      <td className="ad-nowrap">{label(x.day)}</td>
                      <td className="num">{x.given}</td>
                      <td className="num">{x.used}</td>
                      <td className="num">{x.refunded}</td>
                      <td className="num">{x.expired}</td>
                      <td className="num"><b>{x.given + x.refunded - x.used - x.expired}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="v2-small" style={{ margin: 0 }}>Malaysia days, last 14. Techwide&apos;s partner commission comes only from TikTok&apos;s reports, so there is no second record to check it against.</p>
        </>
      )}
    </div>
  );
}
