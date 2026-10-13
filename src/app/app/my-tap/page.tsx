import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { myTapRows } from "@/modules/tap/mytap.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { pulled } from "../marketplace/format";
import { MyTapView } from "./my-tap-view";

export const metadata: Metadata = { title: "My TAP products · Rezekii" };
export const dynamic = "force-dynamic";

/** My TAP products, as designed in the mockup: TikTok's campaign data for this creator plus their Rezekii sample requests. */
export default async function MyTapPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const { rows, asOf } = await myTapRows(user.id, user.tiktok_username);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">My TAP products</h1>
            <p className="nv-sub">Every Rezekii product you promote: sales, samples and posting status{asOf ? ` · real TikTok data, pulled ${pulled(asOf)}` : ""}</p>
          </div>
          <MyTapView rows={rows} hasTikTok={!!user.tiktok_username} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
