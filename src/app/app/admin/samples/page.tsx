import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../current-user";
import { SiteFooter, SiteNav } from "../../../site";
import { QueueView } from "./queue-view";

export const metadata: Metadata = { title: "Sample queue · Rezekii" };
export const dynamic = "force-dynamic";

/** Techwide admins only: creators' free-sample requests to apply for in TikTok Shop. */
export default async function SampleQueuePage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role !== "admin") redirect("/app");
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>Sample queue</span></nav>
        <div className="tap-intro">
          <h1>Sample queue</h1>
          <p>Apply for each sample in TikTok Shop Partner Center, then mark it applied here. The creator sees the status and any note.</p>
        </div>
        <QueueView />
      </main>
      <SiteFooter />
    </>
  );
}
