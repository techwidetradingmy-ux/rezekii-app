import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listCreatorContent } from "../../integrations/tiktok-shop/partner.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { creatorEntry } from "../tap/mytap.ts";

/**
 * Videos a creator posted for Rezekii samples, per Malaysia month ('YYYY-MM'), counted video by video from TikTok's own records
 * of each sampled product in Techwide's TAP campaigns (owner, 1 Nov 2026: 10 in a month makes Silver; one sample with 10 videos
 * counts). A video showing two sampled products counts once. Saved and read again after `maxAgeMs`; null when TikTok can't be read.
 */
const MYT = 8 * 3_600_000;
const SAMPLED = "sample_status=not.is.null&sample_status=neq.NotRequested";

export async function sampleVideoMonths(username: string, maxAgeMs = 6 * 3_600_000): Promise<Record<string, number> | null> {
  const user = username.toLowerCase();
  const enc = encodeURIComponent(user);
  const [saved] = (await (await supabaseRest(`sample_video_counts?username=eq.${enc}&select=months,at&limit=1`)).json().catch(() => [])) as { months: Record<string, number>; at: string }[];
  if (saved && Date.now() - Date.parse(saved.at) < maxAgeMs) return saved.months;
  const rows = (await (await supabaseRest(`tap_creator_products?username=eq.${enc}&${SAMPLED}&select=campaign_id,product_id,username,temp_id,temp_id_at,affiliate_product_id&limit=60`)).json().catch(() => [])) as {
    campaign_id: string; product_id: string; username: string; temp_id: string | null; temp_id_at: string | null; affiliate_product_id: string | null;
  }[];
  const months: Record<string, number> = {};
  if (rows.length) {
    const s = await storedSessions().partner().catch(() => null);
    if (!s) return saved?.months ?? null;
    const seen = new Map<string, string>();
    let failed = 0;
    for (const row of rows) {
      const entry = await creatorEntry(s.token, s.cipher, row).catch(() => null);
      if (!entry) { failed++; continue; }
      const r = await listCreatorContent(s.token, s.cipher, row.campaign_id, row.product_id, entry, "VIDEO").catch(() => null);
      if (!r || r.code !== 0) { failed++; continue; }
      for (const v of r.data?.creator_content_statistics ?? []) {
        const t = Number(v.published_date);
        if (!t) continue;
        const ms = t > 1e12 ? t : t * 1000;
        const key = v.linked_tiktok_video || v.source_url || `${row.product_id}:${t}`;
        seen.set(key, new Date(ms + MYT).toISOString().slice(0, 7));
      }
    }
    // TikTok didn't answer for any product: keep what was saved rather than saving zeros.
    if (failed === rows.length) return saved?.months ?? null;
    for (const m of seen.values()) months[m] = (months[m] ?? 0) + 1;
  }
  await supabaseRest("sample_video_counts?on_conflict=username", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ username: user, months, at: new Date().toISOString() }),
  }).catch(() => null);
  return months;
}
