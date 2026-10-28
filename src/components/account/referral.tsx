"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Qr } from "@/components/ui";
import { ShareButton } from "@/components/creator2/bits";
import { INVITES } from "@/lib/mock";
import "@/app/creator2.css";

const LINK = "rezekii.com/r/aisyah";
const CODE = "AISYAH8";

const statusPill = (s: string) => (s.includes("paid") ? "badge" : s.includes("pending") ? "badge badge-amber" : "badge badge-gray");

/** Referral (in My account, also one tap from the top bar): link, QR, who joined, and credits only for real successes. */
export function Referral() {
  const { toast } = useDemo();
  const [reminded, setReminded] = useState<string[]>([]);
  const successful = INVITES.filter((i) => i.status.startsWith("Successful")).length;
  const paid = INVITES.filter((i) => i.status.includes("paid")).length;

  const copy = (text: string, what: string) => {
    try {
      void navigator.clipboard?.writeText(text).catch(() => {});
    } catch {}
    toast(`${what} copied`);
  };

  return (
    <div className="v2-stack" style={{ gap: 20 }}>
      <div className="acc-head"><span className="v2-small">Invite creators and sellers. Credits when it's a real success.</span>
        <ShareButton big="Join me on Rezekii" label="Better commission for your TikTok Shop showcase" lines={[`Invite code ${CODE}`, "Free for creators and sellers"]} />
      </div>

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
            <span className="v2-small">Whoever signs up with your link or code is yours for good. They get the code filled in for them.</span>
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
          <span className="v2-small">{INVITES.length} people</span>
        </div>
        <div className="v2-divide">
          {INVITES.map((p) => {
            const seller = p.role === "Seller";
            const waiting = p.status.startsWith("Signed up");
            return (
              <div key={p.name} className="cr2-person">
                <span className={`v2-av ${seller ? "seller" : ""}`}>{p.name.replace("@", "").slice(0, 2).toUpperCase()}</span>
                <span>
                  <b className="cr2-ellip">{p.name}</b>
                  <small>{p.role} · joined {p.when}</small>
                </span>
                <span className="v2-row" style={{ gap: 8 }}>
                  <span className={statusPill(p.status)}>{p.status}</span>
                  {waiting && (
                    reminded.includes(p.name)
                      ? <span className="v2-small">Reminded</span>
                      : <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setReminded((r) => [...r, p.name]); toast(`Reminder sent to ${p.name} in Rezekii`); }}>Remind</button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="v2-card flat">
        <h2 className="cr2-h3">How referral works</h2>
        <ol className="cr2-rules">
          <li><span><b>The link they sign up with wins.</b> Whoever&apos;s link or code someone uses to sign up gets the referral. It&apos;s locked for good and can&apos;t be changed later.</span></li>
          <li><span><b>A successful referral</b> means a creator links TikTok Shop and runs a first scan, or a seller connects Seller Center and submits a first product, within 30 days of signing up.</span></li>
          <li><span><b>Invite anyone.</b> You can invite creators and sellers. The reward is the same either way: +100 credits for each successful referral.</span></li>
          <li><span><b>Sharing alone earns nothing.</b> Only successful referrals do, so share when it actually helps someone.</span></li>
        </ol>
      </section>
    </div>
  );
}
