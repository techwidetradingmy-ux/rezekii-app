/** Sample stages for My Samples, in TikTok's own five steps. Safe for the browser. */

/** TikTok writes "NotRequested" or "NOT_REQUESTED"; both become NOT_REQUESTED. */
export const normalizeStatus = (s: string | null | undefined) => (s ?? "").replace(/(?<!^)(?=[A-Z][a-z])/g, "_").toUpperCase().replace(/__+/g, "_");

/**
 * TikTok's five sample steps (owner, 16 Oct 2026): 1 pending approval, 2 approved (waiting to ship or for the courier),
 * 3 shipped, 4 delivered (waiting for the creator's post), 5 post criteria met. 0 no sample, -1 cancelled.
 */
export function sampleStage(status: string): number {
  const st = normalizeStatus(status);
  if (/COMPLETED/.test(st)) return 5;
  if (/CONTENT_PENDING/.test(st)) return 4;
  if (/SHIPPED/.test(st)) return 3;
  if (/AWAITING_SHIPMENT|AWAITING_COLLECTION/.test(st)) return 2;
  if (/CANCEL|FAIL|UNFULFIL|UN_FULFIL|REJECT/.test(st)) return -1;
  if (/PENDING|REQUESTED/.test(st) && !/NOT_REQUESTED/.test(st)) return 1;
  return 0;
}

/** TikTok's five sample steps, in order, as TikTok words them. */
export const SAMPLE_STEPS = ["Pending approval", "Approved", "Shipped", "Delivered", "Post criteria met"] as const;

/** Label, background and text colour for each stage, in TikTok's own sample status words (owner, 16 Oct 2026). */
export const SAMPLE_LOOK: Record<string, [string, string, string]> = {
  "5": ["Post criteria met", "var(--gsoft)", "var(--gink)"],
  "4": ["Delivered", "var(--asoft)", "var(--amber)"],
  "3": ["Shipped", "var(--bsoft)", "var(--blue)"],
  "2": ["Approved", "var(--bsoft)", "var(--blue)"],
  "1": ["Pending approval", "var(--asoft)", "var(--amber)"],
  "-1": ["Cancelled", "var(--surface2)", "var(--muted)"],
  "0": ["No sample", "var(--surface2)", "var(--muted)"],
};
export const sampleLook = (stage: number) => SAMPLE_LOOK[String(stage)];
const CANCELLED = "var(--surface2)", MUTED = "var(--muted)";
/** Each of TikTok's sample statuses, as TikTok shows it to creators (owner, 16 Oct 2026: follow TikTok's exact sample status). */
const STATUS_LOOK: Record<string, [string, string, string]> = {
  PENDING: ["Pending approval", "var(--asoft)", "var(--amber)"],
  AWAITING_SHIPMENT: ["Approved", "var(--bsoft)", "var(--blue)"],
  AWAITING_COLLECTION: ["Approved", "var(--bsoft)", "var(--blue)"],
  SHIPPED: ["Shipped", "var(--bsoft)", "var(--blue)"],
  CONTENT_PENDING: ["Delivered", "var(--asoft)", "var(--amber)"],
  COMPLETED: ["Post criteria met", "var(--gsoft)", "var(--gink)"],
  REJECT_CANCELLED: ["Rejected", "var(--rsoft)", "var(--red)"],
  REJECTED: ["Rejected", "var(--rsoft)", "var(--red)"],
  OVERDUE_CANCELLED: ["Cancelled · overdue", CANCELLED, MUTED],
  UNFULFILL_CANCELLED: ["Cancelled · unfulfilled", CANCELLED, MUTED],
  UN_FULFIL_CANCELLED: ["Cancelled · unfulfilled", CANCELLED, MUTED],
  UNFULFILLABLE_CANCELLED: ["Cancelled · unfulfillable", CANCELLED, MUTED],
  SELLER_NOT_SHIP_CANCELLED: ["Cancelled · seller didn't ship", CANCELLED, MUTED],
  WITHDRAW_CANCELLED: ["Cancelled · withdrawn", CANCELLED, MUTED],
};
/** Pill for one of TikTok's sample statuses ("Pending", "AWAITING_SHIPMENT", ...). */
export const statusLook = (status: string | null | undefined) => STATUS_LOOK[normalizeStatus(status)] ?? sampleLook(sampleStage(status ?? ""));

/** One row of My Samples: a product the creator promotes (from TikTok) or a sample asked for on Rezekii. */
export type MyTapRow = {
  key: string;
  campaignId: string | null;
  productId: string;
  name: string;
  shop: string;
  image: string | null;
  stage: number;
  /** TikTok's sample status for this product in Techwide's TAP data. */
  status?: string | null;
  paid: number;
  videos: number;
  lives: number;
  /** Set for samples asked for on Rezekii that TikTok's TAP data doesn't show yet. `tiktok`: the creator's own TikTok status, if any. */
  request?: { status: "requested" | "applied" | "rejected" | "cancelled"; note: string | null; createdAt: string; updatedAt: string; tiktok: string | null; noSample?: boolean };
};

/** Pill for a My TAP row: a request TikTok has no record of is "not submitted", never a sample status. */
export const rowLook = (r: Pick<MyTapRow, "stage" | "request" | "status">): [string, string, string] =>
  r.request?.noSample && !r.request.tiktok ? ["No sample", "var(--surface2)", "var(--muted)"]
    : r.request && !r.request.tiktok && r.stage !== -1 ? ["Not submitted in TikTok yet", "var(--asoft)", "var(--amber)"]
    : r.request?.tiktok || r.status ? statusLook(r.request?.tiktok ?? r.status) : sampleLook(r.stage);

/** A requested sample still with the seller (TikTok's "Pending approval"). */
export const awaitingApproval = (r: Pick<MyTapRow, "stage">) => r.stage === 1;
/** Approved by the seller, not shipped yet. */
export const approvedToShip = (r: Pick<MyTapRow, "stage">) => r.stage === 2;
/** Turned down by the seller (owner, 16 Oct 2026: its own Rejected group, apart from other cancellations). */
export const rejected = (r: Pick<MyTapRow, "stage" | "request" | "status">) => r.stage === -1 && /REJECT/.test(normalizeStatus(r.request?.tiktok ?? r.status));

/** Unix seconds from TikTok's dates, which come in seconds or milliseconds, as numbers or strings. */
export const unixSeconds = (v: unknown) => {
  const f = Number(v);
  if (!Number.isFinite(f) || f <= 0) return 0;
  return f > 1e12 ? Math.floor(f / 1000) : Math.floor(f);
};
