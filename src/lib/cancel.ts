/**
 * Rezekii's cancel-rate standard (owner, 1 Nov 2026, option A). It is ours, not TikTok's: TikTok publishes no standard for a
 * creator's cancels. Under 10% is normal (green), 10–20% is watch (orange), 20% and over is high (red). A rate only gets a
 * colour from 5 items sold, so one cancelled order out of one doesn't read as 100%.
 */
export const CANCEL_MIN_ITEMS = 5;
export type CancelLevel = "ok" | "watch" | "high";
export const cancelLevel = (pct: number): CancelLevel => (pct >= 20 ? "high" : pct >= 10 ? "watch" : "ok");
export const CANCEL_LABEL: Record<CancelLevel, string> = { ok: "Normal", watch: "Watch", high: "High" };
/** A cancel rate as text: the percent from 5 items sold, below that the counts (owner, 2 Nov 2026: "2 of 2", not 100%). */
export const cancelText = (pct: number, items?: number, bad?: number) => (items !== undefined && items < CANCEL_MIN_ITEMS ? `${bad ?? 0} of ${items}` : `${pct}%`);
export const CANCEL_TIP = "Rezekii's standard, not TikTok's: under 10% is normal (green), 10–20% is watch (orange), 20% and over is high (red). Counted from 5 items sold.";
