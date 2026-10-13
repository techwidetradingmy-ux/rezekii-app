import type { Metadata } from "next";
import { creatorsPage } from "@/modules/admin/creators.ts";
import { SiteFooter, SiteNav } from "../../../site";
import { requireAdmin } from "../guard";
import { CreatorsView } from "./creators-view";

export const metadata: Metadata = { title: "Admin · Creators · Rezekii" };
export const dynamic = "force-dynamic";

/** Creator accounts, as designed in the mockup (Creators). */
export default async function AdminCreatorsPage() {
  await requireAdmin();
  const { creators, places, now } = await creatorsPage();
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <CreatorsView creators={creators} places={places} now={now} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
