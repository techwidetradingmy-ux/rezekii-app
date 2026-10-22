import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { myTapRows } from "@/modules/tap/mytap.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../current-user";
import { pulled } from "../marketplace/format";
import { MyTapView } from "./my-tap-view";

export const metadata: Metadata = { title: "My Samples · Rezekii" };
export const dynamic = "force-dynamic";

/** My TAP products, as designed in the mockup: TikTok's campaign data for this creator plus their Rezekii sample requests. */
export default async function MyTapPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [{ rows, asOf }, lang] = await Promise.all([myTapRows(user.id, user.tiktok_username), getLang()]);
  const t = tFor(lang);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">{t("My Samples")}</h1>
            <p className="nv-sub">{t("Every Rezekii product you promote: sales, samples and posting status")}{asOf ? t(" · real TikTok data, pulled {date}", { date: pulled(asOf, lang) }) : ""}</p>
          </div>
          <MyTapView rows={rows} hasTikTok={!!user.tiktok_username} />
        </main>
      </div>
    </>
  );
}
