import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { waSendText, type WaIn, type WaStatus } from "../../integrations/meta/whatsapp.ts";

/**
 * WhatsApp Inbox (owner, 23 Nov 2026): customers' messages to Techwide's WhatsApp numbers, kept in wa_messages and wa_chats,
 * read and answered in Admin › Support › WhatsApp Inbox. Replies are free for 24 hours after the customer's last message; after
 * that WhatsApp only takes paid templates, which stay off until the founders decide.
 */
export const FREE_HOURS = 24;
const DAY_MS = FREE_HOURS * 3600_000;

const post = (body: unknown, prefer: string): RequestInit => ({ method: "POST", headers: { prefer }, body: JSON.stringify(body) });

/** Hours left to reply for free (0 when the window has closed or the customer never wrote). */
export function freeHoursLeft(lastInAt: string | null, now = Date.now()): number {
  if (!lastInAt) return 0;
  const left = new Date(lastInAt).getTime() + DAY_MS - now;
  return left > 0 ? Math.ceil(left / 3600_000) : 0;
}

/** A Malaysian number as WhatsApp writes it: digits only, 012… becomes 6012…. */
export function waDigits(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.startsWith("0") ? `6${d}` : d;
}

const shortText = (m: { kind: string; body: string | null }) => (m.body ? m.body.slice(0, 200) : `[${m.kind}]`);

/** Keeps what Meta sent: new messages (each once) with their chats, and delivery updates for our replies. */
export async function saveWebhook({ messages, statuses }: { messages: WaIn[]; statuses: WaStatus[] }): Promise<void> {
  if (messages.length) {
    await supabaseRest(
      "wa_messages?on_conflict=wamid",
      post(messages.map((m) => ({ wamid: m.wamid, number_id: m.numberId, contact: m.contact, direction: "in", kind: m.kind, body: m.body, media_id: m.mediaId, media_type: m.mediaType, status: "received", at: m.at })), "resolution=ignore-duplicates,return=minimal"),
    );
    // The newest message per chat updates it (Meta can send several in one go).
    const latest = new Map<string, WaIn>();
    for (const m of messages) {
      const k = `${m.numberId}:${m.contact}`;
      if (!latest.has(k) || latest.get(k)!.at < m.at) latest.set(k, m);
    }
    for (const m of latest.values()) {
      await supabaseRest(
        "wa_chats?on_conflict=number_id,contact",
        post({ number_id: m.numberId, contact: m.contact, ...(m.name ? { name: m.name } : {}), last_at: m.at, last_in_at: m.at, last_text: shortText(m) }, "resolution=merge-duplicates,return=minimal"),
      );
    }
  }
  for (const s of statuses) await setStatus(s);
}

// A later update never goes back: "delivered" arriving after "read" is ignored; "failed" always counts.
const ORDER = ["accepted", "sent", "delivered", "read"];
async function setStatus(s: WaStatus): Promise<void> {
  const rank = ORDER.indexOf(s.status);
  const later = rank >= 0 ? ORDER.slice(rank + 1) : [];
  const guard = later.length ? `&status=not.in.(${later.join(",")})` : "";
  await supabaseRest(`wa_messages?wamid=eq.${encodeURIComponent(s.wamid)}&direction=eq.out${s.status === "failed" ? "" : guard}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ status: s.status, ...(s.error ? { error: s.error.slice(0, 300) } : {}) }),
  });
}

type ChatRow = { number_id: string; contact: string; name: string | null; last_at: string; last_in_at: string | null; last_text: string | null; seen_at: string | null };
export type Chat = ChatRow & { unread: boolean; freeHours: number; member: { name: string; handle: string | null; role: string } | null };

/** Rezekii accounts by WhatsApp number, from their delivery addresses and Custom Service requests. */
async function membersByNumber(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const [addresses, requests] = await Promise.all([
    supabaseRest("delivery_addresses?select=user_id,phone:address->>phone&limit=5000").then((r) => r.json() as Promise<{ user_id: string; phone: string | null }[]>),
    supabaseRest("custom_requests?select=user_id,whatsapp&limit=5000").then((r) => r.json() as Promise<{ user_id: string; whatsapp: string | null }[]>),
  ]);
  for (const a of addresses) if (a.phone) out.set(waDigits(a.phone), a.user_id);
  for (const c of requests) if (c.whatsapp) out.set(waDigits(c.whatsapp), c.user_id);
  return out;
}

/** Chats, newest first, with whether they have new messages, the free hours left and the Rezekii account the number belongs to. */
export async function listChats(): Promise<Chat[]> {
  const rows = (await (await supabaseRest("wa_chats?select=number_id,contact,name,last_at,last_in_at,last_text,seen_at&order=last_at.desc&limit=300")).json()) as ChatRow[];
  const byNumber = rows.length ? await membersByNumber() : new Map<string, string>();
  const ids = [...new Set(rows.map((r) => byNumber.get(r.contact)).filter((x): x is string => !!x))];
  const users = ids.length
    ? ((await (await supabaseRest(`app_users?id=in.(${ids.join(",")})&select=id,display_name,email,tiktok_username,role`)).json()) as { id: string; display_name: string | null; email: string | null; tiktok_username: string | null; role: string }[])
    : [];
  const names = new Map(users.map((u) => [u.id, { name: u.display_name ?? u.email?.split("@")[0] ?? "Member", handle: u.tiktok_username, role: u.role }]));
  return rows.map((r) => ({
    ...r,
    unread: !!r.last_in_at && (!r.seen_at || r.last_in_at > r.seen_at),
    freeHours: freeHoursLeft(r.last_in_at),
    member: names.get(byNumber.get(r.contact) ?? "") ?? null,
  }));
}

export type Message = { wamid: string; direction: "in" | "out"; kind: string; body: string | null; media_id: string | null; media_type: string | null; status: string | null; error: string | null; sent_by: string | null; at: string };

/** One chat's latest 200 messages, oldest first; opening it marks it seen. */
export async function chatMessages(numberId: string, contact: string): Promise<Message[]> {
  const q = `number_id=eq.${encodeURIComponent(numberId)}&contact=eq.${encodeURIComponent(contact)}`;
  const list = (await (await supabaseRest(`wa_messages?${q}&select=wamid,direction,kind,body,media_id,media_type,status,error,sent_by,at&order=at.desc&limit=200`)).json()) as Message[];
  await supabaseRest(`wa_chats?${q}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ seen_at: new Date().toISOString() }) });
  return list.reverse();
}

/** Sends a free reply. Refused when the chat isn't ours or 24 hours have passed since the customer's last message. */
export async function reply(numberId: string, contact: string, text: string, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = `number_id=eq.${encodeURIComponent(numberId)}&contact=eq.${encodeURIComponent(contact)}`;
  const [chat] = (await (await supabaseRest(`wa_chats?${q}&select=last_in_at`)).json()) as { last_in_at: string | null }[];
  if (!chat) return { ok: false, error: "This chat isn't in the inbox." };
  if (freeHoursLeft(chat.last_in_at) === 0) return { ok: false, error: "The free 24 hours have passed. WhatsApp only takes paid templates now, and those are off." };
  let wamid: string;
  try {
    wamid = await waSendText(numberId, contact, text);
  } catch (err) {
    return { ok: false, error: `WhatsApp didn't send it: ${err instanceof Error ? err.message : "please try again"}` };
  }
  const at = new Date().toISOString();
  await supabaseRest("wa_messages", post({ wamid, number_id: numberId, contact, direction: "out", kind: "text", body: text, status: "accepted", sent_by: by, at }, "return=minimal"));
  await supabaseRest(`wa_chats?${q}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ last_at: at, last_text: text.slice(0, 200), seen_at: at }) });
  return { ok: true };
}
