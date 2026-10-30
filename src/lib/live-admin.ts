import type { Col, ExtTask, Ticket } from "./mock-admin";
import type { PipelineRequest } from "@/modules/tap/pipeline.ts";

/**
 * Sellers' real TAP requests in the Admin pipeline's ticket shape (owner, 30 Oct 2026: real data, same design). One ticket per
 * product request. Rates from TikTok arrive ×100.
 */

const COL: Record<string, Col> = { submitted: "New", in_review: "In review", approved: "To submit", with_tiktok: "Waiting on TikTok", live: "Live", not_approved: "Not approved" };
const MYT = { timeZone: "Asia/Kuala_Lumpur" } as const;
const when = (t: string) => `${new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...MYT })} ${new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...MYT })}`;
const day = (t: string) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...MYT });
function age(t: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60_000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

export function toTickets(requests: PipelineRequest[]): Ticket[] {
  return requests.map((r) => {
    const col = COL[r.status] ?? "New";
    const open = r.tiktok?.openRate ?? r.public_rate;
    const publicRate = open != null ? open / 100 : null;
    const hasCampaign = requests.some((x) => x.shop_id === r.shop_id && !!x.campaign_id);
    // New and in-review requests waiting more than a day are overdue (review within 1 working day).
    const waited = Date.now() - Date.parse(r.updated_at);
    const late = (col === "New" || col === "In review") && waited > 86_400_000;
    const sentAt = r.history.find((h) => h.stage === "with_tiktok")?.at;
    const tasks: ExtTask[] = !r.campaign_id || (col !== "Waiting on TikTok" && col !== "Live") ? [] : [
      { id: "c", name: "Techwide campaign for this shop", state: "Success", extId: r.campaign_id, at: sentAt ? when(sentAt) : "" },
      r.tiktok?.state === "not_registered"
        ? { id: "s", name: "Seller registers it in Seller Center", state: "Waiting", why: "Waiting for the seller to register it in Techwide's campaign in Seller Center." }
        : { id: "s", name: "Seller registers it in Seller Center", state: "Success", extId: "Registered", at: "" },
      col === "Live"
        ? { id: "a", name: "Approve on TikTok", state: "Success", extId: "Approved", at: when(r.updated_at) }
        : { id: "a", name: "Approve on TikTok", state: "Waiting", why: r.tiktok?.state === "pending" ? "Registered. Approve it on TikTok." : "Runs after the seller registers it." },
    ];
    const what =
      col === "New" ? `${r.samples_per_sku} samples · +${r.raise}%`
      : col === "In review" ? `Review · ${r.owner_name ?? "unassigned"}`
      : col === "To submit" ? "Ready to send to TikTok"
      : col === "Waiting on TikTok" ? (r.tiktok?.state === "pending" ? "Registered · approve on TikTok" : "Seller to register in Seller Center")
      : col === "Live" ? "Live in TAP"
      : (r.reason ?? "Not approved");
    return {
      id: `TAP-${r.id.slice(0, 4).toUpperCase()}`, col, shop: r.shop, what, age: age(r.updated_at), late, lateBy: late ? `Waiting ${age(r.updated_at)}` : undefined,
      shopId: r.shopCode ?? r.shop_id, source: "Rezekii (seller app)", owner: r.owner_name, campaign: r.campaign_id ?? "Not created yet", dates: `Submitted ${day(r.created_at)}`,
      items: [{
        name: r.product_name, img: r.product_image ?? undefined, publicRate, samples: r.samples_per_sku,
        rate: publicRate !== null ? publicRate + r.raise : r.raise, rateLabel: publicRate !== null ? undefined : `+${r.raise}%`,
      }],
      tasks,
      history: [{ when: when(r.created_at), what: "Submitted from Rezekii", who: r.shop }, ...r.history.map((h) => ({ when: when(h.at), what: h.what, who: h.who }))],
      notes: r.notes.map((n) => ({ who: n.who, when: when(n.at), text: n.text })),
      reason: col === "Not approved" ? r.reason ?? undefined : undefined,
      real: { id: r.id, hasCampaign, suggest: hasCampaign ? null : publicRate !== null ? publicRate + r.raise : null, pendingOnTikTok: r.tiktok?.state === "pending" },
    };
  });
}
