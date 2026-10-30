"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, Tip } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { INVITES, REFERRAL_REWARD } from "@/lib/mock";
import "@/app/creator2.css";

const LINK = "rezekii.com/r/aisyah";
const CODE = "AISYAH8";
/** Friends to set up for the referral bonus (sample goal; admin sets it). */
const GOAL = 5;

/**
 * Referral (owner, 29 Oct 2026, option C): progress toward the next bonus with Share as the main button on top, then who joined
 * with her link. A friend counts once they link TikTok Shop and fill in their details. Earnings per friend stay in her credit
 * history, so the list shows names and status only.
 */
export function Referral() {
  const { toast } = useDemo();
  const [qr, setQr] = useState(false);
  const done = INVITES.filter((i) => i.linked && i.details).length;
  const copy = (text: string, what: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {}
    toast(`${what} copied`);
  };

  return (
    <div className="v2-stack" style={{ gap: 16 }}>
      {/* One short card, not a big poster (owner, 30 Oct 2026, option A): Rimau, what you both get, progress and Invite. */}
      <section className="v2-card rf-strip">
        <div className="rf-strip-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rf-rimau" src="/mascot/rimau-party.webp" alt="" />
          <span className="rf-strip-main">
            <b>Invite Friends</b>
            <small><span>You both get <em>+{REFERRAL_REWARD.inviter}</em></span> <Tip text="Your friend counts once they link TikTok Shop and fill in their details. Your link lasts 14 days, and the last link they tap wins, so share early." /></small>
          </span>
          <ShareButton primary="Invite" big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`, "Free for creators"]} moment="invite" />
        </div>
        <div className="rf-goal">
          <b>{Math.min(done, GOAL)} of {GOAL} Friends</b>
          <small>{done >= GOAL ? "Bonus unlocked" : `${GOAL - done} more for a bonus`}</small>
        </div>
        <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
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
          <span className="v2-small">{INVITES.length} joined</span>
        </div>
        <div className="v2-divide rf-friends">
          {INVITES.map((p) => {
            const ok = p.linked && p.details;
            const next = !p.linked ? (p.role === "Seller" ? "Connect Seller Center" : "Link TikTok Shop") : "Fill in details";
            return (
              <div key={p.name} className="cr2-person">
                <span className={`v2-av ${p.role === "Seller" ? "seller" : ""}`}>{p.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
                <span><b className="cr2-ellip">{p.name}</b><small>{ok ? `Joined ${p.when}` : `Next: ${next}`}</small></span>
                <span className={`rf-pill${ok ? " ok" : ""}`}>{ok ? "Successful" : "Joining"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">How It Counts</h2>
        <ol className="cr2-rules">
          <li><span><b>Creators only.</b> Invite fellow creators. Sellers have their own referral.</span></li>
          <li><span><b>Successful</b> means your friend links TikTok Shop and fills in their details within 30 days.</span></li>
          <li><span><b>Last click wins.</b> Your link works for 14 days after your friend taps it. If they tap another creator&apos;s link after yours, that one counts, so share early.</span></li>
          <li><span>Your credits show in your <Link href="/app/account#wallet" className="v2-link">Wallet</Link>.</span></li>
        </ol>
      </section>
    </div>
  );
}
