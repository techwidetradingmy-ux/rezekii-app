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

/** Only TikTok's own addresses are ever fetched (the link comes from a user). */
export function isTikTokUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "tiktok.com" || u.hostname.endsWith(".tiktok.com"));
  } catch {
    return false;
  }
}

/** Short share links (vt.tiktok.com/…) only reveal the product after following their redirects. */
export async function resolveProductId(input: string): Promise<string | null> {
  let url = input.trim();
  for (let hop = 0; hop < 5; hop++) {
    const id = findProductId(url);
    if (id) return id;
    if (!isTikTokUrl(url)) return null;
    const next = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then((res) => res.headers.get("location"))
      .catch(() => null);
    if (!next) return null;
    url = new URL(next, url).toString();
  }
  return findProductId(url);
}
