import "@/app/partner-card.css";
import Image from "next/image";
import { Icon } from "@/components/icons";

const POINTS = ["Verified by TikTok Shop", "Listed in the TikTok Shop App Store"];

/**
 * Partner card under both landing heroes (owner, 29 Oct 2026): only that we are official and verified. No company name, no
 * method, nothing about passwords. Rezekii is listed in the Seller Center App Store since 21 Oct 2026.
 */
export function PartnerCard() {
  return (
    <section className="pc-card" aria-label="Official TikTok Shop Partner App">
      <span className="pc-logo">
        <Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={150} height={44} />
      </span>
      <div className="pc-copy">
        <h2>Official TikTok Shop Partner App</h2>
        <ul>
          {POINTS.map((p) => (
            <li key={p}><Icon name="shield" size={16} width={2.4} />{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
