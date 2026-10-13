import type { Metadata } from "next";
import { creatorsPage } from "@/modules/admin/creators.ts";
import { requireAdmin } from "../guard";
import { CreatorsView } from "./creators-view";

export const metadata: Metadata = { title: "Admin · Creators · Rezekii" };
export const dynamic = "force-dynamic";

/** Creator accounts, as designed in the mockup (Creators). */
export default async function AdminCreatorsPage() {
  await requireAdmin();
  const { creators, places, auto, now } = await creatorsPage();
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <CreatorsView creators={creators} places={places} auto={auto} now={now} />
        </main>
      </div>
    </>
  );
}
