import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { benefits, levelPage } from "@/modules/levels/store.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../../current-user";
import { BenefitsView } from "./benefits-view";

export const metadata: Metadata = { title: "Level benefits · Rezekii" };
export const dynamic = "force-dynamic";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

/** Level benefits, as designed in the mockup: what each level gets you; the one place Techwide edits benefits. */
export default async function BenefitsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [b, lv, lang] = await Promise.all([benefits(), levelPage(user.id, user.tiktok_username), getLang()]);
  const t = tFor(lang);
  const next =
    lv.level === "bronze"
      ? t("RM{a} of RM1,000 in sales through Rezekii this month · {v} of 10 sample videos", { a: n(lv.month?.sales ?? 0), v: lv.sampleVideos })
      : lv.level === "silver" && lv.month
        ? t("RM{a} of RM1,000 in sales this month", { a: n(lv.month.sales) })
        : null;
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">{t("Level benefits")}</h1>
            <p className="nv-sub">{t("What each Rezekii level gets you · the one place Techwide edits benefits")}</p>
          </div>
          <BenefitsView initial={b.list} updatedAt={b.updatedAt} level={lv.level} isAdmin={user.role === "admin"} next={next} />
        </main>
      </div>
    </>
  );
}
