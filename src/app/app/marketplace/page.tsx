import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { mySamples } from "@/modules/tap/samples.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { MarketplaceView } from "./marketplace-view";

export const metadata: Metadata = { title: "TAP Marketplace · Rezekii" };
export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const open = (await mySamples(user.id)).filter((r) => r.status === "requested" || r.status === "applied").map((r) => r.product_id);
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>TAP Marketplace</span></nav>
        <div className="tap-intro">
          <h1>TAP Marketplace</h1>
          <p>Products in Techwide&apos;s TikTok Shop campaigns. Add one to your showcase to earn commission, or ask for a free sample first.</p>
        </div>
        <MarketplaceView requestedIds={open} />
      </main>
      <SiteFooter />
    </>
  );
}
