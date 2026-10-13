import type { Metadata } from "next";
import { calendar } from "@/modules/admin/posts.ts";
import { postingTimes } from "@/modules/posting/times.ts";
import { SiteFooter, SiteNav } from "../../../site";
import { requireAdmin } from "../guard";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Admin · Calendar · Rezekii" };
export const dynamic = "force-dynamic";

/** Every post on every account, as designed in the mockup (Calendar). ?week=-1 etc.; ?post=<id> opens one; ?account=<open id> filters. */
export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; post?: string; account?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const offset = Math.max(-52, Math.min(52, Math.trunc(Number(q.week) || 0)));
  const [{ week, posts, now }, times] = await Promise.all([calendar(offset), postingTimes()]);
  return (
    <>
      <SiteNav variant="app" />
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <CalendarView key={offset} week={week} posts={posts} now={now} times={times} startPost={q.post ?? null} startAccount={q.account ?? null} />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
