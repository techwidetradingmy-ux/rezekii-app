"use client";

import "@/app/seller.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Qr, ShareSheet, Stat, Title } from "@/components/ui";
import { Ava } from "@/components/seller/seller-ui";
import { ReferralOffer } from "@/components/referral-offer";
import { REFERRAL_REWARD, SELLER } from "@/lib/mock";
import { SELLER_INVITES } from "@/lib/mock-seller";

const LINK = "rezekii.com/s/seriliving";
const CODE = "SERI-4821";
const FILTERS = ["All", "Sellers", "Creators"] as const;

/** Sellers can invite sellers and creators. The link they sign up with is locked in for good. */
export default function SellerReferral() {
  const { toast } = useDemo();
  const [share, setShare] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const ok = SELLER_INVITES.filter((i) => i.status === "Successful");
  const shown = SELLER_INVITES.filter((i) => filter === "All" || (filter === "Sellers" ? i.role === "Seller" : i.role === "Creator"));

  const copy = async () => {
    try { await navigator.clipboard.writeText(`https://${LINK}`); } catch {}
    toast("Link copied");
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Referral" sub="Invite sellers and creators. Earn credits when they're set up.">
        <button type="button" className="btn-outline" onClick={() => setShare(true)}><Icon name="share" size={18} /> Share</button>
      </Title>

      <ReferralOffer />

      <section className="v2-card sl-ref">
        <div>
          <h2 className="v2-h2">Your invite link</h2>
          <div className="sl-linkbox">
            <code>{LINK}</code>
            <button type="button" className="np-btn v2-btn-sm" onClick={copy}>Copy</button>
          </div>
          <span className="v2-small">Or use code: <b style={{ color: "var(--text)", letterSpacing: "0.05em" }}>{CODE}</b></span>
          <div className="v2-chips">
            <button type="button" className="v2-chip" onClick={() => toast("Opening WhatsApp…")}><Icon name="whatsapp" size={16} /> WhatsApp</button>
            <button type="button" className="v2-chip" onClick={() => toast("Opening Facebook…")}>Facebook</button>
            <button type="button" className="v2-chip" onClick={() => setShare(true)}><Icon name="qr" size={16} /> Share card</button>
          </div>
        </div>
        <Qr />
      </section>

      <section className="v2-grid4">
        <Stat label="Successful this month" value={<Count value={ok.length} />} note={`+${REFERRAL_REWARD.inviter} credits each`} tone="up" />
        <Stat label="Not set up yet" value={<Count value={SELLER_INVITES.length - ok.length} />} note="They have 30 days" />
        <Stat label="Credits earned" value={<Count value={ok.reduce((a, i) => a + i.credits, 0)} />} />
      </section>

      <section className="v2-card">
        <h2 className="v2-h2">How it counts</h2>
        <ul className="sl-list">
          <li><Icon name="box" size={18} stroke="var(--gink)" /> <span><b style={{ color: "var(--text)" }}>Seller:</b> connects Seller Center and submits a product within 30 days.</span></li>
          <li><Icon name="user" size={18} stroke="var(--gink)" /> <span><b style={{ color: "var(--text)" }}>Creator:</b> links TikTok Shop and runs a first scan within 30 days.</span></li>
          <li><Icon name="lock" size={18} stroke="var(--gink)" /> <span>The signup link is locked in for good.</span></li>
          <li><Icon name="gift" size={18} stroke="var(--gink)" /> <span>+{REFERRAL_REWARD.inviter} credits for you, +{REFERRAL_REWARD.friend} for them. Credits are not cash.</span></li>
        </ul>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">People you invited</h2>
          <div className="sl-chipline">
            {FILTERS.map((f) => <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
        </div>
        <div>
          {shown.map((i) => (
            <div key={i.name} className="sl-dest">
              <Ava name={i.name} lg />
              <span>
                <b>{i.name} <span className={`badge ${i.role === "Seller" ? "badge-blue" : "badge-gray"}`} style={{ marginLeft: 4 }}>{i.role}</span></b>
                <small>{i.note}</small>
                <small>Joined {i.when}</small>
              </span>
              <span className="sl-pside">
                <span className={`badge ${i.status === "Successful" ? "" : "badge-amber"}`}>{i.status}</span>
                {i.credits > 0 ? <small className="v2-small">+{i.credits} credits</small> : <button type="button" className="v2-link" style={{ fontSize: 13.5 }} onClick={() => toast(`Reminder sent to ${i.name}`)}>Nudge</button>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {share && (
        <ShareSheet
          onClose={() => setShare(false)}
          handle={SELLER.shop}
          label="Sell with creators on TikTok Shop"
          big="RM 0 a month"
          lines={["Commission only when you sell", `Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`]}
        />
      )}
    </div>
  );
}
