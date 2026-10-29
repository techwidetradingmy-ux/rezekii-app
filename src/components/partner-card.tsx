import "@/app/partner-card.css";
import Image from "next/image";

/** Not listed yet. When each app goes live, swap in the store's official badge, linked to the listing (their rules). */
const STORES = [
  {
    name: "App Store",
    logo: (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#ffffff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    ),
  },
  {
    name: "Google Play",
    logo: (
      <svg width="20" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#00c3ff" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z" />
        <path fill="#00e070" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z" />
        <path fill="#ffd400" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z" />
        <path fill="#ff3a44" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
      </svg>
    ),
  },
];

/**
 * Our badges as one small row inside both landing heroes (owner, 29 Oct 2026: simple, not a section of its own): official
 * TikTok Shop Partner App (listed in the Seller Center App Store since 21 Oct 2026), and App Store and Google Play coming soon.
 */
export function PartnerCard() {
  return (
    <p className="pc-row" aria-label="Official TikTok Shop Partner App. Coming soon to the App Store and Google Play.">
      <span className="pc-badge">
        <Image src="/tiktok-shop-partner-logo.png" alt="" width={69} height={20} />
      </span>
      <span className="pc-soon">
        {/* Just the logos (owner, 29 Oct 2026); the label says they're coming soon. */}
        {STORES.map((s) => <span key={s.name} className="pc-store" title={`${s.name}, coming soon`}>{s.logo}</span>)}
      </span>
    </p>
  );
}
