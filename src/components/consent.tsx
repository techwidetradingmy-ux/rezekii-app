"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo, type Role } from "@/components/demo";
import { Sheet, withParts } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** The versions a person agrees to; saved with their consent record. */
export const VERSIONS = { terms: "1.0", privacy: "1.0", date: "28 Oct 2026" };

/** What each side lets Rezekii read from TikTok Shop, in the words shown before linking (English here, shown in her language). */
export const SCOPES: Record<Role, string[]> = {
  creator: [tx("Showcase products and rates"), tx("Affiliate orders and commission"), tx("Payouts and settlements"), tx("Your creator level"), tx("Sample requests"), tx("LIVE data (when each LIVE started and ended)")],
  seller: [tx("Shop and product info"), tx("Orders and sales for TAP products"), tx("Campaigns you submit")],
};
const WHY: Record<Role, string> = {
  creator: tx("To show your earnings and Techwide extra, find better rates and track missions."),
  seller: tx("To fill in your products, run your TAP campaigns and track samples and sales."),
};

/**
 * Asked before TikTok Shop is linked (blueprint, PDPA): what Rezekii reads, why, what it never does, how to unlink, and
 * a tick for the Terms and Privacy Policy. The record of who agreed, when, to which versions and permissions is saved.
 */
export function ConsentSheet({ role, onAgree, onClose }: { role: Role; onAgree: () => void; onClose: () => void }) {
  const t = useT();
  const [tick, setTick] = useState(false);
  return (
    <Sheet title={role === "creator" ? t("Before You Link TikTok Shop") : t("Before You Connect Seller Center")} onClose={onClose}>
      <div className="cs-block">
        <b><Icon name="eye" size={17} /> {t("What Rezekii reads")}</b>
        <ul>{SCOPES[role].map((s) => <li key={s}>{t(s)}</li>)}</ul>
      </div>
      <div className="cs-block">
        <b><Icon name="spark" size={17} /> {t("Why")}</b>
        <p>{t(WHY[role])}</p>
      </div>
      <div className="cs-block">
        <b><Icon name="shield" size={17} /> {t("What we never do")}</b>
        <ul>
          <li>{role === "creator" ? t("Share your earnings or orders without asking you first") : t("Share your sales without asking you first")}</li>
          <li>{t("Sell your data or use it for anything else")}</li>
          <li>{t("Post, change prices or handle orders on your behalf")}</li>
        </ul>
      </div>
      <div className="cs-block">
        <b><Icon name="refresh" size={17} /> {t("Unlink any time")}</b>
        <p>{t("In My account, Connections. We stop at once and delete your data within 30 days, except records the law requires.")}</p>
      </div>
      {/* TikTok Shop's page lets her untick permissions; LIVE data is the one people miss (owner, 3 Nov 2026). */}
      {role === "creator" && <p className="v2-small cs-note"><Icon name="info" size={14} /> {t("On TikTok Shop's page, keep every box ticked, including LIVE data.")}</p>}
      <label className="cs-tick">
        <input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} />
        <span>
          {withParts(t("I agree to the {terms} (v{termsVersion}) and {privacy} (v{privacyVersion}), and let Rezekii read the data above."), {
            terms: <a href="#" onClick={(e) => e.preventDefault()}>{t("Terms of Service")}</a>,
            termsVersion: VERSIONS.terms,
            privacy: <a href="#" onClick={(e) => e.preventDefault()}>{t("Privacy Policy")}</a>,
            privacyVersion: VERSIONS.privacy,
          })}
        </span>
      </label>
      <button type="button" className="np-btn" disabled={!tick} onClick={onAgree}>
        {role === "creator" ? t("Agree and link TikTok Shop") : t("Agree and connect")}
      </button>
      <button type="button" className="btn-outline" onClick={onClose}>{t("Not Now")}</button>
      <p className="v2-small" style={{ margin: 0 }}>{t("We save a record of this consent (time, versions, permissions).")}</p>
    </Sheet>
  );
}

/** Shows the creator consent sheet whenever something asks to link TikTok Shop without a consent on record. */
export function ConsentGate() {
  const { asking, agree, cancelLink } = useDemo();
  if (!asking) return null;
  return <ConsentSheet role={asking} onAgree={agree} onClose={cancelLink} />;
}
