import type { Metadata } from "next";
import { campaignProducts, tapOverview } from "@/modules/admin/tap.ts";
import { requireAdmin } from "../guard";
import { TapAdminView } from "./tap-admin-view";

export const metadata: Metadata = { title: "Admin · TAP campaigns · Rezekii" };
export const dynamic = "force-dynamic";

/** Techwide's TAP campaigns and their products, as designed in the mockup (TAP). */
export default async function AdminTapPage() {
  await requireAdmin();
  const { asOf, campaigns } = await tapOverview();
  const first = campaigns[0];
  const products = first ? await campaignProducts(first.id) : [];
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <TapAdminView asOf={asOf} campaigns={campaigns} firstProducts={products} />
        </main>
      </div>
    </>
  );
}
