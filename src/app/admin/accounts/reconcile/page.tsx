"use client";

import "@/app/admin.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Kv, Meta, Pill } from "@/components/admin/bits";
import { RECON } from "@/lib/mock-admin";
import { rm } from "@/lib/mock";

type Day = (typeof RECON)[number] & { explained?: string };
const n = (x: number) => x.toLocaleString("en-MY");

/** Daily reconciliation: credits issued vs used vs referral rewards vs ledger totals; Partner commission vs TikTok. */
export default function Reconcile() {
  const { toast } = useDemo();
  const [days, setDays] = useState<Day[]>(RECON);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState("");

  const creditDiff = (d: Day) => d.wallets - d.ledger;
  const partnerDiff = (d: Day) => Math.round((d.partnerOurs - d.partnerTikTok) * 100) / 100;
  const bad = (d: Day) => !d.explained && (creditDiff(d) !== 0 || partnerDiff(d) !== 0);
  const issues = days.filter(bad);
  const d = days.find((x) => x.day === open) ?? null;
  const set = (patch: Partial<Day>) => d && setDays((l) => l.map((x) => (x.day === d.day ? { ...x, ...patch } : x)));

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Reconciliation" sub="Every night at 02:00 we check that credits and commission add up.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast("Check re-run for today · all matching so far")}><Icon name="refresh" size={15} /> Run today&apos;s check</button>
      </Title>

      {issues.length > 0 ? (
        <div className="v2-alert red" role="alert">
          <Icon name="alert" size={20} />
          <span>{issues.length} {issues.length === 1 ? "day doesn't" : "days don't"} match: {issues.map((x) => x.day).join(", ")}. Finance is notified until each one is fixed or explained.</span>
        </div>
      ) : (
        <div className="v2-alert green"><Icon name="check" size={20} /><span>Everything matches for the last 7 days.</span></div>
      )}

      <div className="v2-grid4 ad-stats">
        <div className="v2-stat"><small>Credits issued (7 days)</small><b>{n(days.reduce((a, x) => a + x.issued, 0))}</b><em>Missions, grants, refunds</em></div>
        <div className="v2-stat"><small>Credits used (7 days)</small><b>{n(days.reduce((a, x) => a + x.used, 0))}</b><em>AI tools, boosts</em></div>
        <div className="v2-stat"><small>Referral rewards (7 days)</small><b>{n(days.reduce((a, x) => a + x.referral, 0))}</b><em>Both sides</em></div>
        <div className="v2-stat"><small>Partner commission (7 days)</small><b>{rm(days.reduce((a, x) => a + x.partnerOurs, 0), 0)}</b><em>Our records</em></div>
      </div>

      <section className="v2-card" style={{ padding: "8px 12px" }}>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table ad-tight">
            <thead>
              <tr>
                <th>Day</th><th className="num">Issued</th><th className="num">Used</th><th className="num">Referral</th><th className="num">Ledger</th><th className="num">Wallets</th><th className="num">Diff</th><th className="num">Partner, ours</th><th className="num">TikTok</th><th className="num">RM diff</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {days.map((x) => {
                const cd = creditDiff(x);
                const pd = partnerDiff(x);
                return (
                  <tr key={x.day} className={`click ${bad(x) ? "bad" : ""}`} onClick={() => { setOpen(x.day); setWhy(""); }}>
                    <td className="ad-nowrap"><b>{x.day}</b>{x.note && x.day === "28 Oct" && <><br /><small className="v2-small">{x.note}</small></>}</td>
                    <td className="num">{n(x.issued)}</td>
                    <td className="num">{n(x.used)}</td>
                    <td className="num">{n(x.referral)}</td>
                    <td className="num">{n(x.ledger)}</td>
                    <td className="num">{n(x.wallets)}</td>
                    <td className={`num ${cd ? "ad-diff" : ""}`}>{cd ? `${cd > 0 ? "+" : ""}${n(cd)}` : "0"}</td>
                    <td className="num">{rm(x.partnerOurs)}</td>
                    <td className="num">{rm(x.partnerTikTok)}</td>
                    <td className={`num ${pd ? "ad-diff" : ""}`}>{pd ? `${pd > 0 ? "+" : ""}${pd.toFixed(2)}` : "0.00"}</td>
                    <td className="ad-nowrap">{x.explained ? <Pill tone="info">Explained</Pill> : bad(x) ? <Pill tone="bad">Mismatch</Pill> : <Pill tone="ok">Matches</Pill>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "4px 8px 8px" }}>
          <Meta range="22–28 Oct" source="Rezekii ledger and wallets, TikTok Partner settlement data (re-read daily for 30 days)" updated="Today 02:00" />
        </div>
      </section>

      {d && (
        <Sheet title={`Reconciliation · ${d.day}`} onClose={() => setOpen(null)}>
          {d.explained ? <Pill tone="info">Explained</Pill> : bad(d) ? <Pill tone="bad">Mismatch</Pill> : <Pill tone="ok">Matches</Pill>}
          <Kv rows={[
            ["Issued − used", `${n(d.issued)} − ${n(d.used)} = ${n(d.issued - d.used)}`],
            ["Referral rewards", n(d.referral)],
            ["Ledger total", n(d.ledger)],
            ["Sum of wallets", n(d.wallets)],
            ["Credits difference", creditDiff(d) ? <b key="c" className="ad-diff">{creditDiff(d) > 0 ? "+" : ""}{n(creditDiff(d))}</b> : "None"],
            ["Partner commission", `${rm(d.partnerOurs)} ours · ${rm(d.partnerTikTok)} TikTok`],
            ["Commission difference", partnerDiff(d) ? <b key="p" className="ad-diff">{rm(partnerDiff(d))}</b> : "None"],
          ]} />
          {d.note && <div className="ad-note"><small>What the check found</small>{d.note}</div>}
          {d.explained && <div className="ad-note"><small>Explained by Aina</small>{d.explained}</div>}
          {bad(d) && (
            <>
              <div className="v2-row">
                {partnerDiff(d) !== 0 && (
                  <button type="button" className="np-btn v2-btn-sm" disabled={busy} onClick={() => { setBusy(true); window.setTimeout(() => { set({ partnerOurs: d.partnerTikTok, note: "Re-read TikTok orders: 3 late cancellations applied. Now matches." }); setBusy(false); toast("TikTok orders re-read · commission now matches"); }, 1300); }}>
                    {busy ? <span className="ad-spin"><Icon name="refresh" size={16} /></span> : <Icon name="refresh" size={16} />} Re-read TikTok orders
                  </button>
                )}
                {creditDiff(d) !== 0 && <Link href="/admin/accounts" className="np-btn v2-btn-sm">Open the ledger to correct</Link>}
              </div>
              <label className="v2-field">
                Or explain it
                <textarea className="np-input" rows={2} value={why} placeholder="e.g. Held referral rewards, reversed on 28 Oct" onChange={(e) => setWhy(e.target.value)} />
              </label>
              <button type="button" className="ad-btn-ghost" disabled={!why.trim()} onClick={() => { set({ explained: why.trim() }); toast("Marked as explained · logged"); }}>Mark as explained</button>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
