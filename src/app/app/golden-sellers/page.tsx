import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { allProducts, latestGolden } from "@/modules/tap/catalog.ts";
import { mySamples } from "@/modules/tap/samples.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../current-user";
import { pulled } from "../marketplace/format";
import { SellersView } from "./sellers-view";

export const metadata: Metadata = { title: "Golden Sellers · Rezekii" };
export const dynamic = "force-dynamic";

/** Golden Sellers, as designed in the mockup (opened from the Marketplace banner). */
export default async function GoldenSellersPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [{ shop = "" }, all, golden, samples, lang] = await Promise.all([searchParams, allProducts(), latestGolden(), mySamples(user.id), getLang()]);
  const t = tFor(lang);
  const shops = new Set(golden.map((g) => g.shop));
  const products = all.filter((p) => p.shop && shops.has(p.shop));
  const requested = samples.filter((r) => r.status === "requested" || r.status === "applied").map((r) => r.product_id);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 className="nv-title">{t("Golden Sellers")}</h1>
              <p className="nv-sub">{t("Our top 3 partner brands, ranked by sales through Rezekii · real data, pulled {date}", { date: pulled(all[0]?.asOf ?? null, lang) })}</p>
            </div>
            <Link href="/app/marketplace" className="nv-btn2 nv-press" style={{ height: 40, borderRadius: 999, fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              {t("Marketplace")}
            </Link>
          </div>
          <SellersView golden={golden} products={products} initialShop={shop} requestedIds={requested} />
        </main>
      </div>
    </>
  );
}
