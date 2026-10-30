"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
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
/** The friends she brought in who are set up: they make the chain on the story card. */
const CHAIN = INVITES.filter((i) => i.linked && i.details).slice(0, 3);
const TONES = ["#00c073", "#2f80ed", "#8b5cf6"];

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
      {/* Our story first (owner, 30 Oct 2026): a community that grows by sharing. The chain is her, the friends she brought and an
          open seat for the next one; credits travel along it. */}
      <section className="rf-story">
        <div className="rf-chain" aria-hidden="true">
          <span className="rf-node me">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CREATOR.photo} alt="" />
          </span>
          {CHAIN.map((n, i) => (
            <Fragment key={n.name}>
              <i className="rf-link" style={{ ["--d" as string]: `${i * 0.5}s` }}><b /></i>
              <span className="rf-node" style={{ ["--c" as string]: TONES[i % TONES.length], ["--i" as string]: i + 1 }}>{n.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
            </Fragment>
          ))}
          <i className="rf-link" style={{ ["--d" as string]: `${CHAIN.length * 0.5}s` }}><b /></i>
          <span className="rf-node next"><Icon name="plus" size={18} width={2.6} /></span>
        </div>
        <div className="rf-story-body">
          <span>
            <small>Our Community</small>
            <h2>Good rezeki is meant to be <em>shared.</em></h2>
            <p>We built Rezekii so every creator, big or small, earns what they deserve. Know a friend who&apos;s still guessing? Bring them along and let&apos;s grow together.</p>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rf-story-rimau" src="/mascot/rimau-love.webp" alt="" />
        </div>
      </section>

      {/* Her invite code up front, like a pass (owner, 30 Oct 2026). */}
      <section className="v2-card rf-pass">
        <div className="rf-pass-top">
          <span>
            <small>Your Invite Code</small>
            <b>{CODE}</b>
          </span>
          <button type="button" className="rf-pass-copy" onClick={() => copy(CODE, "Code")}>Copy</button>
        </div>
        <div className="rf-pass-cut" aria-hidden="true" />
        <div className="rf-pass-body">
          <div className="rf-pass-gets">
            <span><b>+{REFERRAL_REWARD.inviter}</b> for you</span>
            <span><b>+{REFERRAL_REWARD.friend}</b> for your friend</span>
            <Tip text="Your friend counts once they link TikTok Shop and fill in their details within 14 days. Your link lasts 14 days, and the last link they tap wins, so share early." />
          </div>
          <ShareButton primary="Share Invite" big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`, "Free for creators"]} moment="invite" />
          <div className="rf-acts two">
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(`https://${LINK}`, "Link")}>Copy Link</button>
            <button type="button" className="btn-outline v2-btn-sm" aria-expanded={qr} onClick={() => setQr((q) => !q)}><Icon name="qr" size={16} /> QR</button>
          </div>
          {qr && (
            <div className="rf-qr">
              <Qr />
              <span className="v2-small">Scan to join · {LINK} · code {CODE}</span>
            </div>
          )}
          <div className="rf-goal">
            <b>{Math.min(done, GOAL)} of {GOAL} Friends</b>
            <small>{done >= GOAL ? "Bonus unlocked" : `${GOAL - done} more for a bonus`}</small>
          </div>
          <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
        </div>
      </section>

      {/* What the credits are for (owner, 30 Oct 2026). Only tools the app has; AI Video is not launched yet. */}
      <section className="v2-card rf-uses">
        <h2 className="v2-h2">What Credits Get You</h2>
        <div className="rf-use-grid">
          <span><i><Icon name="spark" size={18} /></i><b>AI Scripts</b><small>Video ideas and scripts</small></span>
          <span><i><Icon name="send" size={18} /></i><b>Post Everywhere</b><small>One video, many apps</small></span>
          <span><i><Icon name="video" size={18} /></i><b>AI Video</b><small>Coming soon</small></span>
        </div>
        <small className="rf-use-note">Credits aren&apos;t cash.</small>
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
          <li><span><b>Successful</b> means your friend links TikTok Shop and fills in their details within 14 days.</span></li>
          <li><span><b>Last click wins.</b> Your link works for 14 days after your friend taps it. If they tap another creator&apos;s link after yours, that one counts, so share early.</span></li>
          <li><span>Your credits show in your <Link href="/app/account#wallet" className="v2-link">Wallet</Link>.</span></li>
        </ol>
      </section>
    </div>
  );
}
