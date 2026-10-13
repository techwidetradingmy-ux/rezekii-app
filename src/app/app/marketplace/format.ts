/** Display helpers, the same as the mockup's (_tap/tap.js). */
export const pct = (rate: number | null | undefined) => (typeof rate === "number" ? `${(rate / 100) % 1 ? (rate / 100).toFixed(1) : String(rate / 100)}%` : "—");
export const rm = (v: number | null | undefined) => (typeof v === "number" ? `RM${v >= 100 ? Math.round(v) : v.toFixed(2)}` : "—");
export const rmx = (v: number) => `RM${v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)}`;
export const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v));
export const n = (v: number) => Math.round(v).toLocaleString("en-US");
export const priceText = (lo: number | null, hi: number | null) => (lo === null ? "—" : hi === null || hi === lo ? rm(lo) : `${rm(lo)} – ${rm(hi)}`);
/** What one sale earns at a rate, on the lowest price, rounded in sen (so 1.545 shows as 1.55). */
export const perSale = (price: number | null, rate: number | null) => (price === null || rate === null ? "—" : rmx(Math.round((price * rate) / 100) / 100));
export const pulled = (asOf: string | null) => (asOf ? new Date(`${asOf}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "");
export const tiktokProductUrl = (id: string) => `https://shop.tiktok.com/view/product/${id}?region=MY`;
const COLS = ["#00874f", "#7c3aed", "#e8005a", "#0e7490", "#f2a93b", "#1d4ed8", "#b45309", "#0f766e"];
/** Placeholder when a product has no photo: a colour from its category, and the category's first letter. */
export const placeholder = (cat: string | null) => ({ background: `linear-gradient(135deg,${COLS[(cat ?? "").length % COLS.length]},#0b1210)`, initial: (cat || "?")[0].toUpperCase() });
