import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { layout, sendEmail } from "../../integrations/email/resend.ts";
import { extendCampaign } from "./campaigns.ts";
import { lastEndDay, longDay, toDay } from "./campaign-dates.ts";
import { tapOverview } from "./tap.ts";

/**
 * TAP campaigns ending soon (owner, 2 Nov 2026): once a day, every live or upcoming campaign with under 90 days left is moved
 * to the latest end TikTok allows (campaign and registration end together: 360 days from today once it is running), and
 * admins get one email listing what was extended. Tested on Techwide X Anker, 2 Nov 2026: 7 Nov 2026 → 28 Oct 2027.
 */
export const WATCH_DAYS = 90;
const KEY = "campaign_watch";
const AUTO = "campaign_auto_extend";
const SUPPORT_INBOX = "support@rezekii.com";
const MYT = 8 * 3_600_000;
const today = (now: number) => new Date(now + MYT).toISOString().slice(0, 10);

export type EndingCampaign = { id: string; name: string; end: string; daysLeft: number; lastDay: string };

const setting = async <T>(key: string): Promise<T | null> => {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${key}&select=value&limit=1`)).json().catch(() => [])) as { value: T }[];
  return row?.value ?? null;
};
const save = (key: string, value: unknown) =>
  supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }) });

/** Extend automatically (Admin › TAP › Campaigns). On unless an admin turns it off. */
export const autoExtendOn = async () => (await setting<boolean>(AUTO)) !== false;
export async function setAutoExtend(on: boolean): Promise<void> {
  await save(AUTO, on);
}

/** Live and upcoming campaigns with under 90 days left, soonest first, with the latest day TikTok allows now. */
export async function endingCampaigns(now = Date.now()): Promise<EndingCampaign[]> {
  const { campaigns } = await tapOverview();
  return campaigns
    .filter((c) => (c.status === "live" || c.status === "upcoming") && !c.hidden && c.start && c.end)
    .map((c) => ({ id: c.id, name: c.name, end: toDay(c.end), daysLeft: Math.ceil((c.end! * 1000 - now) / 86_400_000), lastDay: lastEndDay(c.start!, Math.floor(now / 1000)) }))
    .filter((c) => c.daysLeft < WATCH_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * The daily run, from the quarter-hour timer: from 9 am Malaysia time, once a day. Extends them (when Extend automatically is
 * on) and emails admins what changed, what failed, or, when it's off, what is waiting to be extended.
 */
export async function watchCampaigns(now = Date.now(), force = false): Promise<{ ran: boolean; extended: number; waiting: number; failed: number }> {
  const day = today(now);
  const state = (await setting<{ day?: string }>(KEY)) ?? {};
  if (!force && (state.day === day || new Date(now + MYT).getUTCHours() < 9)) return { ran: false, extended: 0, waiting: 0, failed: 0 };
  // Claimed first, so two timer runs can't both extend and email.
  await save(KEY, { day });
  const [ending, auto] = await Promise.all([endingCampaigns(now), autoExtendOn()]);
  const extended: [string, string, string][] = [];
  const failed: [string, string][] = [];
  const waiting = auto ? [] : ending;
  if (auto) {
    for (const c of ending) {
      const r = await extendCampaign(c.id, "Rezekii (automatic)").catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }));
      // Compared with TikTok's own end, not the saved list (which can be a day behind).
      if (r.ok) { if (r.end > r.from) extended.push([c.name, r.from, r.end]); }
      else failed.push([c.name, r.error]);
    }
  }
  if (extended.length || failed.length || waiting.length) {
    const admins = [...new Set([...((await (await supabaseRest("app_users?role=eq.admin&email=not.is.null&select=email")).json()) as { email: string }[]).map((a) => a.email), SUPPORT_INBOX])];
    const base = process.env.APP_URL ?? "https://rezekii.com";
    const lines = [
      ...(extended.length ? [`Extended ${extended.length} campaign${extended.length === 1 ? "" : "s"} to the latest date TikTok allows (campaign and registration):`, ...extended.map(([n, a, b]) => `• ${n}: ${longDay(a)} → ${longDay(b)}`)] : []),
      ...(failed.length ? [`Couldn't extend these. Please extend them in Rezekii or Partner Center:`, ...failed.map(([n, e]) => `• ${n}: ${e}`)] : []),
      ...(waiting.length ? [`Ending within ${WATCH_DAYS} days (Extend automatically is off):`, ...waiting.map((c) => `• ${c.name}: ends ${longDay(c.end)} (${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"} left), can run to ${longDay(c.lastDay)}`)] : []),
    ];
    await sendEmail({
      to: admins.slice(0, 50),
      subject: `Rezekii: TAP campaigns ${extended.length ? `· ${extended.length} extended` : "ending soon"}${failed.length ? ` · ${failed.length} failed` : ""}`,
      ...layout({ title: extended.length && !failed.length ? "TAP campaigns extended" : "TAP campaigns ending soon", lines, button: { label: "Open TAP Campaigns", href: `${base}/admin/tap/campaigns` }, foot: "You get this because you're a Rezekii admin. Checked every morning. Rezekii · www.rezekii.com" }),
    });
  }
  return { ran: true, extended: extended.length, waiting: waiting.length, failed: failed.length };
}
