/**
 * Her showcase against Rezekii (owner, 29 Oct 2026), sample data. The real one reads her showcase from TikTok and matches each
 * product to our live campaigns; "Not yet" is everything else, and her requests go to the admin's Product Requests list.
 */
export const SHOWCASE_TOTAL = 1248;
export const ON_REZEKII = 86;

/** A sample of her showcase products already on Rezekii (marketplace product ids), most sold first. */
export const ON_IDS = ["p21", "p13", "p09", "p01", "p22", "p17", "p05", "p16", "p11", "p20", "p07", "p24"];

export type ReqStatus = "Requested" | "Seller contacted" | "On Rezekii";
/** A showcase product not on Rezekii yet. `sold` is her own orders of it; `color` paints its placeholder tile. */
export type OffItem = { id: string; name: string; shop: string; category: string; price: number; sold: number; color: string; status?: ReqStatus; when?: string };

/** Her top sellers that aren't on Rezekii yet (sample), most sold first. */
export const NOT_YET: OffItem[] = [
  { id: "x1", name: "Bamboo lunch box, 3 layers", shop: "Kotak Hijau", category: "Home & Kitchen", price: 24.9, sold: 312, color: "#7cc576" },
  { id: "x2", name: "Hijab magnetic pins (12 pcs)", shop: "Hana Hijab Co", category: "Muslim Fashion", price: 9.9, sold: 268, color: "#e9a3c9", status: "Seller contacted", when: "24 Oct" },
  { id: "x3", name: "Silicone kitchen tongs set", shop: "Dapur Kita", category: "Home & Kitchen", price: 15.9, sold: 241, color: "#f5a623" },
  { id: "x4", name: "Collapsible water bottle 600ml", shop: "GoFlex MY", category: "Home & Kitchen", price: 19.9, sold: 198, color: "#5aa2ff", status: "Requested", when: "Yesterday" },
  { id: "x5", name: "Wide-leg linen pants", shop: "Linen Lane", category: "Fashion", price: 39.9, sold: 176, color: "#c9b79c" },
  { id: "x6", name: "Magnetic phone car mount", shop: "Volt Gadget", category: "Electronics", price: 12.9, sold: 154, color: "#8d99ab" },
  { id: "x7", name: "Oversized cotton shirt", shop: "Kain Kita", category: "Fashion", price: 29.9, sold: 132, color: "#9ad0c2" },
  { id: "x8", name: "Lint remover roller", shop: "Rumah Kemas", category: "Household", price: 8.9, sold: 118, color: "#ffb347" },
  { id: "x9", name: "LED makeup mirror", shop: "Glow Corner", category: "Beauty", price: 34.9, sold: 97, color: "#f4c0d1", status: "On Rezekii", when: "20 Oct" },
  { id: "x10", name: "Vacuum storage bags (6 pcs)", shop: "Rumah Kemas", category: "Household", price: 21.9, sold: 86, color: "#b9a8ff" },
];

/** Admin: products creators asked us to bring to Rezekii, with how many asked and how much they sold (sample). */
export type ProductRequest = { id: string; name: string; shop: string; category: string; askers: number; first: string; last: string; sold30: number; color: string; status: "New" | "Contacting" | "Added" };
export const PRODUCT_REQUESTS: ProductRequest[] = [
  { id: "r1", name: "Hijab magnetic pins (12 pcs)", shop: "Hana Hijab Co", category: "Muslim Fashion", askers: 23, first: "12 Oct", last: "Today", sold30: 4820, color: "#e9a3c9", status: "Contacting" },
  { id: "r2", name: "Bamboo lunch box, 3 layers", shop: "Kotak Hijau", category: "Home & Kitchen", askers: 17, first: "15 Oct", last: "Today", sold30: 3110, color: "#7cc576", status: "New" },
  { id: "r3", name: "Collapsible water bottle 600ml", shop: "GoFlex MY", category: "Home & Kitchen", askers: 14, first: "18 Oct", last: "Yesterday", sold30: 2640, color: "#5aa2ff", status: "New" },
  { id: "r4", name: "Oversized cotton shirt", shop: "Kain Kita", category: "Fashion", askers: 9, first: "20 Oct", last: "27 Oct", sold30: 1730, color: "#9ad0c2", status: "New" },
  { id: "r5", name: "Magnetic phone car mount", shop: "Volt Gadget", category: "Electronics", askers: 7, first: "21 Oct", last: "26 Oct", sold30: 1210, color: "#8d99ab", status: "Contacting" },
  { id: "r6", name: "LED makeup mirror", shop: "Glow Corner", category: "Beauty", askers: 6, first: "9 Oct", last: "19 Oct", sold30: 980, color: "#f4c0d1", status: "Added" },
  { id: "r7", name: "Lint remover roller", shop: "Rumah Kemas", category: "Household", askers: 4, first: "24 Oct", last: "25 Oct", sold30: 560, color: "#ffb347", status: "New" },
];
