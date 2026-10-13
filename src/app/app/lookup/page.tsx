import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { allProducts } from "@/modules/tap/catalog.ts";
import { getAffiliateConnection } from "@/modules/creator-accounts/affiliate-connections.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { tiktokProductUrl } from "../marketplace/format";
import { LookupView } from "./lookup-view";

export const metadata: Metadata = { title: "Product Lookup · Rezekii" };
export const dynamic = "force-dynamic";

/** Product Lookup, as designed in the mockup. Sample links are the 5 best-selling TAP products. */
export default async function LookupPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [linked, all] = await Promise.all([
    user.tiktok_username ? getAffiliateConnection(user.tiktok_username).then((c) => !!c).catch(() => false) : false,
    allProducts(),
  ]);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">Product Lookup</h1>
            <p className="nv-sub">Get any TikTok product&apos;s facts from TikTok Shop&apos;s official API · no scraping</p>
          </div>
          <LookupView linked={linked} samples={all.slice(0, 5).map((p) => tiktokProductUrl(p.id))} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
