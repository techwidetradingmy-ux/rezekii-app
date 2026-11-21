import "@/app/admin.css";
import { savedVideos } from "@/modules/admin/videos.ts";
import { AdminVideoStats } from "@/components/admin/posting";
import { adminOnly } from "../../guard";

export const dynamic = "force-dynamic";

/** Admin › Posting › Video Stats (as on rezekii.com). 180 days are read for the 90-day comparison. */
export default async function PostingStats() {
  await adminOnly();
  const { rows, refreshedAt, now } = await savedVideos(180);
  return <AdminVideoStats rows={rows} refreshedAt={refreshedAt} now={now} />;
}
