"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Seg } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { CREATOR, LEDGER } from "@/lib/mock";
import "@/app/creator2.css";

/** Credits that expire soonest (credits last 12 months; the oldest are used first). */
const EXPIRING = 200;

/** Wallet (in My account): credits balance and every credit in and out. */
export function Wallet() {
  const [show, setShow] = useState<"All" | "Earned" | "Used">("All");
  const rows = LEDGER.filter((l) => (show === "All" ? true : show === "Earned" ? l.amount > 0 : l.amount < 0));

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      {/* Owner, 28 Oct 2026: a simple wallet. One big balance, when credits expire, and two buttons. */}
      <section className="cr2-balance" aria-label="Credits balance">
        <small>Your credits</small>
        <div className="big">
          <b><Count value={CREATOR.credits} /></b>
        </div>
        <span className="cr2-exp"><Icon name="clock" size={14} /> {EXPIRING} expire on 27 Nov</span>
        <div className="cr2-bacts">
          <Link href="/app/rewards" className="cr2-bbtn"><Icon name="gift" size={16} /> Earn more</Link>
          <ShareButton big={`${CREATOR.credits.toLocaleString("en-MY")} credits`} label="Earned on Rezekii" lines={["From posting and inviting", `${CREATOR.streak} days in a row`]} moment="credits" />
        </div>
      </section>
      <p className="v2-small" style={{ margin: "-8px 0 0" }}>Credits aren&apos;t cash. Use them for AI tools.</p>

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
                <span className={`cr2-lico ${plus ? "in" : "out"}`}><Icon name={plus ? (l.what.startsWith("Referral") ? "users" : l.what.startsWith("Refund") ? "refresh" : "gift") : "spark"} size={18} /></span>
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
