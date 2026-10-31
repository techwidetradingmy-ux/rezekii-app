"use client";

import "@/app/seller.css";
import { RegisterProducts } from "@/components/seller/register-products";

/**
 * Register Products (owner, 31 Oct 2026). Picking products and the commission happen once, in Seller Center, in the shop's own
 * Techwide campaign; Rezekii no longer asks for them first (that made sellers do it twice).
 */
export default function SubmitProducts() {
  return <RegisterProducts />;
}
