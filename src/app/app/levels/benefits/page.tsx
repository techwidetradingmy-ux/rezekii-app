import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { benefits, levelPage } from "@/modules/levels/store.ts";
import { currentUser } from "../../../current-user";
import { BenefitsView } from "./benefits-view";

export const metadata: Metadata = { title: "Level benefits · Rezekii" };
export const dynamic = "force-dynamic";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

/** Level benefits, as designed in the mockup: what each level gets you; the one place Techwide edits benefits. */
export default async function BenefitsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [b, lv] = await Promise.all([benefits(), levelPage(user.id, user.tiktok_username)]);
  const next =
    lv.level === "bronze"
      ? `RM${n(lv.month?.sales ?? 0)} of RM1,000 in sales through Rezekii this month · ${lv.sampleVideos} of 10 sample videos`
      : lv.level === "silver" && lv.month
        ? `RM${n(lv.month.sales)} of RM1,000 in sales this month`
        : null;
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">Level benefits</h1>
            <p className="nv-sub">What each Rezekii level gets you · the one place Techwide edits benefits</p>
          </div>
          <BenefitsView initial={b.list} updatedAt={b.updatedAt} level={lv.level} isAdmin={user.role === "admin"} next={next} />
        </main>
      </div>
    </>
  );
}
