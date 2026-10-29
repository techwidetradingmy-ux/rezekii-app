import { SellerLanding } from "@/components/landing/seller-page";
import { ForceLight } from "@/components/landing/force-light";
import "@/app/seller.css";
import "@/app/creator1.css";
import "@/app/landing.css";

export const metadata = { title: "Rezekii · AI-Powered Affiliate Platform for Sellers" };

/** Seller site (owner, 29 Oct 2026): the page itself lives in components/landing/seller-page so it can keep its title here. */
export default function SellerPage() {
  return (
    <>
      <ForceLight />
      <SellerLanding />
    </>
  );
}
