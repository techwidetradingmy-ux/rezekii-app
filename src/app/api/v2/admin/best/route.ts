import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { CAT } from "@/modules/rankings/build.ts";

export const dynamic = "force-dynamic";

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);

/**
 * TikTok's best-seller lists for admins (owner, 31 Oct 2026: admins see the newest, creators don't). ?list=products|creators,
 * ?period=1D|7D|30D, ?cat=<category id> (products), ?currency=LOCAL|USD. The newest saved list and the day its sales are from.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const list = q.get("list") === "creators" ? "creators" : "products";
  const period = ["1D", "7D", "30D"].includes(q.get("period") ?? "") ? q.get("period")! : "1D";
  const currency = q.get("currency") === "USD" ? "USD" : "LOCAL";
  const cat = /^\d{6}$/.test(q.get("cat") ?? "") ? q.get("cat")! : "ALL";
  const slot = list === "creators" ? `${period}|ALL|${currency}` : `${period}|${cat}|${currency}`;
  const [row] = (await (await supabaseRest(`market_snapshots?dataset=eq.${list}&slot=eq.${encodeURIComponent(slot)}&select=as_of,fetched_at,items&order=as_of.desc&limit=1`)).json()) as { as_of: string; fetched_at: string; items: Raw[] }[];
  const items = (row?.items ?? []).slice(0, 100).map((x) =>
    list === "products"
      ? { rank: Number(x.rank ?? 0), id: str(x.id), name: str(x.name) ?? "Product", sub: str(x.shop_name) ?? "", img: ((x.product_image as { urls?: string[] } | undefined)?.urls ?? [])[0] ?? null, rating: x.rating != null ? Math.round(Number(x.rating) * 10) / 10 : null, gmv: str(x.gmv_range) }
      : { rank: Number(x.rank ?? 0), id: str(x.open_id), name: str(x.nick_name) ?? str(x.user_name) ?? "Creator", sub: x.user_name ? `@${x.user_name}` : "", img: str((x.avatar as { url?: string } | undefined)?.url) ?? str(x.avatar_url), rating: null, followers: x.followers_count != null ? Number(x.followers_count) : null, gmv: str(x.gmv_range) },
  );
  return NextResponse.json({ list, period, currency, cat, salesDay: row?.as_of ?? null, fetchedAt: row?.fetched_at ?? null, items, categories: Object.entries(CAT) }, { headers: { "cache-control": "private, no-store" } });
}
