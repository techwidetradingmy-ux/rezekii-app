import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getLang } from "@/lib/i18n/server.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { linkShareReport, type LinkRef } from "@/modules/tap/link-share.ts";

export const dynamic = "force-dynamic";

/**
 * The signed-in creator's link history (newest first, up to 1,000), each link's link-share sales (`perf`, by link), the
 * link-share sales from links made outside Rezekii (`outside`, by product and tag), and order counts (`counts`), for a time
 * frame: ?frame=all|7d|30d|...|c:YYYY-MM-DD:YYYY-MM-DD (the Sales page's frames; all time when not given).
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const res = await supabaseRest(`tap_links?user_id=eq.${user.id}&select=product_id,product_name,image,tag,link,made_at&order=made_at.desc&limit=1000`);
  const links = (await res.json()) as (LinkRef & { product_name: string | null; image: string | null })[];
  const now = Date.now();
  const report = await linkShareReport(user.id, links, req.nextUrl.searchParams.get("frame") ?? "all", now, await getLang()).catch(() => ({ perf: {}, outside: [], counts: null, range: null }));
  if (!report) return NextResponse.json({ error: "That time frame isn't available." }, { status: 400 });
  return NextResponse.json({ links, ...report, now });
}
