"use client";

import { Icon } from "@/components/icons";
import { Count, Lock, Stat, Title } from "@/components/ui";
import { rm } from "@/lib/mock";
import { PAYOUTS } from "@/lib/mock-creator2";
import "@/app/creator2.css";

/** Estimated vs paid commission, what is still pending and what was clawed back, month by month. */
export default function DataPayouts() {
  const now = PAYOUTS[0];
  const w = (n: number) => `${(n / now.est) * 100}%`;
  const paidYear = PAYOUTS.reduce((s, m) => s + m.paid, 0);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Payouts" sub="TikTok Shop pays your commission. Rezekii only shows it to you." />

      <Lock what="your payouts">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">October so far</h2>
            <span className="badge badge-amber">Settling</span>
          </div>
          <div>
            <span className="v2-small">Estimated commission</span>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              <Count value={now.est} format={(n) => rm(n)} />
            </div>
          </div>
          <div className="cr2-stack" role="img" aria-label={`Paid ${rm(now.paid)}, pending ${rm(now.pending)}, clawed back ${rm(now.clawed)}`}>
            <i className="cr2-k-paid" style={{ width: w(now.paid) }} />
            <i className="cr2-k-pend" style={{ width: w(now.pending), animationDelay: "120ms" }} />
            <i className="cr2-k-claw" style={{ width: w(now.clawed), animationDelay: "240ms" }} />
          </div>
          <div className="cr2-legend">
            <span><i className="cr2-k-paid" />Paid <b>{rm(now.paid)}</b></span>
            <span><i className="cr2-k-pend" />Pending <b>{rm(now.pending)}</b></span>
            <span><i className="cr2-k-claw" />Clawed back <b>{rm(now.clawed)}</b></span>
          </div>
        </section>
      </Lock>

      <div className="cr2-stats">
        <Stat label="Paid" value={rm(now.paid)} note="Already in your TikTok Shop balance" tone="up" />
        <Stat label="Pending" value={rm(now.pending)} note="Waiting for the return window to end" />
        <Stat label="Clawed back" value={rm(now.clawed)} note="Orders cancelled or returned" tone="down" />
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Month by month</h2>
          <span className="v2-small">Paid since June: <b style={{ color: "var(--text)" }}>{rm(paidYear)}</b></span>
        </div>
        <Lock what="your monthly payouts">
          <div className="v2-divide">
            {PAYOUTS.map((m) => (
              <div key={m.month} className="cr2-month">
                <span>
                  <strong>{m.month}</strong>
                  <small>Estimated {rm(m.est)}{m.clawed > 0 && <> · <span className="cr2-red">−{rm(m.clawed)} clawed back</span></>}</small>
                </span>
                <span className="amt" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <b>{rm(m.paid)}</b>
                  {m.status === "Paid" ? <span className="badge">Paid</span> : <span className="badge badge-amber">{rm(m.pending)} pending</span>}
                </span>
              </div>
            ))}
          </div>
        </Lock>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">What these mean</h2>
        <ul className="cr2-do">
          <li><span><b>Estimated</b>: commission on orders placed, before buyers can still cancel or return.</span></li>
          <li><span><b>Pending</b>: the order is delivered but the return window isn&apos;t over yet.</span></li>
          <li><span><b>Paid</b>: TikTok Shop has settled it into your balance. Withdraw it in TikTok Shop.</span></li>
          <li><span><b>Clawed back</b>: the buyer cancelled or returned after the commission was counted.</span></li>
        </ul>
        <p className="cr2-note"><Icon name="shield" size={15} /><span>We only show money that has already happened. We never forecast what you will earn.</span></p>
      </section>
    </div>
  );
}
