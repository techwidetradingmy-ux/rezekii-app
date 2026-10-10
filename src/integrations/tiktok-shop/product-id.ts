const ID_PATTERNS = [
  /\/product\/(\d{15,21})/, // shop.tiktok.com/view/product/<id>
  /\/pdp\/(?:[^/?#]+\/)?(\d{15,21})/, // www.tiktok.com/shop/pdp/<slug>/<id>
  /[?&]product_id=(\d{15,21})/,
];

/** Finds the product ID in a full TikTok Shop link, or in a bare ID. */
export function findProductId(input: string): string | null {
  const text = input.trim();
  if (/^\d{15,21}$/.test(text)) return text;
  for (const pattern of ID_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Short share links (vt.tiktok.com/…) only reveal the product after following their redirects. */
export async function resolveProductId(input: string): Promise<string | null> {
  let url = input.trim();
  for (let hop = 0; hop < 5; hop++) {
    const id = findProductId(url);
    if (id) return id;
    if (!/^https?:\/\//i.test(url)) return null;
    const res = await fetch(url, { redirect: "manual", cache: "no-store" });
    const next = res.headers.get("location");
    if (!next) return null;
    url = new URL(next, url).toString();
  }
  return findProductId(url);
}
