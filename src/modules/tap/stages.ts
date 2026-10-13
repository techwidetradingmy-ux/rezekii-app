/** Sample stages for My TAP products, as in the mockup (_tap/samples.js). Safe for the browser. */

/** TikTok writes "NotRequested" or "NOT_REQUESTED"; both become NOT_REQUESTED. */
export const normalizeStatus = (s: string | null | undefined) => (s ?? "").replace(/(?<!^)(?=[A-Z][a-z])/g, "_").toUpperCase().replace(/__+/g, "_");

/** 0 selling without a sample, 1 requested, 2 shipped, 3 delivered (waiting for a post), 4 posted, -1 cancelled. */
export function sampleStage(status: string): number {
  const st = normalizeStatus(status);
  if (/COMPLETED/.test(st)) return 4;
  if (/CONTENT_PENDING/.test(st)) return 3;
  if (/SHIPPED|AWAITING_COLLECTION/.test(st)) return 2;
  if (/PENDING|AWAITING_SHIPMENT|REQUESTED/.test(st) && !/NOT_REQUESTED/.test(st)) return 1;
  if (/CANCEL|FAIL|UNFULFIL|UN_FULFIL|REJECT/.test(st)) return -1;
  return 0;
}

/** Label, background and text colour for each stage. */
export const SAMPLE_LOOK: Record<string, [string, string, string]> = {
  "4": ["Content posted", "var(--gsoft)", "var(--gink)"],
  "3": ["Delivered · waiting for your post", "var(--asoft)", "var(--amber)"],
  "2": ["Sample on the way", "var(--bsoft)", "var(--blue)"],
  "1": ["Sample requested", "var(--bsoft)", "var(--blue)"],
  "-1": ["Sample cancelled", "var(--surface2)", "var(--muted)"],
  "0": ["Selling, no sample", "var(--surface2)", "var(--muted)"],
};
export const sampleLook = (stage: number) => SAMPLE_LOOK[String(stage)];

/** One row of My TAP products: a product the creator promotes (from TikTok) or a sample asked for on Rezekii. */
export type MyTapRow = {
  key: string;
  campaignId: string | null;
  productId: string;
  name: string;
  shop: string;
  image: string | null;
  stage: number;
  paid: number;
  videos: number;
  lives: number;
  /** Set for samples asked for on Rezekii that TikTok does not show yet. */
  request?: { status: "requested" | "applied" | "rejected" | "cancelled"; note: string | null; createdAt: string; updatedAt: string };
};

/** Unix seconds from TikTok's dates, which come in seconds or milliseconds, as numbers or strings. */
export const unixSeconds = (v: unknown) => {
  const f = Number(v);
  if (!Number.isFinite(f) || f <= 0) return 0;
  return f > 1e12 ? Math.floor(f / 1000) : Math.floor(f);
};
