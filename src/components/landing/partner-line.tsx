/**
 * The small trust line under every main call to action on the landing pages (owner, 29 Oct 2026: people feel safer knowing
 * we're an official TikTok Shop partner). Our logo and the partner badge side by side, the badge unchanged, then the words.
 * Not the badge row (PartnerCard).
 */
export function PartnerLine({ center = false }: { center?: boolean }) {
  return (
    <p className={`lp-pline ${center ? "center" : ""}`}>
      <span className="lp-pline-pair">
        <span className="lp-pline-rz">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/master-logo-transparent.png" alt="" width={22} height={22} />
          Rezekii
        </span>
        <i aria-hidden="true" />
        <span className="lp-pline-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={68} height={20} />
        </span>
      </span>
      <span className="lp-pline-t">Official TikTok Shop Partner App</span>
    </p>
  );
}
