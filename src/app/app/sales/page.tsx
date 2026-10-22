import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { salesFrame } from "@/modules/sales/frames.ts";
import { dateLocale } from "@/lib/i18n/lang.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
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
  const lang = await getLang();
  const t = tFor(lang);
  const d = await salesFrame(user.id, "30d", "all", "none", undefined, lang);
  // TikTok gives the creator's whole order history: show how far back it goes.
  const since = d?.first ? new Date(d.first).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null;
  return (
    <div className="nv nv-page">
      <main className="site-wrap app-main nv-main">
        <div>
          <h1 className="nv-title">{t("Sales")}</h1>
          <p className="nv-sub">{t("Your TikTok Shop affiliate sales, from your own orders")}{since ? t(" · history from {date}, your first order", { date: since }) : ""}</p>
        </div>
        {d && <SalesView initial={d} handle={user.tiktok_username} photo={myPhoto(user)} />}
      </main>
    </div>
  );
}
