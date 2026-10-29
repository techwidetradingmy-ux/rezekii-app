import "@/app/partner-card.css";
import Image from "next/image";
import { Icon } from "@/components/icons";

const POINTS = ["Listed in the TikTok Shop App Store", "Built by Techwide Marketing", "Never asks for your password"];

/** Partner card under both landing heroes (owner, 29 Oct 2026). Rezekii is listed in the Seller Center App Store since 21 Oct. */
export function PartnerCard() {
  return (
    <section className="pc-card" aria-label="Official TikTok Shop Partner App">
      <span className="pc-logo">
        <Image src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" width={120} height={35} />
      </span>
      <div className="pc-copy">
        <h2>Official TikTok Shop Partner App</h2>
        <ul>
          {POINTS.map((p) => (
            <li key={p}><Icon name="check" size={14} width={3} />{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
