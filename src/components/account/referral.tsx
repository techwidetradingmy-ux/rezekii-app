"use client";

import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Qr } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { ReferralOffer } from "@/components/referral-offer";
import { INVITES, REFERRAL_REWARD } from "@/lib/mock";
import "@/app/creator2.css";

const LINK = "rezekii.com/r/aisyah";
const CODE = "AISYAH8";

/** Referral (in My account, also one tap from the top bar): link, QR, who joined, and credits only for real successes. */
export function Referral() {
  const { toast } = useDemo();
  // Only people who signed up and linked their account (owner, 28 Oct 2026): username and date.
  const joined = INVITES.filter((i) => i.status.startsWith("Successful"));
  const successful = joined.length;
  const paid = INVITES.filter((i) => i.status.includes("paid")).length;

  const copy = (text: string, what: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {}
    toast(`${what} copied`);
  };

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <div className="acc-head"><span className="v2-small">Invite creators and sellers to earn credits.</span>
        <ShareButton big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`, "Free for creators and sellers"]} />
      </div>

      <ReferralOffer />

      <section className="v2-card">
        <div className="cr2-ref">
          <div className="v2-stack" style={{ gap: 14 }}>
            <div className="v2-field">
              Your link
              <span className="cr2-linkbox">
                <b>{LINK}</b>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => copy(`https://${LINK}`, "Link")}><Icon name="link" size={16} /> Copy</button>
              </span>
            </div>
            <div className="v2-field">
              Invite code
              <span className="cr2-linkbox">
                <b className="cr2-code">{CODE}</b>
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(CODE, "Code")}>Copy</button>
              </span>
            </div>
            <span className="v2-small">Sign-ups with your link or code are yours for good.</span>
          </div>
          <div className="cr2-qrwrap">
            <Qr />
            <span className="v2-small">Scan to join</span>
          </div>
        </div>
      </section>

      <section className="v2-card">
        <span className="v2-small" style={{ fontWeight: 800 }}>This month</span>
        <div className="cr2-big">
          <b><Count value={successful} /></b>
          <span>successful referrals</span>
        </div>
        <div className="cr2-funnel">
          <span><b>41</b>Clicked</span>
          <span><b>9</b>Signed up</span>
          <span><b>{successful}</b>Successful</span>
          <span><b>{paid}</b>Rewarded</span>
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">People you invited</h2>
          <span className="v2-small">{joined.length} people</span>
        </div>
        <div className="v2-divide">
          {joined.map((p) => (
            <div key={p.name} className="cr2-person">
              <span className={`v2-av ${p.role === "Seller" ? "seller" : ""}`}>{p.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
              <b className="cr2-ellip">{p.name}</b>
              <span className="v2-small">{p.when}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">How referral works</h2>
        <ol className="cr2-rules">
          <li><span><b>Sign-up link wins.</b> The link or code used at sign-up gets the referral. It can&apos;t change.</span></li>
          <li><span><b>Successful</b> means, within 30 days: a creator links TikTok Shop and scans, or a seller connects Seller Center and submits a product.</span></li>
          <li><span><b>Same reward for both.</b> +{REFERRAL_REWARD.inviter} credits for you, +{REFERRAL_REWARD.friend} for them.</span></li>
          <li><span><b>Sharing alone earns nothing.</b></span></li>
        </ol>
      </section>
    </div>
  );
}
