import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { listActivity, listAdmins, logActivity } from "./admins.ts";

const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];
type User = { id: string; display_name: string | null; email: string | null; tiktok_username: string | null; role: string };

/** Names for a set of accounts: their TikTok handle, else their name, else the start of their email. */
async function namesOf(ids: string[]): Promise<Map<string, { name: string; handle: string | null; role: string }>> {
  const want = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/.test(id));
  const out = new Map<string, { name: string; handle: string | null; role: string }>();
  for (let i = 0; i < want.length; i += 150) {
    for (const u of await rows<User>(`app_users?id=in.(${want.slice(i, i + 150).join(",")})&select=id,display_name,email,tiktok_username,role`)) {
      out.set(u.id, { name: u.display_name ?? u.email?.split("@")[0] ?? "Someone", handle: u.tiktok_username, role: u.role });
    }
  }
  return out;
}

/** The staff log: who did what and when (newest first). */
export async function auditList() {
  return (await listActivity(500)).map((a) => ({ at: a.at, actor: a.actor, kind: a.kind, what: a.what }));
}

export const CUSTOM_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export type CustomStatus = (typeof CUSTOM_STATUSES)[number];

/** Custom Service requests from sellers, newest first. */
export async function customList() {
  const list = await rows<{ id: string; user_id: string; shop: string | null; services: string[]; budget: string | null; goal: string | null; whatsapp: string; status: CustomStatus; created_at: string }>(
    "custom_requests?select=id,user_id,shop,services,budget,goal,whatsapp,status,created_at&order=created_at.desc&limit=500",
  );
  const names = await namesOf(list.map((r) => r.user_id));
  return list.map((r) => ({ ...r, who: names.get(r.user_id)?.name ?? "Seller" }));
}
export async function setCustomStatus(id: string, status: CustomStatus, actor: string): Promise<boolean> {
  const res = await supabaseRest(`custom_requests?id=eq.${id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ status }) });
  const [row] = (await res.json().catch(() => [])) as { shop: string | null }[];
  if (!res.ok || !row) return false;
  await logActivity(actor, "Business", `marked a Custom Service request from ${row.shop ?? "a seller"} as ${status}`);
  return true;
}

/** AI Video waitlist, in joining order (the order of their place). */
export async function waitlistList() {
  const list = await rows<{ user_id: string; types: string[]; videos: number; platforms: string[]; note: string | null; joined_at: string }>(
    "ai_video_waitlist?select=user_id,types,videos,platforms,note,joined_at&order=joined_at&limit=2000",
  );
  const names = await namesOf(list.map((r) => r.user_id));
  return list.map((r, i) => ({ spot: i + 1, name: names.get(r.user_id)?.name ?? "Creator", handle: names.get(r.user_id)?.handle ?? null, types: r.types, videos: r.videos, platforms: r.platforms, note: r.note, joined: r.joined_at }));
}

/** Who invited whom: joined, and whether it counted (a TikTok Shop linked within 14 days). */
export async function referralList() {
  const list = await rows<{ friend_id: string; inviter_id: string; side: string; via: string | null; clicked_at: string | null; joined_at: string | null; qualified_at: string | null }>(
    "referrals?select=friend_id,inviter_id,side,via,clicked_at,joined_at,qualified_at&order=joined_at.desc.nullslast&limit=1000",
  );
  const names = await namesOf(list.flatMap((r) => [r.friend_id, r.inviter_id]));
  const name = (id: string) => { const n = names.get(id); return n?.handle ? `@${n.handle}` : n?.name ?? "Someone"; };
  return list.map((r) => ({ side: r.side, via: r.via, inviter: name(r.inviter_id), friend: name(r.friend_id), joined: r.joined_at, qualified: r.qualified_at }));
}

/** Every credit in and out (newest first, latest 1,000), with whose wallet. */
export async function ledgerList() {
  const list = await rows<{ id: string; user_id: string; side: string; amount: number; kind: string; what: string; created_at: string; expires_at: string | null }>(
    "credit_ledger?select=id,user_id,side,amount,kind,what,created_at,expires_at&order=created_at.desc&limit=1000",
  );
  const names = await namesOf(list.map((r) => r.user_id));
  return list.map((r) => { const n = names.get(r.user_id); return { ...r, who: n?.handle ? `@${n.handle}` : n?.name ?? "Someone" }; });
}

/** Feedback from the form, newest first, with who sent it (screenshots only on request, they're large). */
export async function feedbackList() {
  const list = await rows<{ id: string; user_id: string; kind: string; message: string; mood: number | null; reply_by: string; page: string | null; device: string | null; status: string; created_at: string }>(
    "feedback?select=id,user_id,kind,message,mood,reply_by,page,device,status,created_at&order=created_at.desc&limit=500",
  );
  const shots = new Set((await rows<{ id: string }>("feedback?screenshot=not.is.null&select=id&limit=500")).map((r) => r.id));
  const ids = [...new Set(list.map((r) => r.user_id))];
  const users = new Map<string, { name: string; handle: string | null; email: string | null }>();
  for (let i = 0; i < ids.length; i += 150) {
    for (const u of await rows<User>(`app_users?id=in.(${ids.slice(i, i + 150).join(",")})&select=id,display_name,email,tiktok_username,role`)) {
      users.set(u.id, { name: u.display_name ?? u.email?.split("@")[0] ?? "Someone", handle: u.tiktok_username, email: u.email });
    }
  }
  return list.map((r) => ({ ...r, shot: shots.has(r.id), who: users.get(r.user_id) ?? { name: "Someone", handle: null, email: null } }));
}
export async function feedbackShot(id: string): Promise<string | null> {
  const [row] = await rows<{ screenshot: string | null }>(`feedback?id=eq.${id}&select=screenshot&limit=1`);
  return row?.screenshot ?? null;
}
export async function setFeedbackStatus(id: string, status: "new" | "handled", actor: string): Promise<boolean> {
  const res = await supabaseRest(`feedback?id=eq.${id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ status }) });
  if (res.ok) await logActivity(actor, "Business", `marked a feedback message as ${status}`);
  return res.ok;
}

/** Who has admin access, as Settings keeps it. */
export const adminList = listAdmins;

/** Every Seller Center shop connected to Rezekii, who connected it, and its TAP products by stage. */
export async function sellerList() {
  const shops = await rows<{ shop_id: string; shop_name: string; shop_code: string | null; region: string | null; connected_at: string; updated_at: string; connected_by: string | null }>(
    "seller_connections?select=shop_id,shop_name,shop_code,region,connected_at,updated_at,connected_by&order=connected_at.desc&limit=1000",
  );
  const subs = await rows<{ shop_id: string; status: string }>("tap_submissions?select=shop_id,status&limit=10000");
  const names = await namesOf(shops.map((s) => s.connected_by ?? "").filter(Boolean));
  const contacts = new Map<string, { contact?: string; phone?: string }>();
  const ids = shops.map((s) => s.connected_by).filter((x): x is string => !!x && /^[0-9a-f-]{36}$/.test(x));
  if (ids.length) for (const p of await rows<{ user_id: string; details: { contact?: string; phone?: string } }>(`profiles?side=eq.seller&user_id=in.(${[...new Set(ids)].join(",")})&select=user_id,details`)) contacts.set(p.user_id, p.details);
  return shops.map((s) => {
    const mine = subs.filter((x) => x.shop_id === s.shop_id);
    const c = s.connected_by ? contacts.get(s.connected_by) : undefined;
    return {
      id: s.shop_id, name: s.shop_name, code: s.shop_code, region: s.region, connected: s.connected_at,
      owner: s.connected_by ? names.get(s.connected_by)?.name ?? null : null, contact: c?.contact ?? null, phone: c?.phone ?? null,
      live: mine.filter((x) => x.status === "live").length, open: mine.filter((x) => ["submitted", "in_review", "approved", "with_tiktok"].includes(x.status)).length,
      declined: mine.filter((x) => x.status === "not_approved").length,
    };
  });
}

/**
 * The consent log: every agreement and withdrawal, newest first, with the TikTok Shop link it led to. Accounts linked before
 * the log started (31 Oct 2026) are counted separately; they have no record.
 */
export async function consentList() {
  const [list, links] = await Promise.all([
    rows<{ id: string; user_id: string; role: string; action: string; terms: string; privacy: string; ip: string | null; user_agent: string | null; created_at: string }>(
      "consents?select=id,user_id,role,action,terms,privacy,ip,user_agent,created_at&order=created_at.desc&limit=2000",
    ),
    rows<{ user_id: string | null; username: string | null; connected_at: string }>("affiliate_connections?user_id=not.is.null&select=user_id,username,connected_at&limit=5000"),
  ]);
  const names = await namesOf(list.map((r) => r.user_id));
  const linkOf = new Map(links.map((l) => [l.user_id!, l]));
  const recorded = new Set(list.map((r) => r.user_id));
  return {
    entries: list.map((r) => {
      const l = linkOf.get(r.user_id);
      return { ...r, who: names.get(r.user_id)?.name ?? "Someone", handle: names.get(r.user_id)?.handle ?? null, linked: l ? { shop: l.username, at: l.connected_at } : null };
    }),
    before: links.filter((l) => l.user_id && !recorded.has(l.user_id)).length,
  };
}

export const DISPUTE_KINDS = ["Sample not received", "Creator overdue", "Seller complaint", "Creator complaint", "Other"] as const;
type Dispute = { id: string; kind: string; creator: string | null; shop: string | null; product: string | null; detail: string; status: "open" | "waiting" | "resolved"; outcome: string | null; owner: string | null; opened_by: string; created_at: string; updated_at: string };

/**
 * Disputes: the cases staff opened, plus creators TikTok shows with a TAP sample received and no content yet (TikTok's
 * "ContentPending"), so a late video is seen before anyone complains.
 */
export async function disputeList() {
  const [cases, waiting] = await Promise.all([
    rows<Dispute>("disputes?select=*&order=created_at.desc&limit=1000"),
    rows<{ username: string; product_name: string | null; shop: string | null; videos: number; updated_at: string }>(
      "tap_creator_products?sample_status=eq.ContentPending&select=username,product_name,shop,videos,updated_at&order=updated_at&limit=500",
    ),
  ]);
  return { cases, waiting: waiting.map((w) => ({ creator: `@${w.username}`, product: w.product_name, shop: w.shop, videos: w.videos, since: w.updated_at })) };
}
export async function openDispute(d: { kind: string; creator?: string; shop?: string; product?: string; detail: string }, actor: string): Promise<boolean> {
  const t = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) || null : null);
  const res = await supabaseRest("disputes", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ kind: d.kind, creator: t(d.creator, 80), shop: t(d.shop, 120), product: t(d.product, 200), detail: d.detail.trim().slice(0, 1000), opened_by: actor, owner: actor }),
  });
  if (res.ok) await logActivity(actor, "Business", `opened a dispute: ${d.kind}${d.creator ? ` (${d.creator})` : ""}`);
  return res.ok;
}
export async function updateDispute(id: string, patch: { status?: "open" | "waiting" | "resolved"; outcome?: string; owner?: string }, actor: string): Promise<boolean> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) body.status = patch.status;
  if (typeof patch.outcome === "string") body.outcome = patch.outcome.trim().slice(0, 500) || null;
  if (typeof patch.owner === "string") body.owner = patch.owner.slice(0, 80);
  const res = await supabaseRest(`disputes?id=eq.${id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(body) });
  if (res.ok) await logActivity(actor, "Business", `updated a dispute${patch.status ? ` to ${patch.status}` : ""}`);
  return res.ok;
}
