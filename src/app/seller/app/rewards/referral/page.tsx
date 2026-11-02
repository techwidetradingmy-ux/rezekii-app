"use client";

import "@/app/seller.css";
import "@/app/creator2.css";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Qr, ShareSheet, Tip, Title, Loading, withParts } from "@/components/ui";
import { REFERRAL_REWARD, SELLER } from "@/lib/mock";
import { SELLER_INVITES } from "@/lib/mock-seller";
import { loadReferral, whenLabel, type LiveReferral } from "@/lib/live-rewards";
import { useLang, useT } from "@/lib/i18n/client";

const SAMPLE_LINK = "rezekii.com/s/seriliving";
const SAMPLE_CODE = "SERI-4821";
/** Friends to set up for the referral bonus (sample goal; the bonus amount is set before launch). */
const GOAL = 5;

/**
 * Seller referral (owner, 29 Oct 2026, same layout as creators, option C): progress toward the next bonus with Share on top, then
 * who joined with the link. Sellers only invite sellers (owner, 30 Oct 2026); one counts once they connect Seller Center and fill in
 * their details.
 */
export default function SellerReferral() {
  const { toast, live, me } = useDemo();
  const t = useT();
  const lang = useLang();
  const [share, setShare] = useState(false);
  const [qr, setQr] = useState(false);
  // Signed in (owner, 31 Oct 2026): the shop's real code, link and the sellers who joined with it.
  const [real, setReal] = useState<LiveReferral | null | "error">(null);
  useEffect(() => {
    if (live) loadReferral("seller").then(setReal).catch(() => setReal("error"));
  }, [live]);
  const r = live && real && real !== "error" ? real : null;
  const CODE = r?.code ?? SAMPLE_CODE;
  const LINK = r ? r.link.replace(/^https?:\/\//, "") : SAMPLE_LINK;
  const reward = r?.reward ?? REFERRAL_REWARD;
  const friends = r
    ? r.friends.map((f) => ({ name: f.name, role: "Seller", ok: f.successful, when: whenLabel(f.joined, t, lang), note: f.next ?? "" }))
    : SELLER_INVITES.map((i) => ({ name: i.name, role: i.role, ok: i.status === "Successful", when: i.when, note: i.note }));
  const done = friends.filter((f) => f.ok).length;
  const shop = r ? me?.sellerShop ?? t("My shop") : SELLER.shop;
  const copy = async (text: string, copied: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    toast(copied);
  };

  if (live && real === null) return <div className="v2-stack v2-in"><Loading text={t("Loading your invite…")} /></div>;
  if (live && real === "error") return <div className="v2-stack v2-in"><p className="v2-muted">{t("Couldn't load your invite. Please refresh.")}</p></div>;
  return (
    <div className="v2-stack v2-in">
      <Title title={t("Referral")} sub={t("Invite fellow sellers. You both earn credits once they're set up.")} />

      <section className="v2-card rf-hero">
        {/* The bonus for 5 friends isn't set yet, so real accounts don't see a goal (owner to decide the amount). */}
        {!r && (<>
        <div className="rf-goal">
          <b>{t("{done} of {goal} Friends", { done: Math.min(done, GOAL), goal: GOAL })}</b>
          <small>{done >= GOAL ? t("Bonus unlocked") : t("{n} more for a bonus", { n: GOAL - done })} <Tip text={t("Sellers count once they connect Seller Center. The bonus lands in your credit history.")} /></small>
        </div>
        <div className="rf-segs" aria-hidden="true">{Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < done ? "on" : undefined} />)}</div>
        </>)}
        <p className="rf-line">{t("+{you} credits for you, +{friend} for your friend, once they're set up. Credits are not cash.", { you: reward.inviter, friend: reward.friend })}</p>
        <button type="button" className="np-btn rf-share" onClick={() => setShare(true)}><Icon name="share" size={18} /> {t("Share Invite")}</button>
        <div className="rf-acts">
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(`https://${LINK}`, t("Link copied"))}>{t("Copy Link")}</button>
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => copy(CODE, t("Code copied"))}>{t("Copy Code")}</button>
          <button type="button" className="btn-outline v2-btn-sm" aria-expanded={qr} onClick={() => setQr((q) => !q)}><Icon name="qr" size={16} /> QR</button>
        </div>
        {qr && (
          <div className="rf-qr">
            <Qr value={r ? `https://${LINK}` : undefined} />
            <span className="v2-small">{t("Scan to join · {link} · code {code}", { link: LINK, code: CODE })}</span>
          </div>
        )}
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("Your Friends")}</h2>
          <span className="v2-small">{t("{n} joined", { n: friends.length })}</span>
        </div>
        <div className="v2-divide rf-friends">
          {friends.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>{t("No friends yet. Share your invite.")}</p>}
          {friends.map((i) => {
            const { ok } = i;
            return (
              <div key={i.name} className="cr2-person">
                <span className={`v2-av ${i.role === "Seller" ? "seller" : ""}`}>{i.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
                <span>
                  <b className="cr2-ellip">{i.name}</b>
                  <small>{t(i.role)} · {ok ? t("Joined {when}", { when: i.when }) : i.note}</small>
                </span>
                {ok ? <span className="rf-pill ok">{t("Successful")}</span> : r ? <span className="rf-pill">{t("Joining")}</span> : <button type="button" className="rf-pill" onClick={() => toast(t("Reminder sent to {name}", { name: i.name }))}>{t("Nudge")}</button>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">{t("How It Counts")}</h2>
        <ol className="cr2-rules">
          <li><span>{withParts(t("{successful} means your friend connects Seller Center within 14 days."), { successful: <b>{t("Successful")}</b> })}</span></li>
          <li><span>{withParts(t("{rule} Your link works for 14 days after the seller taps it. If they tap another seller's link after yours, that one counts, so share early."), { rule: <b>{t("Last click wins.")}</b> })}</span></li>
        </ol>
      </section>

      {share && (
        <ShareSheet
          onClose={() => setShare(false)}
          handle={shop}
          label={t("Sell with creators on TikTok Shop")}
          big={t("RM 0 a month")}
          moment="invite"
          lines={[t("Commission only when you sell"), t("Use my code {code}: +{n} credits", { code: CODE, n: reward.friend })]}
          invite={{ code: CODE, reward: reward.friend, link: LINK, kick: t("Sellers, you're invited"), tag: t("Commission only when you sell"), real: !!r }}
        />
      )}
    </div>
  );
}
