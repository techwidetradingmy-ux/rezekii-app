import type { Metadata } from "next";
import { savedVideos } from "@/modules/admin/videos.ts";
import { requireAdmin } from "../guard";
import { StatsView } from "./stats-view";

export const metadata: Metadata = { title: "Admin · Video stats · Rezekii" };
export const dynamic = "force-dynamic";

/** Video stats for every connected account, as designed in the mockup (Stats). 180 days are read for the 90-day comparison. */
export default async function AdminStatsPage() {
  await requireAdmin();
  const { rows, refreshedAt, now } = await savedVideos(180);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <StatsView rows={rows} refreshedAt={refreshedAt} now={now} />
        </main>
      </div>
    </>
  );
}
