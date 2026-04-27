/**
 * GET /api/tiktok/products
 * Proxy to TikTok Shop affiliate product listing.
 * Returns mock data when credentials are not configured.
 */

import { NextResponse } from "next/server";
import { getProducts, isConfigured } from "@/lib/tiktok-shop";

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({
      success: true,
      mock:    !isConfigured(),
      count:   products.length,
      data:    products,
    });
  } catch (err) {
    console.error("[/api/tiktok/products] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
