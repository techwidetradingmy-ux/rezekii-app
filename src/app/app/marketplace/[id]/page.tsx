import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/modules/tap/catalog.ts";
import { mySamples } from "@/modules/tap/samples.ts";
import { currentUser } from "../../../current-user";
import { ProductPageView } from "../product-page-view";

export const metadata: Metadata = { title: "Product · Rezekii" };
export const dynamic = "force-dynamic";

/** One TAP product on its own page, as designed in the mockup (same product view as the Marketplace panel). */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const { id } = await params;
  const [product, samples] = await Promise.all([getProduct(id), mySamples(user.id)]);
  if (!product) notFound();
  const requested = samples.some((r) => r.product_id === id && (r.status === "requested" || r.status === "applied"));
  return (
    <>
      <div className="nv nv-page">
        <main className="site-wrap app-main nv-main">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 className="nv-title">Product</h1>
              <p className="nv-sub">On Rezekii · details from TikTok Shop · the same product view as the Marketplace</p>
            </div>
            <Link href="/app/marketplace" className="nv-btn2 nv-press" style={{ height: 40, borderRadius: 999, fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              Marketplace
            </Link>
          </div>
          <ProductPageView p={product} requested={requested} />
        </main>
      </div>
    </>
  );
}
