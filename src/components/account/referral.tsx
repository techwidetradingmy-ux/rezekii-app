"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, Tip } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { BrandLogo } from "@/components/brand-logos";
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
        {/* Our mission (owner, 30 Oct 2026): most tools are free, and sharing is a kind thank-you that keeps us building.
            Rimau sits beside the headline and the text runs full width, so no empty space. */}
        <div className="rf-story-body">
          <span className="rf-story-head">
            <small>Our Mission</small>
            <h2>Good rezeki is meant to be <em>shared.</em></h2>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rf-story-rimau" src="/mascot/rimau-parcel.webp" alt="" />
          <p>Rezekii is our little effort to help creators earn more, and most of it is free. If it helped you, share it with a friend. Your support keeps us building.</p>
          <span className="rf-values">
            <span><Icon name="gift" size={13} width={2.4} /> Most tools free</span>
            <span><Icon name="users" size={13} width={2.4} /> Built for the community</span>
          </span>
        </div>
      </section>

      {/* Her invite code up front, like a pass (owner, 30 Oct 2026). */}
      <section className="v2-card rf-pass">
        <div className="rf-pass-top">
          {/* An exclusive pass (owner, 30 Oct 2026): black and gold, with a light that sweeps across. */}
          <i className="rf-pass-shine" aria-hidden="true" />
          <span>
            <small><Icon name="gem" size={13} width={2.2} /> Your Exclusive Invite</small>
            <b>{CODE}</b>
          </span>
          <button type="button" className="rf-pass-copy" onClick={() => copy(CODE, "Code")}>Copy</button>
        </div>
        <div className="rf-pass-cut" aria-hidden="true" />
        <div className="rf-pass-body">
          {/* What each side gets, as a ticket torn down the middle (owner, 30 Oct 2026: the ticket design). */}
          <div className="rf-ticket">
            <span className="me"><b>+{REFERRAL_REWARD.inviter}</b><small>Credits for you</small></span>
            <span className="friend"><b>+{REFERRAL_REWARD.friend}</b><small>Credits for your friend</small></span>
          </div>
          <ShareButton primary="Share Invite" big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Use my code ${CODE}: +${REFERRAL_REWARD.friend} credits`, "Free for creators"]} moment="invite" invite={{ code: CODE, reward: REFERRAL_REWARD.friend, link: LINK, photo: CREATOR.photo, tag: "Free for creators" }} />
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
            <b>{Math.min(done, GOAL)} of {GOAL} Friends <Tip text="Your friend counts once they link TikTok Shop and fill in their details within 14 days. Your link lasts 14 days, and the last link they tap wins, so share early." /></b>
            <small>{done >= GOAL ? "Bonus unlocked" : `${GOAL - done} more for a bonus`}</small>
          </div>
          <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
        </div>
      </section>

      {/* What credits are for (owner, 30 Oct 2026): posting one video to many apps at once, for now. */}
      <section className="v2-card rf-uses">
        <h2 className="v2-h2">What Credits Get You</h2>
        <div className="rf-use-one">
          <i><Icon name="send" size={20} /></i>
          <span>
            <b>Post Everywhere</b>
            <small>One video to all your accounts at once</small>
          </span>
          <span className="rf-use-logos" aria-label="TikTok, Instagram, Facebook and Threads">
            {(["TikTok", "Instagram", "Facebook", "Threads"] as const).map((b) => <BrandLogo key={b} name={b} size={26} />)}
          </span>
        </div>
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
