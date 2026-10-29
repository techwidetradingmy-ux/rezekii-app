/**
 * The small trust line under every main call to action on the landing pages (owner, 29 Oct 2026: people feel safer knowing
 * we're an official TikTok Shop partner). Not the badge row (PartnerCard); one quiet line. `dark` for dark cards.
 */
export function PartnerLine({ dark = false, center = false }: { dark?: boolean; center?: boolean }) {
  return (
    <p className={`lp-pline ${dark ? "dark" : ""} ${center ? "center" : ""}`}>
      <span className="lp-pline-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tiktok-shop-partner-logo.png" alt="" width={68} height={20} />
      </span>
      Official TikTok Shop Partner App
    </p>
  );
}
