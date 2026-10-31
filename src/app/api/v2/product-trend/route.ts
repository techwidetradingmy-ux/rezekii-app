import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

const MYT = 8 * 3_600_000;

/**
 * A product's sales on TikTok over the last 28 Malaysia days (owner, 1 Nov 2026), from TikTok's daily top-100 lists: the low and
 * high end of TikTok's GMV range per day, null on a day it wasn't in any top 100. Estimated; kept 30 minutes by the browser.
 */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^\d{6,25}$/.test(id)) return NextResponse.json({ error: "Choose a product." }, { status: 400 });
  const days = Array.from({ length: 28 }, (_, i) => new Date(Date.now() + MYT - (28 - i) * 86_400_000).toISOString().slice(0, 10));
  const r = await supabaseRest("rpc/product_daily_gmv", { method: "POST", body: JSON.stringify({ p_ids: [id], p_from: days[0] }) }).catch(() => null);
  const rows = ((await r?.json().catch(() => [])) ?? []) as { day: string; lo: number; hi: number }[];
  const by = new Map((Array.isArray(rows) ? rows : []).map((x) => [x.day, [Number(x.lo), Number(x.hi)] as [number, number]]));
  return NextResponse.json({ days, ranges: days.map((d) => by.get(d) ?? null) }, { headers: { "cache-control": "private, max-age=1800" } });
}
