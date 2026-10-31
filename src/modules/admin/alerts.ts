import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { layout, sendEmail } from "../../integrations/email/resend.ts";
import { dataNotice } from "../notifications/system.ts";
import { systemHealth } from "./health.ts";
import { pendingProducts } from "./tap.ts";

/**
 * Emails Techwide's admins when something needs them (owner, 31 Oct 2026: "who tells us when something fails?"): the daily
 * data update is late or failed, part of the system has a problem, or shops registered products to review. Checked every 15
 * minutes; each thing is emailed once (a problem that lasts, once a day).
 */
type Alert = { key: string; title: string; href: string };
/** On again (owner, 1 Nov 2026), with feedback and change requests, to the admins and to support@rezekii.com. */
export const ADMIN_ALERT_EMAILS = true;
const SUPPORT_INBOX = "support@rezekii.com";
const KEY = "admin_alerts_sent";
const MYT = 8 * 3_600_000;
const day = () => new Date(Date.now() + MYT).toISOString().slice(0, 10);

async function whatNeedsAdmins(): Promise<Alert[]> {
  const today = day();
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const [notice, health, shops, fb] = await Promise.all([
    dataNotice().catch(() => null),
    systemHealth().catch(() => null),
    supabaseRest("seller_connections?campaign_id=not.is.null&select=campaign_id,shop_name").then((r) => r.json() as Promise<{ campaign_id: string; shop_name: string | null }[]>).catch(() => []),
    supabaseRest(`feedback?status=eq.new&created_at=gte.${since}&select=id,kind,message&order=created_at.desc&limit=50`).then((r) => r.json() as Promise<{ id: string; kind: string; message: string }[]>).catch(() => []),
  ]);
  const out: Alert[] = [];
  if (notice) out.push({ key: notice.id, title: `${notice.title}. ${notice.line}`, href: "/admin" });
  for (const l of health?.lines ?? []) if (!l.ok) out.push({ key: `health:${l.label}:${today}`, title: `${l.label}: ${l.value}`, href: "/admin" });
  for (const s of shops) {
    const waiting = await pendingProducts(s.campaign_id).catch(() => null);
    for (const p of waiting?.products ?? []) out.push({ key: `review:${s.campaign_id}:${p.id}`, title: `${s.shop_name ?? p.shop ?? "A shop"} registered “${p.name}”. It's waiting for your review.`, href: "/admin/tap/review" });
  }
  // New feedback and change requests (owner, 1 Nov 2026).
  for (const f of fb) out.push({ key: `feedback:${f.id}`, title: `${f.kind}: “${f.message.length > 90 ? `${f.message.slice(0, 88)}…` : f.message}”`, href: "/admin/support/feedback" });
  return out;
}

/** Sends one email listing what's new since the last one. Returns how many things it listed. */
export async function sendAdminAlerts(): Promise<number> {
  if (!ADMIN_ALERT_EMAILS) return 0;
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${KEY}&select=value&limit=1`)).json()) as { value: { keys?: string[] } }[];
  const sent = new Set(row?.value?.keys ?? []);
  const fresh = (await whatNeedsAdmins()).filter((a) => !sent.has(a.key));
  if (!fresh.length) return 0;
  const admins = [...new Set([...((await (await supabaseRest("app_users?role=eq.admin&email=not.is.null&select=email")).json()) as { email: string }[]).map((a) => a.email), SUPPORT_INBOX])];
  const base = process.env.APP_URL ?? "https://rezekii.com";
  const n = fresh.length;
  await sendEmail({
    to: admins.slice(0, 50),
    subject: `Rezekii: ${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you`,
    ...layout({
      title: `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you`,
      lines: fresh.slice(0, 20).map((a) => `• ${a.title}`).concat(n > 20 ? [`…and ${n - 20} more.`] : []),
      button: { label: fresh.every((a) => a.href === "/admin/tap/review") ? "Review Products" : fresh.every((a) => a.href === "/admin/support/feedback") ? "Open Feedback Inbox" : "Open Admin", href: `${base}${fresh[0].href}` },
      foot: "You get this because you're a Rezekii admin. Each thing is emailed once. Rezekii · www.rezekii.com",
    }),
  });
  const keys = [...sent, ...fresh.map((a) => a.key)].slice(-1000);
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: KEY, value: { keys }, updated_at: new Date().toISOString() }) });
  return n;
}
