import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { IDEAS_FOR, herCategories, marketIdeas, showcaseIdeas, type Channel, type Idea, type TodayIdeas } from "./today.ts";
import { keepRatings, type ProductFacts } from "../tap/product-facts.ts";

/**
 * Today's Ideas saved per creator and view (owner, 1 Nov 2026): the daily refresh prepares each creator's main lists ahead, and
 * the page shows the saved list at once until TikTok publishes its next daily list (or her level changes).
 */
type Level = keyof typeof IDEAS_FOR;
export const ideasKey = (source: "market" | "showcase", channel: Channel, cat: string | null) => `${source}:${channel}:${cat ?? ""}`;

export async function savedIdeas(userId: string, key: string): Promise<{ day: string | null; level: Level | null; data: TodayIdeas } | null> {
  const [row] = (await (await supabaseRest(`ideas_cache?user_id=eq.${userId}&key=eq.${encodeURIComponent(key)}&select=day,data&limit=1`)).json().catch(() => [])) as { day: string | null; data: TodayIdeas & { level?: Level } }[];
  return row ? { day: row.day, level: row.data.level ?? null, data: row.data } : null;
}

/**
 * A product from her saved Today's Ideas, as the product page needs it (owner, 3 Nov 2026: a listed product must open): for when
 * TikTok's lookup gives nothing for it, e.g. its listing changed since the list was made. Only ideas with TikTok's search facts.
 */
export async function ideaFacts(userId: string, id: string): Promise<ProductFacts | null> {
  const got = (await (await supabaseRest(`ideas_cache?user_id=eq.${userId}&data=cs.${encodeURIComponent(JSON.stringify({ rows: [{ id }] }))}&select=data->rows&limit=5`)).json()) as { rows: Idea[] | null }[];
  const x = got.flatMap((g) => g.rows ?? []).find((r) => r.id === id && r.price !== null);
  return x ? { rating: x.rating, reviews: null, main: x.category, sub: null, openRate: x.openRate, name: x.name, shop: x.shop, image: x.img, price: x.price, sold: null } : null;
}

/** Makes one view of her ideas now and saves it. Marketplace lists carry her own categories for the tabs (owner, 3 Nov 2026). */
export async function ideasFor(userId: string, token: string, level: Level, source: "market" | "showcase", channel: Channel, cat: string | null): Promise<TodayIdeas> {
  const want = IDEAS_FOR[level] ?? IDEAS_FOR.bronze;
  const [base, herCats] = await Promise.all([
    source === "showcase" ? showcaseIdeas(token, want, channel) : marketIdeas(token, want, channel, cat),
    source === "market" ? herCategories(userId).catch(() => [] as string[]) : null,
  ]);
  const r = herCats ? { ...base, herCats } : base;
  // Their TikTok ratings are kept too, so Marketplace cards can show them (owner, 2 Nov 2026).
  await Promise.all([
    supabaseRest("ideas_cache?on_conflict=user_id,key", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, key: ideasKey(source, channel, cat), day: r.day, data: { ...r, level }, at: new Date().toISOString() }),
    }).catch(() => undefined),
    keepRatings(r.rows).catch(() => undefined),
  ]);
  return r;
}
