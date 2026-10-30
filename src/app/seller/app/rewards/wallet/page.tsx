"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Count, Seg, ShareSheet, Title } from "@/components/ui";
import { SELLER } from "@/lib/mock";
import { SELLER_CREDITS, SELLER_LEDGER } from "@/lib/mock-seller";
import { useDemo } from "@/components/demo";
import { loadWallet, whenLabel, type LiveWallet } from "@/lib/live-rewards";

/** Credits wallet: balance and a ledger. Credits are rewards, not cash. Signed in, the shop's real ledger (owner, 31 Oct 2026). */
export default function SellerWallet() {
  const { live, me } = useDemo();
  const [view, setView] = useState<"All" | "Earned" | "Used">("All");
  const [share, setShare] = useState(false);
  const [real, setReal] = useState<LiveWallet | null | "error">(null);
  useEffect(() => {
    if (live) loadWallet("seller").then(setReal).catch(() => setReal("error"));
  }, [live]);
  const w = live && real && real !== "error" ? real : null;
  const all = w ? w.history.map((h) => ({ when: whenLabel(h.at), what: h.what, amount: h.amount })) : SELLER_LEDGER;
  const rows = all.filter((l) => view === "All" || (view === "Earned" ? l.amount > 0 : l.amount < 0));
  const earned = all.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0);
  const used = all.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0);
  const credits = w ? w.balance : SELLER_CREDITS;
  const shop = w ? me?.sellerShop ?? "My shop" : SELLER.shop;
  if (live && real === null) return <div className="v2-stack v2-in v2-narrow"><p className="v2-muted">Loading your wallet…</p></div>;
  if (live && real === "error") return <div className="v2-stack v2-in v2-narrow"><p className="v2-muted">Couldn&apos;t load your wallet. Please refresh.</p></div>;

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title="Wallet">
        <button type="button" className="btn-outline" onClick={() => setShare(true)}><Icon name="share" size={18} /> Share</button>
      </Title>

      <section className="sl-wallet">
        <small>Your credits</small>
        <b><Count value={credits} /></b>
        <p>{earned.toLocaleString("en-MY")} earned · {used.toLocaleString("en-MY")} used · {w?.expiring ? `${w.expiring.amount} expiring ${whenLabel(w.expiring.on)}` : "none expiring in 30 days"}</p>
        <p style={{ fontSize: 13, opacity: 0.8 }}>Credits are not cash and can&apos;t be withdrawn.</p>
      </section>

      <section className="v2-card flat" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <span className="sl-ico blue"><Icon name="spark" size={18} /></span>
        <span style={{ flex: "1 1 220px", minWidth: 0 }}><b>Coming soon: spend credits</b><br /><span className="v2-muted">AI captions and extra competitor reports.</span></span>
        <Link href="/seller/app/rewards" className="btn-outline" style={{ height: 40 }}>Earn more</Link>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">History</h2>
          <Seg value={view} options={["All", "Earned", "Used"] as const} onChange={setView} />
        </div>
        <div>
          {rows.map((l, i) => (
            <div key={i} className="sl-ledger">
              <span style={{ fontWeight: 700 }}>{l.what}</span>
              <small>{l.when}</small>
              <b className={l.amount > 0 ? "plus" : ""}>{l.amount > 0 ? "+" : "−"}{Math.abs(l.amount)}</b>
            </div>
          ))}
          {rows.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>Nothing here yet.</p>}
        </div>
      </section>

      {share && (
        <ShareSheet onClose={() => setShare(false)} handle={shop} label="Credits earned on Rezekii" big={`${credits.toLocaleString("en-MY")}`} lines={["by setting up and inviting friends", "Join free with my link"]} moment="credits" />
      )}
    </div>
  );
}
