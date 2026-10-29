import { product } from "./mock";

/**
 * Her showcase against Rezekii (owner, 29 Oct 2026), sample data. The real one reads her showcase from TikTok and matches each
 * product to our live campaigns; "Not yet" is everything else.
 */
export const SHOWCASE_TOTAL = 1248;
export const ON_REZEKII = 86;

/** A sample of her showcase products already on Rezekii (marketplace product ids), most sold first. */
export const ON_IDS = ["p21", "p13", "p09", "p01", "p22", "p17", "p05", "p16", "p11", "p20", "p07", "p24"];

/**
 * What a creator promises to give if the product launches on Rezekii (owner, 29 Oct 2026). There is no rate field: no rate is
 * guaranteed, and if the seller agrees she gets at least +1%. Admin pools these to pitch sellers incentive programs.
 */
export type Commit = { videos: number; lives: number; rights: 0 | 90 | 180; months: 1 | 3 | 6; note?: string };
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
export const commitText = (c: Commit) =>
  `${[c.videos ? plural(c.videos, "video") : "", c.lives ? `${c.lives} LIVE` : "", c.rights ? `${c.rights}-day ad rights` : ""].filter(Boolean).join(", ")} a month · ${plural(c.months, "month")}`;

/** A product as the wish list shows it. `rate` is TikTok's open-plan rate today (null when it has none). */
export type WishItem = { id: string; name: string; shop: string; img: string; price: number; rate: number | null };

/**
 * Her top sellers that aren't on Rezekii yet (sample), most sold first. `sold` is her own orders in 30 days. Photos are real
 * TikTok Shop listings saved 29 Oct 2026; names are shortened and shops are sample names.
 */
export type OffItem = WishItem & { category: string; sold: number };
export const NOT_YET: OffItem[] = [
  { id: "s1", name: "Wheat straw bento box set", shop: "Kotak Hijau", category: "Home & Kitchen", img: "/products/wish-01.jpg", price: 24.9, rate: 6, sold: 312 },
  { id: "s2", name: "Sheer embroidered organza shawl", shop: "Hana Hijab Co", category: "Muslim Fashion", img: "/products/wish-02.jpg", price: 9.9, rate: 8, sold: 268 },
  { id: "s3", name: "Mini garlic chopper, 2 in 1", shop: "Dapur Kita", category: "Home & Kitchen", img: "/products/wish-03.jpg", price: 15.9, rate: 5, sold: 241 },
  { id: "s4", name: "600ml stainless steel tumbler", shop: "GoFlex MY", category: "Home & Kitchen", img: "/products/wish-04.jpg", price: 19.9, rate: 7, sold: 198 },
  { id: "s5", name: "Wide-leg cotton linen pants", shop: "Linen Lane", category: "Fashion", img: "/products/wish-05.jpg", price: 39.9, rate: 8, sold: 176 },
  { id: "s6", name: "Foldable 720° phone stand", shop: "Volt Gadget", category: "Electronics", img: "/products/wish-06.jpg", price: 12.9, rate: 10, sold: 154 },
  { id: "s7", name: "Striped long-sleeve blouse", shop: "Kain Kita", category: "Fashion", img: "/products/wish-07.jpg", price: 29.9, rate: 6, sold: 132 },
  { id: "s8", name: "Artificial rose in a pot", shop: "Rumah Kemas", category: "Home Decor", img: "/products/wish-08.jpg", price: 8.9, rate: 10, sold: 118 },
  { id: "s9", name: "Peony eau de parfum", shop: "Glow Corner", category: "Beauty", img: "/products/wish-09.jpg", price: 34.9, rate: 8, sold: 97 },
  { id: "s10", name: "Stainless bathroom storage rack", shop: "Rumah Kemas", category: "Household", img: "/products/wish-10.jpg", price: 21.9, rate: 8, sold: 86 },
];
const off = (id: string) => NOT_YET.find((s) => s.id === id)!;
const fromProduct = (id: string): WishItem => {
  const p = product(id);
  return { id: p.id, name: p.name, shop: p.shop, img: p.img, price: p.price, rate: p.publicRate };
};

/** Where one of her wishes is. "On Rezekii" carries the raise she got (at least +1%). */
export type WishStatus = "On wish list" | "On Rezekii" | "Seller said no";
export type Wish = WishItem & { status: WishStatus; when: string; commit: Commit; raise?: number };
export const MY_WISHES: Wish[] = [
  { ...off("s4"), status: "On wish list", when: "Yesterday", commit: { videos: 2, lives: 1, rights: 0, months: 1 } },
  { ...off("s2"), status: "On wish list", when: "24 Oct", commit: { videos: 4, lives: 0, rights: 90, months: 3 } },
  { ...fromProduct("p17"), status: "On Rezekii", when: "20 Oct", commit: { videos: 4, lives: 0, rights: 0, months: 3 }, raise: 3 },
];

/**
 * Admin's Wish List and the public Most Wanted board: every product creators committed to, with the totals (sample). `sold30` is
 * how many of it those creators sold in 30 days; `rights` is how many of them give ad rights; `week` is new creators this week.
 */
export type WantedStatus = "New" | "Contacting" | "Joined" | "Bonus" | "Declined";
export type Offer = { handle: string; sold: number; commit: Commit };
export type Wanted = WishItem & { category: string; creators: number; videos: number; lives: number; rights: number; sold30: number; week: number; first: string; status: WantedStatus; offers: Offer[]; raise?: number };

const seri = (id: string, name: string, img: string, price: number, rate: number | null): WishItem => ({ id, name, shop: "Seri Living MY", img, price, rate });
export const WANTED: Wanted[] = [
  { ...off("s1"), category: "Home & Kitchen", creators: 38, videos: 126, lives: 14, rights: 21, sold30: 6240, week: 9, first: "12 Oct", status: "New", offers: [
    { handle: "@kak.ros.kitchen", sold: 640, commit: { videos: 8, lives: 2, rights: 180, months: 6 } },
    { handle: "@farah.home", sold: 410, commit: { videos: 4, lives: 0, rights: 90, months: 3 } },
    { handle: "@siti.deco", sold: 355, commit: { videos: 4, lives: 1, rights: 0, months: 3 } },
  ] },
  { ...off("s2"), category: "Muslim Fashion", creators: 31, videos: 97, lives: 6, rights: 12, sold30: 4820, week: 4, first: "9 Oct", status: "Contacting", offers: [
    { handle: "@nurul.beauty", sold: 520, commit: { videos: 6, lives: 1, rights: 90, months: 3 } },
    { handle: "@aisyah.glow", sold: 268, commit: { videos: 4, lives: 0, rights: 90, months: 3 } },
    { handle: "@mira.new", sold: 140, commit: { videos: 2, lives: 0, rights: 0, months: 1 } },
  ] },
  { ...seri("x01", "Granite casserole pot, 20cm", "/products/tap-08.jpg", 119.9, 4), category: "Home & Kitchen", creators: 24, videos: 71, lives: 11, rights: 15, sold30: 3980, week: 7, first: "15 Oct", status: "New", offers: [
    { handle: "@kak.ros.kitchen", sold: 380, commit: { videos: 6, lives: 2, rights: 180, months: 6 } },
    { handle: "@mei.ling.deals", sold: 295, commit: { videos: 4, lives: 1, rights: 90, months: 3 } },
    { handle: "@zara.home", sold: 120, commit: { videos: 2, lives: 0, rights: 0, months: 3 } },
  ] },
  { ...off("s4"), category: "Home & Kitchen", creators: 19, videos: 52, lives: 3, rights: 8, sold30: 2640, week: 3, first: "18 Oct", status: "New", offers: [
    { handle: "@danial.vlogs", sold: 330, commit: { videos: 4, lives: 0, rights: 90, months: 3 } },
    { handle: "@aisyah.glow", sold: 198, commit: { videos: 2, lives: 1, rights: 0, months: 1 } },
  ] },
  { ...seri("x03", "Leak-proof tumbler 600ml, kids", "/products/tap-24.jpg", 39.9, null), category: "Home & Kitchen", creators: 12, videos: 30, lives: 2, rights: 6, sold30: 1130, week: 5, first: "20 Oct", status: "New", offers: [
    { handle: "@farah.home", sold: 210, commit: { videos: 4, lives: 0, rights: 180, months: 3 } },
    { handle: "@siti.deco", sold: 96, commit: { videos: 2, lives: 1, rights: 0, months: 1 } },
  ] },
  { ...off("s6"), category: "Electronics", creators: 9, videos: 24, lives: 0, rights: 4, sold30: 1210, week: 2, first: "21 Oct", status: "New", offers: [
    { handle: "@hafiz.tech", sold: 410, commit: { videos: 6, lives: 0, rights: 90, months: 3 } },
  ] },
  { ...seri("x02", "1.8L 316 stainless thermos", "/products/tap-21.jpg", 32.9, 6), category: "Home & Kitchen", creators: 6, videos: 15, lives: 1, rights: 2, sold30: 0, week: 6, first: "24 Oct", status: "New", offers: [
    { handle: "@mei.ling.deals", sold: 0, commit: { videos: 4, lives: 1, rights: 90, months: 1 } },
  ] },
  { ...off("s3"), category: "Home & Kitchen", creators: 4, videos: 10, lives: 0, rights: 1, sold30: 560, week: 1, first: "24 Oct", status: "New", offers: [
    { handle: "@kak.ros.kitchen", sold: 230, commit: { videos: 4, lives: 0, rights: 0, months: 1 } },
  ] },
  { ...fromProduct("p17"), category: "Home & Living", creators: 27, videos: 80, lives: 4, rights: 9, sold30: 2950, week: 0, first: "2 Oct", status: "Joined", raise: 3, offers: [
    { handle: "@aisyah.glow", sold: 260, commit: { videos: 4, lives: 0, rights: 0, months: 3 } },
  ] },
  { ...off("s7"), category: "Fashion", creators: 7, videos: 18, lives: 0, rights: 3, sold30: 690, week: 0, first: "10 Oct", status: "Declined", offers: [
    { handle: "@danial.vlogs", sold: 180, commit: { videos: 4, lives: 0, rights: 0, months: 1 } },
  ] },
];

/**
 * What we ask a seller for (owner, 29 Oct 2026): at least +2% above the public rate, and at least +5% on products our creators
 * want most (past the "Ready to pitch" line). Campaigns always run for the longest time TikTok allows; sellers don't pick dates.
 */
export const MIN_RAISE = 2;
export const HOT_RAISE = 5;
export const hotFor = (id: string) => WANTED.find((w) => w.id === id && (w.status === "New" || w.status === "Contacting") && isReady(w));

/** A product goes on the public Most Wanted board at 5 creators, and leaves it once it launches (or the seller says no). */
export const BOARD_MIN = 5;
export const onBoard = (w: Wanted) => w.creators >= BOARD_MIN && (w.status === "New" || w.status === "Contacting");
/** Admin's "Ready to pitch" line, changeable on the Wish List page: either number is enough. */
export const READY = { creators: 10, videos: 30 };
export const isReady = (w: Wanted, t = READY) => w.creators >= t.creators || w.videos >= t.videos;
export const wantedFor = (id: string) => WANTED.find((w) => w.id === id && onBoard(w));

/**
 * What a pasted product link turns into (preview only). The real one reads the product ID from the link, opens short links
 * (vt.tiktok.com) first, and looks it up the way V1's Product Lookup does. Here any TikTok link resolves to one of three samples.
 */
export type Lookup = { kind: "new" | "wanted" | "onRezekii"; item: WishItem };
export function lookupLink(link: string): Lookup | null {
  const url = link.trim();
  if (!/^(https?:\/\/)?([a-z0-9-]+\.)*tiktok\.com\/\S+/i.test(url)) return null;
  const pick = [...url].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 3;
  if (pick === 0) return { kind: "onRezekii", item: fromProduct("p13") };
  if (pick === 1) return { kind: "wanted", item: off("s6") };
  return { kind: "new", item: off("s8") };
}
