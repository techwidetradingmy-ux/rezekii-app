"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Seg, Title } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { CREATOR, LEDGER } from "@/lib/mock";
import "@/app/creator2.css";

const SPLIT = { available: 1150, reserved: 100, expiring: 200 };

/** Credits balance and every movement, straight from the ledger. */
export default function RewardsWallet() {
  const [show, setShow] = useState<"All" | "Earned" | "Used">("All");
  const rows = LEDGER.filter((l) => (show === "All" ? true : show === "Earned" ? l.amount > 0 : l.amount < 0));
  const earned = LEDGER.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Wallet" sub="Credits you earn from missions and referrals">
        <ShareButton big={`${CREATOR.credits.toLocaleString("en-MY")} credits`} label="Earned on Rezekii" lines={["From posting and inviting", `${CREATOR.streak} days in a row`]} />
      </Title>

      <section className="cr2-balance" aria-label="Credits balance">
        <small>Balance</small>
        <div className="big">
          <b><Count value={CREATOR.credits} /></b>
          <span>credits</span>
        </div>
        <div className="cr2-bsplit">
          <span>Available<b>{SPLIT.available.toLocaleString("en-MY")}</b></span>
          <span>Reserved<b>{SPLIT.reserved}</b></span>
          <span>Expiring in 30 days<b>{SPLIT.expiring}</b></span>
        </div>
      </section>

      <div className="v2-alert">
        <span>Credits are not cash and can&apos;t be withdrawn. Use them inside Rezekii, for example for AI scripts.</span>
      </div>

      <div className="v2-grid3">
        <div className="v2-card tight flat">
          <span className="v2-small">Reserved</span>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>Held for a job that&apos;s still running. If it fails, they come back.</span>
        </div>
        <div className="v2-card tight flat">
          <span className="v2-small">Expiring soon</span>
          <span style={{ fontSize: 14, lineHeight: 1.45 }}>Credits last 12 months. The oldest are used first, so 200 expire by 27 Nov if unused.</span>
        </div>
        <Link href="/app/rewards" className="v2-card tight flat" style={{ textDecoration: "none", color: "var(--text)" }}>
          <span className="v2-small">Earn more</span>
          <span style={{ fontSize: 14, lineHeight: 1.45, display: "flex", alignItems: "center", gap: 6 }}>Open today&apos;s chests and finish your missions <Icon name="arrow" size={15} /></span>
        </Link>
      </div>

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
        <span className="v2-small">Earned in this list: +{earned} credits. Every change comes from the ledger, so the balance always adds up.</span>
      </section>
    </div>
  );
}
