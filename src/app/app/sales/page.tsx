import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { salesPage } from "@/modules/sales/page.ts";
import { lastOrderSync } from "@/modules/sales/summary.ts";
import { firstOrderDay } from "@/modules/sales/orders.ts";
import { currentUser } from "../../current-user";
import { SalesView } from "./sales-view";

export const metadata: Metadata = { title: "Sales · Rezekii" };
export const dynamic = "force-dynamic";

/** Sales, as chosen from the mockup (direction A): the creator's own TikTok Shop affiliate sales. */
export default async function SalesPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role === "admin") redirect("/app/admin/stats");
  const [d, syncedAt, first] = await Promise.all([salesPage(user.id), lastOrderSync(user.id), firstOrderDay(user.id)]);
  // TikTok gives the creator's whole order history: show how far back it goes.
  const since = first ? new Date(`${first}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <div>
          <h1 className="nv-title">Sales</h1>
          <p className="nv-sub">Your TikTok Shop affiliate sales, from your own orders{since ? ` · history from ${since}, your first order` : ""}</p>
        </div>
        <SalesView d={d} handle={user.tiktok_username} syncedAt={syncedAt} />
      </main>
    </div>
  );
}
