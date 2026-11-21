import "@/app/admin.css";
import { calendar } from "@/modules/admin/posts.ts";
import { postingTimes } from "@/modules/posting/times.ts";
import { AdminCalendar } from "@/components/admin/posting";
import { adminOnly } from "../guard";

export const dynamic = "force-dynamic";

/** Admin › Posting › Calendar (as on rezekii.com): every TikTok post, by week. ?week=-1 etc.; ?account=<open id> shows one account. */
export default async function PostingCalendar({ searchParams }: { searchParams: Promise<{ week?: string; account?: string }> }) {
  await adminOnly();
  const q = await searchParams;
  const offset = Math.max(-52, Math.min(52, Math.trunc(Number(q.week) || 0)));
  const [{ week, posts, now }, times] = await Promise.all([calendar(offset), postingTimes()]);
  return <AdminCalendar key={offset} week={week} posts={posts} now={now} times={times} account={q.account} />;
}
