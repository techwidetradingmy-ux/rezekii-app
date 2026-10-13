/** Display helpers shared by the Marketplace card, product view and sample lists. */
export const pct = (rate: number | null | undefined) => (typeof rate === "number" ? `${(rate / 100).toFixed(rate % 100 ? 1 : 0)}%` : "—");
export const rm = (v: number | null | undefined) => (typeof v === "number" ? `RM${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)}` : "—");
export const priceRange = (lo: number | null, hi: number | null) => (lo === null ? "—" : hi === null || hi === lo ? rm(lo) : `${rm(lo)} – ${rm(hi)}`);
export const short = (v: number | null | undefined) =>
  typeof v !== "number" ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}k` : String(v);
/** What one sale earns at a rate, on the lowest price. */
export const perSale = (price: number | null, rate: number | null) => (price === null || rate === null ? "—" : rm(Math.round((price * rate) / 100) / 100)); // rounded in sen, so 1.545 shows as 1.55
export const tiktokProductUrl = (id: string) => `https://shop.tiktok.com/view/product/${id}?region=MY`;
