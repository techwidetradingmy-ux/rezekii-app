import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { Campaign, CampaignProduct } from "../../integrations/tiktok-shop/partner.ts";
import { smallImage } from "../tap/image.ts";
import { unixSeconds } from "../tap/stages.ts";
import type { StatRow } from "../tap/golden.ts";

export type AdminCampaign = {
  id: string;
  name: string;
  status: "live" | "upcoming" | "ended";
  start: number | null;
  end: number | null;
  products: number;
  creators: number;
  /** highest total rate ×100 */
  upto: number;
  /** RM, from the campaign's sales figures (partner commission is Techwide's share) */
  gmvPaid: number;
  gmvSettled: number;
  comEst: number;
  comSettled: number;
};
export type AdminTapProduct = {
  id: string;
  name: string;
  shop: string | null;
  image: string | null;
  open: number | null;
  total: number | null;
  sold: number;
  stock: number | null;
  samples: number;
  available: boolean;
  variants: [string, number | null, number][];
};

type Raw = CampaignProduct & { sku_information_list?: { sku_name?: string; properties?: { value_name?: string }[]; base_price?: { sale_price?: string }; inventory?: { available_quantity?: number } }[] };

async function latest(dataset: string): Promise<{ asOf: string | null; rows: { slot: string; items: unknown[] }[] }> {
  const [d] = (await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&select=as_of&order=as_of.desc&limit=1`)).json()) as { as_of: string }[];
  if (!d) return { asOf: null, rows: [] };
  return { asOf: d.as_of, rows: await (await supabaseRest(`market_snapshots?dataset=eq.${dataset}&as_of=eq.${d.as_of}&select=slot,items`)).json() };
}

const statusOf = (c: Campaign): AdminCampaign["status"] => (c.status === "ONGOING" ? "live" : c.status === "CLOSED" ? "ended" : "upcoming");

/** Techwide's TAP campaigns from the latest daily refresh, each with its products, creators and commission. Admin only. */
export async function tapOverview(): Promise<{ asOf: string | null; campaigns: AdminCampaign[]; products: Record<string, AdminTapProduct[]> }> {
  const [camps, prods, stats, creators] = await Promise.all([
    latest("tap_campaigns"),
    latest("tap_products"),
    latest("tap_stats"),
    supabaseRest("tap_creator_products?select=campaign_id,username&limit=100000").then((r) => r.json() as Promise<{ campaign_id: string; username: string }[]>),
  ]);
  const list = (camps.rows.flatMap((r) => r.items) as Campaign[]).filter((c) => c?.id);
  const productsBy: Record<string, AdminTapProduct[]> = {};
  for (const r of prods.rows) {
    productsBy[r.slot] = (r.items as Raw[]).map((p) => ({
      id: p.id, name: (p.name ?? "").replace(/\s+/g, " ").trim(), shop: p.shop_name ?? null, image: p.main_image_url ? smallImage(p.main_image_url) : null,
      open: p.open_collaboration_commission_rate ?? null, total: p.total_commission_rate ?? null, sold: Number(p.product_sales ?? 0), stock: p.inventory ?? null,
      samples: p.sample_quota ?? 0, available: p.is_available !== false,
      variants: (p.sku_information_list ?? []).slice(0, 8).map((s): [string, number | null, number] => [
        (s.properties ?? []).map((x) => x.value_name).filter(Boolean).join(" / ") || s.sku_name || "Default",
        s.base_price?.sale_price ? Number(s.base_price.sale_price) : null,
        s.inventory?.available_quantity ?? 0,
      ]),
    })).sort((a, b) => b.sold - a.sold);
  }
  const statsBy = new Map(stats.rows.map((r) => [r.slot, r.items as StatRow[]]));
  const people = new Map<string, Set<string>>();
  for (const c of creators) people.set(c.campaign_id, (people.get(c.campaign_id) ?? new Set()).add(c.username));
  const sum = (rows: StatRow[], i: 2 | 3 | 4 | 5) => Math.round(rows.reduce((s, r) => s + (Number(r[i]) || 0), 0) * 100) / 100;
  const campaigns = list.map((c) => {
    const ps = productsBy[c.id] ?? [];
    const st = statsBy.get(c.id) ?? [];
    return {
      id: c.id, name: c.name, status: statusOf(c), start: unixSeconds(c.campaign_start_time) || null, end: unixSeconds(c.campaign_end_time) || null,
      products: ps.length, creators: people.get(c.id)?.size ?? 0, upto: Math.max(0, ...ps.map((p) => p.total ?? 0)),
      gmvPaid: sum(st, 2), gmvSettled: sum(st, 3), comEst: sum(st, 4), comSettled: sum(st, 5),
    };
  });
  const order = { live: 0, upcoming: 1, ended: 2 };
  campaigns.sort((a, b) => order[a.status] - order[b.status] || b.products - a.products);
  return { asOf: prods.asOf, campaigns, products: productsBy };
}

export type Commission = { asOf: string | null; est: number; settled: number; gmvPaid: number; gmvSettled: number; campaigns: number; top: { name: string; est: number }[]; hasSettled: boolean };

/** Techwide's partner commission across all TAP campaigns (lifetime totals from TikTok), for the admin Today card. */
export async function commission(): Promise<Commission> {
  const [camps, stats] = await Promise.all([latest("tap_campaigns"), latest("tap_stats")]);
  const names = new Map((camps.rows.flatMap((r) => r.items) as Campaign[]).map((c) => [c.id, c.name]));
  const per = stats.rows.map((r) => {
    const rows = r.items as StatRow[];
    const s = (i: 2 | 3 | 4 | 5) => rows.reduce((t, x) => t + (Number(x[i]) || 0), 0);
    return { name: names.get(r.slot) ?? r.slot, est: s(4), settled: s(5), paid: s(2), gmvSettled: s(3), full: rows.some((x) => x.length > 3) };
  });
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    asOf: stats.asOf,
    est: round(per.reduce((t, p) => t + p.est, 0)),
    settled: round(per.reduce((t, p) => t + p.settled, 0)),
    gmvPaid: round(per.reduce((t, p) => t + p.paid, 0)),
    gmvSettled: round(per.reduce((t, p) => t + p.gmvSettled, 0)),
    campaigns: names.size,
    top: per.filter((p) => p.est > 0).sort((a, b) => b.est - a.est).slice(0, 5).map((p) => ({ name: p.name, est: round(p.est) })),
    hasSettled: per.some((p) => p.full),
  };
}
