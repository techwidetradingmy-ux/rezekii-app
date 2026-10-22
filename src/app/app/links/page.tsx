import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { linkCounts } from "@/modules/tap/links.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../current-user";
import { tiktokProductUrl } from "../marketplace/format";
import { LinksView } from "./links-view";

export const metadata: Metadata = { title: "Link converter · Rezekii" };
export const dynamic = "force-dynamic";

/** The Link converter, as designed in the mockup. ?add=<product id> starts with that product's link (from Product lookup). */
export default async function LinksPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const { add } = await searchParams;
  const [linked, { week, all }, lang] = await Promise.all([
    accessFor(user.id).then((a) => a?.status === "approved"),
    linkCounts(user.id),
    getLang(),
  ]);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <LinksView
            handle={user.tiktok_username ? `@${user.tiktok_username}` : user.display_name || user.email || tFor(lang)("Your account")}
            linked={linked}
            weekCount={week}
            allCount={all}
            start={add && /^\d{6,25}$/.test(add) ? tiktokProductUrl(add) : ""}
          />
        </main>
      </div>
    </>
  );
}
