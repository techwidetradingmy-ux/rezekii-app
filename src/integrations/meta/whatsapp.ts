import { createHmac, timingSafeEqual } from "node:crypto";
import { GRAPH_VERSION, MetaError } from "./graph.ts";

/**
 * WhatsApp Cloud API for Techwide's own numbers (owner, 23 Nov 2026: WhatsApp Inbox in Admin). Server-only.
 * WHATSAPP_TOKEN is a system user's token from Meta Business Settings (whatsapp_business_messaging and
 * whatsapp_business_management); WHATSAPP_WABA_IDS lists the WhatsApp Business Accounts (comma-separated) whose numbers show in
 * Admin; WHATSAPP_VERIFY_TOKEN is the word Meta's webhook setup is given. Messages come in signed with the Meta app's secret.
 */
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const waReady = () => !!process.env.WHATSAPP_TOKEN && waAccounts().length > 0;
export const waAccounts = () => (process.env.WHATSAPP_WABA_IDS ?? "").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s));

function token(): string {
  const t = process.env.WHATSAPP_TOKEN;
  if (!t) throw new Error("WHATSAPP_TOKEN must be set");
  return t;
}

async function waFetch<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { authorization: `Bearer ${token()}`, ...(init.body ? { "content-type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string; code?: number; error_subcode?: number; error_data?: { details?: string } } };
  if (!res.ok || body.error) {
    const e = body.error ?? {};
    throw new MetaError(e.error_data?.details || e.error_user_msg || e.message || `HTTP ${res.status}`, e.code, e.error_subcode);
  }
  return body as T;
}

export type WaNumber = { id: string; account: string; phone: string; name: string; quality: string | null; status: string | null };

/** Every number in the listed WhatsApp Business Accounts. */
export async function waNumbers(): Promise<WaNumber[]> {
  const out: WaNumber[] = [];
  for (const account of waAccounts()) {
    const r = await waFetch<{ data?: { id: string; display_phone_number?: string; verified_name?: string; quality_rating?: string; status?: string }[] }>(
      `${account}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`,
    );
    for (const n of r.data ?? []) out.push({ id: n.id, account, phone: n.display_phone_number ?? n.id, name: n.verified_name ?? "", quality: n.quality_rating ?? null, status: n.status ?? null });
  }
  return out;
}

/** Whether this Meta app gets the account's messages (it must be subscribed to the account). */
export async function waSubscribed(account: string): Promise<boolean> {
  const r = await waFetch<{ data?: { whatsapp_business_api_data?: { id?: string } }[] }>(`${account}/subscribed_apps`);
  const app = process.env.META_APP_ID;
  return (r.data ?? []).some((a) => !app || a.whatsapp_business_api_data?.id === app);
}
export async function waSubscribe(account: string): Promise<void> {
  await waFetch(`${account}/subscribed_apps`, { method: "POST" });
}

/** Sends a text reply; Meta's message id. Only within 24 hours of the customer's last message (checked by the caller). */
export async function waSendText(numberId: string, to: string, text: string): Promise<string> {
  const r = await waFetch<{ messages?: { id: string }[] }>(`${numberId}/messages`, { body: { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text, preview_url: true } } });
  const id = r.messages?.[0]?.id;
  if (!id) throw new MetaError("WhatsApp didn't return the message.");
  return id;
}

/** A photo, voice note, video or file a customer sent: Meta keeps it about 30 days. */
export async function waMedia(mediaId: string): Promise<{ data: ArrayBuffer; type: string }> {
  const meta = await waFetch<{ url?: string; mime_type?: string }>(mediaId);
  if (!meta.url) throw new MetaError("WhatsApp no longer has this file.");
  const res = await fetch(meta.url, { headers: { authorization: `Bearer ${token()}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new MetaError(`WhatsApp file: HTTP ${res.status}`);
  return { data: await res.arrayBuffer(), type: meta.mime_type ?? res.headers.get("content-type") ?? "application/octet-stream" };
}

/** Meta signs each webhook with the app secret: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256 of the raw body. */
export function waSignatureOk(raw: string, header: string | null, secret = process.env.META_APP_SECRET): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

export type WaIn = { wamid: string; numberId: string; contact: string; name: string | null; kind: string; body: string | null; mediaId: string | null; mediaType: string | null; at: string };
export type WaStatus = { wamid: string; status: string; error: string | null; at: string };

type Media = { id?: string; mime_type?: string; caption?: string; filename?: string };
type RawMessage = {
  from?: string; id?: string; timestamp?: string; type?: string;
  text?: { body?: string };
  image?: Media; video?: Media; audio?: Media; document?: Media; sticker?: Media;
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  contacts?: { name?: { formatted_name?: string }; phones?: { phone?: string }[] }[];
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  reaction?: { emoji?: string };
};
type RawValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: RawMessage[];
  statuses?: { id?: string; status?: string; timestamp?: string; errors?: { title?: string; message?: string; error_data?: { details?: string } }[] }[];
};

const iso = (ts: string | undefined) => new Date((Number(ts) || Date.now() / 1000) * 1000).toISOString();

/** The words to show for a message, whatever its type. */
function bodyOf(m: RawMessage): string | null {
  switch (m.type) {
    case "text": return m.text?.body ?? null;
    case "image": case "video": case "document": return m[m.type]?.caption ?? (m.type === "document" ? m.document?.filename ?? null : null);
    case "location": {
      const l = m.location ?? {};
      return [l.name, l.address, l.latitude !== undefined && l.longitude !== undefined ? `https://maps.google.com/?q=${l.latitude},${l.longitude}` : null].filter(Boolean).join("\n") || null;
    }
    case "contacts": return (m.contacts ?? []).map((c) => [c.name?.formatted_name, ...(c.phones ?? []).map((p) => p.phone)].filter(Boolean).join(" ")).join("\n") || null;
    case "button": return m.button?.text ?? null;
    case "interactive": return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
    case "reaction": return m.reaction?.emoji ?? null;
    default: return null;
  }
}

/** The customers' messages and the delivery updates for ours in one webhook from Meta. */
export function parseWaWebhook(payload: unknown): { messages: WaIn[]; statuses: WaStatus[] } {
  const messages: WaIn[] = [];
  const statuses: WaStatus[] = [];
  const p = payload as { object?: string; entry?: { changes?: { field?: string; value?: RawValue }[] }[] };
  if (p?.object !== "whatsapp_business_account") return { messages, statuses };
  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const v = change.value;
      const numberId = v.metadata?.phone_number_id;
      if (!numberId) continue;
      const names = new Map((v.contacts ?? []).map((c) => [c.wa_id ?? "", c.profile?.name ?? null]));
      for (const m of v.messages ?? []) {
        if (!m.id || !m.from) continue;
        const media = m.type && ["image", "video", "audio", "document", "sticker"].includes(m.type) ? (m[m.type as "image"] as Media | undefined) : undefined;
        messages.push({ wamid: m.id, numberId, contact: m.from, name: names.get(m.from) ?? null, kind: m.type ?? "unsupported", body: bodyOf(m), mediaId: media?.id ?? null, mediaType: media?.mime_type ?? null, at: iso(m.timestamp) });
      }
      for (const s of v.statuses ?? []) {
        if (!s.id || !s.status) continue;
        const e = s.errors?.[0];
        statuses.push({ wamid: s.id, status: s.status, error: e ? e.error_data?.details ?? e.message ?? e.title ?? null : null, at: iso(s.timestamp) });
      }
    }
  }
  return { messages, statuses };
}
