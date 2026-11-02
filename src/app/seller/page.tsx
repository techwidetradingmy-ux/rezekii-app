import { redirect } from "next/navigation";
import { currentUser } from "@/app/current-user";
import { SellerLanding } from "@/components/landing/seller-page";
import { ForceLight } from "@/components/landing/force-light";
import { getLang, tFor } from "@/lib/i18n/server";
import "@/app/seller.css";
import "@/app/creator1.css";
import "@/app/landing.css";

/** The tab title in her language (owner, 3 Nov 2026). */
export async function generateMetadata() {
  const t = tFor(await getLang());
  return { title: t("Rezekii · AI-Powered Affiliate Platform for Sellers") };
}

/** Seller site (owner, 29 Oct 2026): the page itself lives in components/landing/seller-page so it can keep its title here. */
export default async function SellerPage() {
  // Signed in (owner, 2 Nov 2026): straight into the seller app. Admins still see the site.
  const user = await currentUser();
  if (user && user.role !== "admin") redirect("/seller/app");
  return (
    <>
      <ForceLight />
      <SellerLanding />
    </>
  );
}
