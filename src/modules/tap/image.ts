/** TikTok's product photos come as full-size JPEGs; the 300px WebP version is about 15 KB instead of 200 KB. */
export const smallImage = (url?: string | null) => (url ? url.replace(/~tplv-([a-z0-9]+)-origin-jpeg\.jpeg/, "~tplv-$1-resize-webp:300:300.webp") : null);
