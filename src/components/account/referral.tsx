"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, Tip } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { CREATOR, INVITES, REFERRAL_REWARD } from "@/lib/mock";
import "@/app/creator2.css";

const LINK = "rezekii.com/r/aisyah";
const CODE = "AISYAH8";
/** Friends to set up for the referral bonus (sample goal; admin sets it). */
const GOAL = 5;
/** Friends around her on the banner: where each bubble sits and its colour. */
const FRIENDS = INVITES.slice(0, 4).map((f, i) => ({ name: f.name, ...[{ x: "14%", y: "26%", c: "#00c073" }, { x: "86%", y: "22%", c: "#2f80ed" }, { x: "18%", y: "80%", c: "#ffb400" }, { x: "84%", y: "78%", c: "#8b5cf6" }][i] }));

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
      {/* The program as a poster, in place of her profile (owner, 30 Oct 2026): you in the middle, friends joining, credits flying. */}
      <section className="rf-banner">
        <div className="rf-art" aria-hidden="true">
          <span className="rf-orbit" />
          {FRIENDS.map((f, i) => (
            <span key={f.name} className="rf-friend" style={{ ["--x" as string]: f.x, ["--y" as string]: f.y, ["--c" as string]: f.c, ["--d" as string]: `${i * 0.35}s` }}>
              {f.name.replace("@", "").slice(0, 2).toUpperCase()}
              <em>+{REFERRAL_REWARD.friend}</em>
            </span>
          ))}
          <span className="rf-me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CREATOR.photo} alt="" />
          </span>
          <span className="rf-gift"><Icon name="gift" size={22} width={2.2} /></span>
          <i className="rf-spark s1" /><i className="rf-spark s2" /><i className="rf-spark s3" />
        </div>
        <small>Referral Program</small>
        <h2>Invite Friends.<br /><em>Earn Together.</em></h2>
        <p>Do a friend a favour: they can check their showcase for better rates too.</p>
        <span className="rf-banner-chips">
          <span><b>+{REFERRAL_REWARD.inviter}</b> for you</span>
          <span><b>+{REFERRAL_REWARD.friend}</b> for your friend</span>
        </span>
        {/* Attribution (owner, 30 Oct 2026): a link lasts 14 days and the last one tapped wins. */}
        <span className="rf-banner-note"><Icon name="clock" size={14} width={2.4} /> Links last 14 days and the last one tapped wins. Share early.</span>
      </section>
      <section className="v2-card rf-hero">
        <div className="rf-goal">
          <b>{Math.min(done, GOAL)} of {GOAL} Friends</b>
          <small>{done >= GOAL ? "Bonus unlocked" : `${GOAL - done} more for a bonus`} <Tip text="Friends count once they link TikTok Shop and fill in their details. The bonus lands in your credit history." /></small>
        </div>
        <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
        <p className="rf-line">+{REFERRAL_REWARD.inviter} credits for you, +{REFERRAL_REWARD.friend} for your friend, once they&apos;re set up.</p>
        <ShareButton primary="Share Invite" big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`, "Free for creators"]} moment="invite" />
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
