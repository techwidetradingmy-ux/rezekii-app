import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../current-user";
import { QueueView } from "./queue-view";

export const metadata: Metadata = { title: "Sample requests · Rezekii" };
export const dynamic = "force-dynamic";

/** Techwide admins only: free samples creators asked for through Rezekii, with TikTok's live status. */
export default async function SampleQueuePage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role !== "admin") redirect("/app");
  return (
    <>
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>Sample requests</span></nav>
        <div className="tap-intro">
          <h1>Sample requests</h1>
          <p>Creators request free samples in TikTok through Techwide&apos;s TAP campaigns, straight from Rezekii. The status of each request comes from TikTok; approve or decline them in <a href="https://partner.tiktokshop.com" target="_blank" rel="noopener">TikTok Shop Partner Center</a>.</p>
        </div>
        <QueueView />
      </main>
    </>
  );
}
