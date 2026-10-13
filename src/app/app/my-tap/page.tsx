import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { mySamples } from "@/modules/tap/samples.ts";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { MyTapView } from "./my-tap-view";

export const metadata: Metadata = { title: "My TAP products · Rezekii" };
export const dynamic = "force-dynamic";

/** My TAP products, as designed in the mockup. */
export default async function MyTapPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const rows = await mySamples(user.id);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">My TAP products</h1>
            <p className="nv-sub">Every Rezekii product you promote: sales, samples and posting status</p>
          </div>
          <MyTapView rows={rows} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
