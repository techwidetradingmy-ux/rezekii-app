"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Seg, Loading } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { CREATOR, LEDGER } from "@/lib/mock";
import { useDemo } from "@/components/demo";
import { loadWallet, whenLabel, type LiveWallet } from "@/lib/live-rewards";
import { useT } from "@/lib/i18n/client";
import "@/app/creator2.css";

/** Credits that expire soonest on the sample screen (credits last 12 months; the oldest are used first). */
const EXPIRING = 200;
/** The History filter, in English (translated where it's shown). */
const SHOWS = ["All", "Earned", "Used"] as const;

/** Wallet (in My account): credits balance and every credit in and out. Signed in, her real ledger (owner, 31 Oct 2026). */
export function Wallet() {
  const t = useT();
  const { live } = useDemo();
  const [show, setShow] = useState<(typeof SHOWS)[number]>("All");
  const [real, setReal] = useState<LiveWallet | null | "error">(null);
  useEffect(() => {
    if (live) loadWallet("creator").then(setReal).catch(() => setReal("error"));
  }, [live]);
  const w = live && real && real !== "error" ? real : null;
  const all = w ? w.history.map((h) => ({ when: whenLabel(h.at), what: h.what, amount: h.amount, kind: h.kind })) : LEDGER.map((l) => ({ ...l, kind: "" }));
  const rows = all.filter((l) => (show === "All" ? true : show === "Earned" ? l.amount > 0 : l.amount < 0));
  const credits = w ? w.balance : CREATOR.credits;
  const expiring = w ? w.expiring : { amount: EXPIRING, on: "27 Nov" };
  const days = w ? w.streak : CREATOR.streak;
  const inARow = days === 1 ? t("{n} day in a row", { n: days }) : t("{n} days in a row", { n: days });
  if (live && real === null) return <Loading text={t("Loading your wallet…")} />;
  if (live && real === "error") return <p className="v2-muted">{t("Couldn't load your wallet. Please refresh.")}</p>;

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      {/* Owner, 28 Oct 2026: a simple wallet. One big balance, when credits expire, and two buttons. */}
      <section className="cr2-balance" aria-label={t("Credits balance")}>
        <small>{t("Your credits")}</small>
        <div className="big">
          <b><Count value={credits} /></b>
        </div>
        {expiring && <span className="cr2-exp"><Icon name="clock" size={14} /> {t("{n} expire on {date}", { n: expiring.amount, date: w ? whenLabel(expiring.on) : expiring.on })}</span>}
        <div className="cr2-bacts">
          <Link href="/app/rewards" className="cr2-bbtn"><Icon name="gift" size={16} /> {t("Earn More")}</Link>
          <ShareButton big={t("{n} credits", { n: credits.toLocaleString("en-MY") })} label={t("Earned on Rezekii")} lines={[t("From posting and inviting"), inARow]} moment="credits" />
        </div>
      </section>
      <p className="v2-small" style={{ margin: "-8px 0 0" }}>{t("Credits aren't cash. Use them to post to many apps at once.")}</p>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("History")}</h2>
          <Seg value={t(show)} options={SHOWS.map((x) => t(x))} onChange={(v) => setShow(SHOWS.find((x) => t(x) === v) ?? "All")} />
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
          {rows.length === 0 && <p className="v2-muted" style={{ margin: "12px 0 0" }}>{t("Nothing here yet.")}</p>}
        </div>
      </section>
    </div>
  );
}
