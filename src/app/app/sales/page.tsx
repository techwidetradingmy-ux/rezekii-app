import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { salesFrame } from "@/modules/sales/frames.ts";
import { currentUser } from "../../current-user";
import { myPhoto } from "@/modules/photos/store.ts";
import { SalesView } from "./sales-view";

export const metadata: Metadata = { title: "Sales · Rezekii" };
export const dynamic = "force-dynamic";

/** Sales, as chosen from the mockup (direction A): the creator's own TikTok Shop affiliate sales. */
export default async function SalesPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role === "admin") redirect("/app/admin/stats");
  const [d, photo] = await Promise.all([salesFrame(user.id, "30d", "all", "none"), myPhoto(user)]);
  // TikTok gives the creator's whole order history: show how far back it goes.
  const since = d?.first ? new Date(d.first).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null;
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <div>
          <h1 className="nv-title">Sales</h1>
          <p className="nv-sub">Your TikTok Shop affiliate sales, from your own orders{since ? ` · history from ${since}, your first order` : ""}</p>
        </div>
        {d && <SalesView initial={d} handle={user.tiktok_username} photo={photo} />}
      </main>
    </div>
  );
}
