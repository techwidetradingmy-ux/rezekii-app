import { supabaseRest } from "../../integrations/supabase/rest.ts";

export type HealthLine = { label: string; value: string; ok: boolean };
export type HealthError = { title: string; when: string; detail: string };
export type Health = { lines: HealthLine[]; refresh: { runDate: string | null; done: number; open: number; failed: number; lastAt: string | null }; errors: HealthError[] };

const day = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });
const until = (iso: string | undefined) => {
  if (!iso) return { ok: false, text: "Not connected" };
  const left = Date.parse(iso) - Date.now();
  if (left < 0) return { ok: false, text: "Expired · reconnect" };
  return { ok: true, text: `Connected · renews until ${day(iso)}` };
};

/** What Settings · System health and the admin Today show: connections, the daily refresh, and recent errors. */
export async function systemHealth(): Promise<Health> {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [[partner], [seller], tasks, failedPosts, expired] = await Promise.all([
    supabaseRest("partner_connections?select=name,refresh_token_expires_at&order=updated_at.desc&limit=1").then((r) => r.json() as Promise<{ name: string; refresh_token_expires_at: string }[]>),
    supabaseRest("seller_connections?select=shop_name,refresh_token_expires_at&order=updated_at.desc&limit=1").then((r) => r.json() as Promise<{ shop_name: string; refresh_token_expires_at: string }[]>),
    supabaseRest("refresh_tasks?select=run_date,key,status,last_error,updated_at&order=run_date.desc,updated_at.desc&limit=2000").then((r) => r.json() as Promise<{ run_date: string; key: string; status: string; last_error: string | null; updated_at: string }[]>),
    supabaseRest(`posts?status=eq.failed&updated_at=gte.${weekAgo}&select=tiktok_open_id,last_error,updated_at&order=updated_at.desc&limit=20`).then((r) => r.json() as Promise<{ tiktok_open_id: string; last_error: string | null; updated_at: string }[]>),
    supabaseRest(`tiktok_connections?refresh_token_expires_at=lt.${new Date().toISOString()}&select=open_id`, { headers: { prefer: "count=exact", range: "0-0" } }).then((r) => Number((r.headers.get("content-range") ?? "*/0").split("/")[1]) || 0),
  ]);
  const runDate = tasks[0]?.run_date ?? null;
  const run = tasks.filter((t) => t.run_date === runDate);
  const refresh = {
    runDate,
    done: run.filter((t) => t.status === "done").length,
    open: run.filter((t) => t.status === "pending" || t.status === "running").length,
    failed: run.filter((t) => t.status === "failed").length,
    lastAt: run.reduce<string | null>((m, t) => (!m || t.updated_at > m ? t.updated_at : m), null),
  };
  const p = until(partner?.refresh_token_expires_at);
  const s = until(seller?.refresh_token_expires_at);
  const lines: HealthLine[] = [
    { label: "TAP partner account", value: partner ? p.text : "Not connected", ok: !!partner && p.ok },
    { label: "Seller shop (best sellers)", value: seller ? s.text : "Not connected", ok: !!seller && s.ok },
    { label: "Daily refresh", value: refresh.runDate ? `${refresh.done} done${refresh.open ? ` · ${refresh.open} running` : ""}${refresh.failed ? ` · ${refresh.failed} failed` : ""}` : "Not run yet", ok: !!refresh.runDate && !refresh.failed },
    { label: "TikTok connections", value: expired ? `${expired} need reconnecting` : "All connected", ok: !expired },
  ];
  const errors: HealthError[] = [
    ...failedPosts.map((f) => ({ title: "Post failed", when: day(f.updated_at), detail: f.last_error ?? "No reason given" })),
    ...run.filter((t) => t.status === "failed" || t.last_error).slice(0, 10).map((t) => ({ title: `Refresh · ${t.key}`, when: day(t.updated_at), detail: t.last_error ?? "Failed" })),
  ];
  return { lines, refresh, errors };
}
