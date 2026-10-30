"use client";

import "@/app/seller.css";
import "@/app/creator2.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, ShareSheet, Tip, Title } from "@/components/ui";
import { REFERRAL_REWARD, SELLER } from "@/lib/mock";
import { SELLER_INVITES } from "@/lib/mock-seller";

const LINK = "rezekii.com/s/seriliving";
const CODE = "SERI-4821";
/** Friends to set up for the referral bonus (sample goal; the bonus amount is set before launch). */
const GOAL = 5;

/**
 * Seller referral (owner, 29 Oct 2026, same layout as creators, option C): progress toward the next bonus with Share on top, then
 * who joined with the link. Sellers only invite sellers (owner, 30 Oct 2026); one counts once they connect Seller Center and fill in
 * their details.
 */
export default function SellerReferral() {
  const { toast } = useDemo();
  const [share, setShare] = useState(false);
  const [qr, setQr] = useState(false);
  const done = SELLER_INVITES.filter((i) => i.status === "Successful").length;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    toast(`${what} copied`);
  };

  return (
    <div className="v2-stack v2-in">
      <Title title="Referral" sub="Invite fellow sellers. You both earn credits once they're set up." />

      <section className="v2-card rf-hero">
        <div className="rf-goal">
          <b>{Math.min(done, GOAL)} of {GOAL} Friends</b>
          <small>{done >= GOAL ? "Bonus unlocked" : `${GOAL - done} more for a bonus`} <Tip text="Sellers count once they connect Seller Center and fill in their details. The bonus lands in your credit history." /></small>
        </div>
        <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
        <p className="rf-line">+{REFERRAL_REWARD.inviter} credits for you, +{REFERRAL_REWARD.friend} for your friend, once they&apos;re set up. Credits are not cash.</p>
        <button type="button" className="np-btn rf-share" onClick={() => setShare(true)}><Icon name="share" size={18} /> Share Invite</button>
        <div className="rf-acts">
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(`https://${LINK}`, "Link")}>Copy Link</button>
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(CODE, "Code")}>Copy Code</button>
          <button type="button" className="btn-outline v2-btn-sm" aria-expanded={qr} onClick={() => setQr((q) => !q)}><Icon name="qr" size={16} /> QR</button>
        </div>
        {qr && (
          <div className="rf-qr">
            <Qr />
            <span className="v2-small">Scan to join · {LINK} · code {CODE}</span>
          </div>
        )}
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Your Friends</h2>
          <span className="v2-small">{SELLER_INVITES.length} joined</span>
        </div>
        <div className="v2-divide rf-friends">
          {SELLER_INVITES.map((i) => {
            const ok = i.status === "Successful";
            return (
              <div key={i.name} className="cr2-person">
                <span className={`v2-av ${i.role === "Seller" ? "seller" : ""}`}>{i.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
                <span>
                  <b className="cr2-ellip">{i.name}</b>
                  <small>{i.role} · {ok ? `Joined ${i.when}` : i.note}</small>
                </span>
                {ok ? <span className="rf-pill ok">Successful</span> : <button type="button" className="rf-pill" onClick={() => toast(`Reminder sent to ${i.name}`)}>Nudge</button>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">How It Counts</h2>
        <ol className="cr2-rules">
          <li><span><b>Successful</b> means your friend connects Seller Center and fills in their details within 14 days.</span></li>
          <li><span><b>Last click wins.</b> Your link works for 14 days after the seller taps it. If they tap another seller&apos;s link after yours, that one counts, so share early.</span></li>
        </ol>
      </section>

      {share && (
        <ShareSheet
          onClose={() => setShare(false)}
          handle={SELLER.shop}
          label="Sell with creators on TikTok Shop"
          big="RM 0 a month"
          moment="invite"
          lines={["Commission only when you sell", `Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`]}
        />
      )}
    </div>
  );
}
