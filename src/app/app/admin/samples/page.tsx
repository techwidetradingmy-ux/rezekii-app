import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../current-user";
import { MANAGE_SAMPLES, QueueView } from "./queue-view";

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
          <p>Creators request free samples in TikTok through Techwide&apos;s TAP campaigns, straight from Rezekii. The status of each request comes from TikTok. Approve or reject them in <a href={MANAGE_SAMPLES} target="_blank" rel="noopener">TikTok Shop Partner Center · Manage samples</a> (To review tab, within 72 hours): TikTok doesn&apos;t let apps approve samples yet. Each request&apos;s button copies its product ID for the search box there.</p>
        </div>
        <QueueView />
      </main>
    </>
  );
}
