import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { linkShareReport, type LinkRef } from "@/modules/tap/link-share.ts";

export const dynamic = "force-dynamic";

/**
 * The signed-in creator's link history (newest first, up to 1,000), each link's link-share sales (`perf`, by link), the
 * link-share sales from links made outside Rezekii (`outside`, by product and tag), and order counts (`counts`).
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const res = await supabaseRest(`tap_links?user_id=eq.${user.id}&select=product_id,product_name,image,tag,link,made_at&order=made_at.desc&limit=1000`);
  const links = (await res.json()) as (LinkRef & { product_name: string | null; image: string | null })[];
  const report = await linkShareReport(user.id, links).catch(() => ({ perf: {}, outside: [], counts: null }));
  return NextResponse.json({ links, ...report });
}
