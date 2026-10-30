import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

/** Her connected Seller Center shop (owner, 31 Oct 2026): name, code, region and when it was connected; null when none. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const [shop] = (await (await supabaseRest(`seller_connections?connected_by=eq.${user.id}&select=shop_name,shop_code,region,connected_at,updated_at&order=updated_at.desc&limit=1`)).json()) as { shop_name: string; shop_code: string | null; region: string | null; connected_at: string; updated_at: string }[];
  return NextResponse.json({ shop: shop ?? null }, { headers: { "cache-control": "private, no-store" } });
}
