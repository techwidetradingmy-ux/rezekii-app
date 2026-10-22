import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { todayData } from "@/modules/today/today.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../current-user";
import { TodayView } from "./today-view";

export const metadata: Metadata = { title: "Today · Rezekii" };
export const dynamic = "force-dynamic";

/** First signed-in page, as designed in the mockup (Main page). */
export default async function AppHome() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role === "admin") redirect("/app/admin");
  const lang = await getLang();
  const t = tFor(lang);
  const data = await todayData(user, lang);
  const name = (user.display_name || user.tiktok_username || user.email?.split("@")[0] || t("there")).split(" ")[0];
  const who = user.tiktok_username ? `@${user.tiktok_username}` : user.email;
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">{t("{hello}, {name}", { hello: data.hello, name })}</h1>
            <p className="nv-sub">{who ? `${who} · ` : ""}{data.day}</p>
          </div>
          <TodayView data={data} />
        </main>
      </div>
    </>
  );
}
