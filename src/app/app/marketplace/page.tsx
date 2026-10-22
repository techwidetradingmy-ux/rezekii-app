import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { browse, latestGolden } from "@/modules/tap/catalog.ts";
import { productsFor } from "@/modules/tap/for-creator.ts";
import { mySamples } from "@/modules/tap/samples.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { currentUser } from "../../current-user";
import { pulled } from "./format";
import { MarketplaceView } from "./marketplace-view";

export const metadata: Metadata = { title: "Marketplace · Rezekii" };
export const dynamic = "force-dynamic";

/** Every product in Techwide's live TAP campaigns, as designed in the mockup. The first page is rendered here so it shows at once. */
export default async function MarketplacePage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const [initial, golden, samples, lang] = await Promise.all([productsFor(user.id).then((all) => browse(all, {})), latestGolden(), mySamples(user.id), getLang()]);
  const t = tFor(lang);
  const requested = samples.filter((r) => r.status === "requested" || r.status === "applied").map((r) => r.product_id);
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div>
            <h1 className="nv-title">{t("Marketplace")}</h1>
            <p className="nv-sub">{t("Every product on Rezekii, from TikTok Shop · real data, pulled {date}", { date: pulled(initial.asOf, lang) })}</p>
          </div>
          <MarketplaceView initial={initial} golden={golden} requestedIds={requested} />
        </main>
      </div>
    </>
  );
}
