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
