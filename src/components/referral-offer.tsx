"use client";

import { Icon } from "@/components/icons";
import { REFERRAL_REWARD } from "@/lib/mock";

/** Win-win referral offer (owner, 28 Oct 2026): what the inviter gets and what the friend gets, paid together once the friend is set up. */
export function ReferralOffer() {
  return (
    <section className="v2-card rf-card" aria-label="Referral rewards">
      <div className="rf-offer">
        <span className="rf-side">
          <small>You get</small>
          <b>+{REFERRAL_REWARD.inviter} credits</b>
          <span>per friend set up</span>
        </span>
        <span className="rf-plus" aria-hidden="true"><Icon name="plus" size={16} width={2.6} /></span>
        <span className="rf-side friend">
          <small>Your friend gets</small>
          <b>+{REFERRAL_REWARD.friend} credits</b>
          <span>for joining with your link</span>
        </span>
      </div>
      <p className="rf-note">Paid when your friend is set up within 14 days.</p>
    </section>
  );
}
