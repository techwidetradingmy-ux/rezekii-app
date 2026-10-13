import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAffiliateConnection } from "@/modules/creator-accounts/affiliate-connections.ts";
import { linkCounts } from "@/modules/tap/links.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { tiktokProductUrl } from "../marketplace/format";
import { LinksView } from "./links-view";

export const metadata: Metadata = { title: "Link converter · Rezekii" };
export const dynamic = "force-dynamic";

/** The Link converter, as designed in the mockup. ?add=<product id> starts with that product's link (from Product lookup). */
export default async function LinksPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const { add } = await searchParams;
  const [linked, { week, all }] = await Promise.all([
    user.tiktok_username ? getAffiliateConnection(user.tiktok_username).then((c) => !!c).catch(() => false) : false,
    linkCounts(user.id),
  ]);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <LinksView
            handle={user.tiktok_username ? `@${user.tiktok_username}` : user.display_name || user.email || "Your account"}
            linked={linked}
            weekCount={week}
            allCount={all}
            start={add && /^\d{6,25}$/.test(add) ? tiktokProductUrl(add) : ""}
          />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
