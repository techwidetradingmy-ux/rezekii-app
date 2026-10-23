import Link from "next/link";
import { tx, type T } from "@/lib/i18n/lang.ts";
import type { ShopStatus } from "@/modules/creator-accounts/access.ts";

const TEXT: Record<Exclude<ShopStatus, "ready">, [string, string]> = {
  none: [tx("Link your TikTok Shop to make affiliate links, add products to your showcase and request free samples."), tx("Link TikTok Shop")],
  invited: [tx("A place freed up for you. Link your TikTok Shop to make affiliate links, add products to your showcase and request free samples."), tx("Link TikTok Shop")],
  waiting: [tx("Techwide is checking your TikTok Shop link. Affiliate links, showcase and samples turn on once it's approved."), tx("See status")],
  waitlist: [tx("You're on the waitlist for a TikTok Shop place. Affiliate links, showcase and samples turn on once you can link it."), tx("See status")],
  rejected: [tx("Your TikTok Shop link wasn't approved. You can link it again to ask again."), tx("See status")],
};

/**
 * Creator pages work without TikTok Shop (owner, 23 Oct 2026); until it's linked and approved, this says what it unlocks
 * and leads to Getting set up.
 */
export function ShopBanner({ status, t }: { status: ShopStatus; t: T }) {
  if (status === "ready") return null;
  const [text, button] = TEXT[status];
  return (
    <div className="nv nv-page">
      <div className="site-wrap">
        <div className="shop-banner" role="note">
          <span>{t(text)}</span>
          <Link href="/onboarding">{t(button)}</Link>
        </div>
      </div>
    </div>
  );
}
