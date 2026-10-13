import type { Metadata } from "next";
import { teamDrafts } from "@/modules/admin/posts.ts";
import { SiteFooter, SiteNav } from "../../../site";
import { requireAdmin } from "../guard";
import { DraftsView } from "./drafts-view";

export const metadata: Metadata = { title: "Admin · Drafts · Rezekii" };
export const dynamic = "force-dynamic";

/** Drafts on Techwide's team accounts, as designed in the mockup (Drafts). */
export default async function AdminDraftsPage() {
  await requireAdmin();
  const drafts = await teamDrafts();
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <DraftsView drafts={drafts} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
