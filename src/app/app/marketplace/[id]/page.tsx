import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProduct } from "@/modules/tap/catalog.ts";
import { mySamples } from "@/modules/tap/samples.ts";
import { currentUser } from "../../../current-user";
import { SiteFooter, SiteNav } from "../../../site";
import { ProductView } from "../product-view";

export const metadata: Metadata = { title: "Product · TAP Marketplace · Rezekii" };
export const dynamic = "force-dynamic";

/** One Marketplace product on its own page (shareable, and where links from other screens land). Same view as the Marketplace panel. */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const requested = (await mySamples(user.id)).some((r) => r.product_id === id && (r.status === "requested" || r.status === "applied"));
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb">
          <Link href="/app">Today</Link><span aria-hidden="true">›</span><Link href="/app/marketplace">TAP Marketplace</Link><span aria-hidden="true">›</span><span>Product</span>
        </nav>
        <section className="card tap-page">
          <ProductView p={product} requested={requested} standalone />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
