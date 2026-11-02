"use client";

import { Icon } from "@/components/icons";
import { REFERRAL_REWARD } from "@/lib/mock";
import { useT } from "@/lib/i18n/client";

/** Win-win referral offer (owner, 28 Oct 2026): what the inviter gets and what the friend gets, paid together once the friend is set up. */
export function ReferralOffer() {
  const t = useT();
  return (
    <section className="v2-card rf-card" aria-label={t("Referral rewards")}>
      <div className="rf-offer">
        <span className="rf-side">
          <small>{t("You get")}</small>
          <b>{t("+{n} credits", { n: REFERRAL_REWARD.inviter })}</b>
          <span>{t("per friend set up")}</span>
        </span>
        <span className="rf-plus" aria-hidden="true"><Icon name="plus" size={16} width={2.6} /></span>
        <span className="rf-side friend">
          <small>{t("Your friend gets")}</small>
          <b>{t("+{n} credits", { n: REFERRAL_REWARD.friend })}</b>
          <span>{t("for joining with your link")}</span>
        </span>
      </div>
      <p className="rf-note">{t("Paid when your friend is set up within 14 days.")}</p>
    </section>
  );
}
