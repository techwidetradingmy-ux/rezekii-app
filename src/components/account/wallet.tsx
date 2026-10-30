"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Seg } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { CREATOR, LEDGER } from "@/lib/mock";
import { useDemo } from "@/components/demo";
import { loadWallet, whenLabel, type LiveWallet } from "@/lib/live-rewards";
import "@/app/creator2.css";

/** Credits that expire soonest on the sample screen (credits last 12 months; the oldest are used first). */
const EXPIRING = 200;

/** Wallet (in My account): credits balance and every credit in and out. Signed in, her real ledger (owner, 31 Oct 2026). */
export function Wallet() {
  const { live } = useDemo();
  const [show, setShow] = useState<"All" | "Earned" | "Used">("All");
  const [real, setReal] = useState<LiveWallet | null | "error">(null);
  useEffect(() => {
    if (live) loadWallet("creator").then(setReal).catch(() => setReal("error"));
  }, [live]);
  const w = live && real && real !== "error" ? real : null;
  const all = w ? w.history.map((h) => ({ when: whenLabel(h.at), what: h.what, amount: h.amount, kind: h.kind })) : LEDGER.map((l) => ({ ...l, kind: "" }));
  const rows = all.filter((l) => (show === "All" ? true : show === "Earned" ? l.amount > 0 : l.amount < 0));
  const credits = w ? w.balance : CREATOR.credits;
  const expiring = w ? w.expiring : { amount: EXPIRING, on: "27 Nov" };
  if (live && real === null) return <p className="v2-muted">Loading your wallet…</p>;
  if (live && real === "error") return <p className="v2-muted">Couldn&apos;t load your wallet. Please refresh.</p>;

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      {/* Owner, 28 Oct 2026: a simple wallet. One big balance, when credits expire, and two buttons. */}
      <section className="cr2-balance" aria-label="Credits balance">
        <small>Your credits</small>
        <div className="big">
          <b><Count value={credits} /></b>
        </div>
        {expiring && <span className="cr2-exp"><Icon name="clock" size={14} /> {expiring.amount} expire on {w ? whenLabel(expiring.on) : expiring.on}</span>}
        <div className="cr2-bacts">
          <Link href="/app/rewards" className="cr2-bbtn"><Icon name="gift" size={16} /> Earn more</Link>
          <ShareButton big={`${credits.toLocaleString("en-MY")} credits`} label="Earned on Rezekii" lines={["From posting and inviting", `${CREATOR.streak} days in a row`]} moment="credits" />
        </div>
      </section>
      <p className="v2-small" style={{ margin: "-8px 0 0" }}>Credits aren&apos;t cash. Use them to post to many apps at once.</p>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">History</h2>
          <Seg value={show} options={["All", "Earned", "Used"] as const} onChange={setShow} />
        </div>
        <div className="v2-divide">
          {rows.map((l, i) => {
            const plus = l.amount > 0;
            return (
              <div key={`${l.when}-${i}`} className="cr2-ledger">
                <span className={`cr2-lico ${plus ? "in" : "out"}`}><Icon name={plus ? (l.kind === "referral" || l.what.startsWith("Referral") ? "users" : l.kind === "refund" || l.what.startsWith("Refund") ? "refresh" : "gift") : "spark"} size={18} /></span>
                <span>
                  <b className="cr2-ellip">{l.what}</b>
                  <small>{l.when}</small>
                </span>
                <span className={`amt ${plus ? "cr2-green" : "cr2-red"}`}>{plus ? "+" : "−"}{Math.abs(l.amount)}</span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="v2-muted" style={{ margin: "12px 0 0" }}>Nothing here yet.</p>}
        </div>
      </section>
    </div>
  );
}
