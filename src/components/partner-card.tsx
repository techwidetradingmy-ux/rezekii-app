import "@/app/partner-card.css";
import Image from "next/image";
import { Icon } from "@/components/icons";

/** Not listed yet. When each app goes live, swap in the store's official badge, linked to the listing (their rules). */
const STORES = ["App Store", "Google Play"];

/**
 * All our badges in one row, under both landing heroes (owner, 29 Oct 2026): official TikTok Shop Partner App (listed in the
 * Seller Center App Store since 21 Oct 2026), and coming soon to the App Store and Google Play. Always dark, like store badges.
 */
export function PartnerCard() {
  return (
    <section className="pc-row" aria-label="Official TikTok Shop Partner App. Coming soon to the App Store and Google Play.">
      <span className="pc-badge">
        <Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={103} height={30} />
        <span className="pc-t"><small>Verified</small>Official App</span>
      </span>
      {STORES.map((s) => (
        <span key={s} className="pc-badge soon">
          <Icon name="phone" size={22} />
          <span className="pc-t"><small>Coming soon to</small>{s}</span>
        </span>
      ))}
    </section>
  );
}
