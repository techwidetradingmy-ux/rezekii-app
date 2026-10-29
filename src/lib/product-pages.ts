import { PRODUCTS, SELLER } from "./mock";
import { CAMPAIGNS, TICKETS } from "./mock-admin";
import { daily, type Trend } from "./mock-creator2";
import { WANTED, onBoard, type Wanted } from "./mock-showcase";
import { productView } from "./product-view";

/**
 * Product (owner, 29 Oct 2026): helpers for the seller and admin Product pages (the creator one uses product-view.ts). Every
 * product row in the seller app and admin opens /seller/app/product/<id> or /admin/product/<id>.
 */
export const sellerProductHref = (id: string) => `/seller/app/product/${id}`;
export const adminProductHref = (id: string) => `/admin/product/${id}`;

const TRENDS: Trend[] = ["up", "flat", "up"];
const pickTrend = (id: string) => TRENDS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TRENDS.length];

/** Units sold each day for the last 7 days (sample), oldest first. Same line as the creator page; null when nothing sold yet. */
export function weekLine(id: string, sold: number): number[] | null {
  if (!sold) return null;
  return productView(id)?.week ?? daily(Math.max(70, Math.round(sold / 26)), pickTrend(id));
}

/** Creators asking for one of this seller's products (still open: New or Contacting). */
export const sellerWanted = (id: string) =>
  WANTED.find((w) => w.id === id && w.shop === SELLER.shop && (w.status === "New" || w.status === "Contacting")) ?? null;

/** Place on the public Most Wanted board this week, or null when it isn't on it. */
export function mostWantedRank(w: Wanted) {
  const ranked = WANTED.filter(onBoard).sort((a, b) => b.week - a.week || b.creators - a.creators);
  const i = ranked.findIndex((x) => x.id === w.id);
  return i >= 0 ? i + 1 : null;
}

/** Techwide's TAP partner ID sellers invite to their own campaign (sample). */
export const PARTNER_ID = "7495 1180 2264";
export const BONUSES = ["Extra % for top sellers", "Cash bonus at a sales target", "Free samples for everyone who committed"] as const;

const n = (v: number) => v.toLocaleString("en-MY");
/** The message for the seller: who wants it, what they already sell, and what they'll give. We negotiate for the creators. */
export const pitch = (w: Wanted) =>
  `${w.creators} creators want to promote your ${w.name}. They sold ${n(w.sold30)} of it in the last 30 days. ` +
  `Together they can give ${n(w.videos)} videos${w.lives ? ` and ${n(w.lives)} LIVE sessions` : ""} a month${w.rights ? `, and ${w.rights} of them offer ad rights` : ""}. ` +
  `Submit it to our TAP campaign, or invite us to yours, to work with them.`;

/** The TAP campaign a marketplace product runs in: the one showing its photo, else its shop's live campaign. */
export function campaignFor(id: string) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  return CAMPAIGNS.find((c) => c.shop === p.shop && c.imgs.includes(p.img)) ?? CAMPAIGNS.find((c) => c.shop === p.shop && c.status === "Live") ?? null;
}

/** Pipeline tickets that list this product (ticket items carry the product's name, not its id). */
export function ticketsFor(id: string) {
  const p = PRODUCTS.find((x) => x.id === id);
  return p ? TICKETS.filter((t) => t.items.some((i) => i.name === p.name)) : [];
}

export const productIdByName = (name: string) => PRODUCTS.find((p) => p.name === name)?.id ?? null;
export const productIdByImg = (img: string) => PRODUCTS.find((p) => p.img === img)?.id ?? null;
