"use client";

import "@/app/seller.css";
import { LiveSellerConnect } from "@/components/seller/live-connect";

/**
 * Seller onboarding (owner, 31 Oct 2026: real, not a sample walk-through): sign in, agree to the sample terms, connect Seller
 * Center on TikTok, then the seller app.
 */
export default function SellerConnect() {
  return <LiveSellerConnect />;
}
