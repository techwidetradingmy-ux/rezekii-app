import webpush from "web-push";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { Lang } from "../../lib/i18n/lang.ts";
import { translate } from "../../lib/i18n/translate.ts";

/**
 * Phone notifications (owner, 3 Nov 2026): her notifications pushed to the devices where she turned Phone Notifications on in
 * Settings (table push_subscriptions). The service worker (public/sw.js) shows them and opens Rezekii when she taps one.
 */
export type App = "creator" | "seller";
export type PushSub = {
  id: string; user_id: string; app: App; endpoint: string; p256dh: string; auth: string; lang: Lang; user_agent: string | null;
  created_at: string; last_ok_at: string | null; fail_count: number; sent_ids: string[];
};
/** What the phone shows. `url` is a page in Rezekii, opened when she taps it; `tag` replaces an earlier one with the same tag. */
export type PushMessage = { title: string; body: string; url: string; tag?: string };
/** ok: the push service took it. gone: the device unsubscribed (404/410), so it's removed. failed: anything else. */
export type Outcome = "ok" | "gone" | "failed";
export type Tally = { devices: number; sent: number; dropped: number; failed: number };
/** A notification as feed.ts builds it (only what a push needs). */
export type NoteLike = { id: string; at: string; unread: boolean; title: string; line: string; href: string | null };

const DAY = 86_400_000;
const enc = encodeURIComponent;
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];
const minimal = { prefer: "return=minimal" };

/** Push services of the browsers that can get them (Chrome, Android, Samsung, Edge, Firefox, Safari and iPhone), so the server never posts anywhere else. */
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
const KEY = /^[A-Za-z0-9_-]+={0,2}$/;
export type NewSub = { endpoint: string; keys: { p256dh: string; auth: string } };

/** The subscription a browser sent (PushSubscription.toJSON()), or null when it isn't a real push address. */
export function cleanSub(v: unknown): NewSub | null {
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = typeof s?.endpoint === "string" ? s.endpoint : "";
  const p256dh = s?.keys?.p256dh;
  const auth = s?.keys?.auth;
  if (!endpoint || endpoint.length > 1000 || typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (p256dh.length > 200 || auth.length > 100 || !KEY.test(p256dh) || !KEY.test(auth)) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  return url.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(url.hostname)) ? { endpoint, keys: { p256dh, auth } } : null;
}

/** Saves this device for her (again, by its push address), with the app and language it uses. */
export async function saveSubscription(userId: string, app: App, sub: NewSub, lang: Lang, userAgent: string | null): Promise<void> {
  // A device that was someone else's, or the other app's, starts afresh, so it isn't sent what was there before.
  await supabaseRest(`push_subscriptions?endpoint=eq.${enc(sub.endpoint)}&or=(user_id.neq.${userId},app.neq.${app})`, { method: "DELETE", headers: minimal });
  await supabaseRest("push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, app, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, lang, user_agent: userAgent?.slice(0, 300) || null, fail_count: 0 }),
  });
}

/** Forgets this device for her (she turned Phone Notifications off). */
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await supabaseRest(`push_subscriptions?user_id=eq.${userId}&endpoint=eq.${enc(endpoint)}`, { method: "DELETE", headers: minimal });
}

let vapidReady: boolean | null = null;
/** The signing keys, set once. False (and nothing is sent) when they're missing. */
function vapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  try {
    if (!pub || !priv || !subject) throw new Error("not set");
    webpush.setVapidDetails(subject, pub, priv);
    vapidReady = true;
  } catch (err) {
    console.error("[push] signing keys:", err instanceof Error ? err.message : err);
    vapidReady = false;
  }
  return vapidReady;
}

/** Sends one message to one device. Kept for a day if the phone is off. */
export async function deliver(sub: Pick<PushSub, "endpoint" | "p256dh" | "auth">, msg: PushMessage): Promise<Outcome> {
  if (!vapid()) return "failed";
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), { TTL: DAY / 1000, timeout: 10_000 });
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}

/** Sends the messages to one device in order and keeps its record: removed when gone, failures counted, back to 0 when one goes through. */
export async function sendTo(sub: PushSub, msgs: PushMessage[]): Promise<Outcome> {
  let ok = false;
  let failed = false;
  for (const m of msgs) {
    const out = await deliver(sub, m);
    if (out === "gone") {
      await supabaseRest(`push_subscriptions?id=eq.${sub.id}`, { method: "DELETE", headers: minimal });
      return "gone";
    }
    if (out === "ok") ok = true;
    else failed = true;
  }
  if (!msgs.length) return "ok";
  await supabaseRest(`push_subscriptions?id=eq.${sub.id}`, {
    method: "PATCH",
    headers: minimal,
    body: JSON.stringify({ fail_count: failed ? sub.fail_count + 1 : 0, ...(ok ? { last_ok_at: new Date().toISOString() } : {}) }),
  });
  return failed ? "failed" : "ok";
}

const count = (t: Tally, out: Outcome) => {
  if (out === "ok") t.sent++;
  else if (out === "gone") t.dropped++;
  else t.failed++;
};

const SUB_COLUMNS = "id,user_id,app,endpoint,p256dh,auth,lang,user_agent,created_at,last_ok_at,fail_count,sent_ids";

/** Sends one message to every device where she turned Phone Notifications on in that app, each in its own language. `dryRun` sends nothing. */
export async function sendToUser(userId: string, app: App, msg: PushMessage | ((lang: Lang) => PushMessage), opts: { dryRun?: boolean } = {}): Promise<Tally & { preview: { device: string; message: PushMessage }[] }> {
  const subs = await rows<PushSub>(`push_subscriptions?user_id=eq.${userId}&app=eq.${app}&select=${SUB_COLUMNS}`);
  const tally: Tally = { devices: subs.length, sent: 0, dropped: 0, failed: 0 };
  const preview: { device: string; message: PushMessage }[] = [];
  for (const sub of subs) {
    const message = typeof msg === "function" ? msg(sub.lang) : msg;
    if (opts.dryRun) preview.push({ device: sub.id, message });
    else count(tally, await sendTo(sub, [message]));
  }
  return { ...tally, preview };
}

/**
 * What's new for this device: unread, not pushed to it before, and from after she turned it on (and the last 2 days), so turning it
 * on doesn't send what was already there. Topics she switched off never reach here (feed.ts leaves them out).
 */
export function pickNew<N extends NoteLike>(notes: N[], sub: Pick<PushSub, "created_at" | "sent_ids">, now = Date.now()): N[] {
  const sent = new Set(sub.sent_ids);
  const from = Math.max(Date.parse(sub.created_at), now - 2 * DAY);
  return notes.filter((n) => n.unread && !sent.has(n.id) && Date.parse(n.at) >= from);
}

/**
 * The pushes for what's new, oldest first: one each, or one "{n} New Notifications" when there are more than 3, so the phone doesn't
 * buzz again and again. Tapping opens the notification's page, or Notifications. The notification's own text is pushed as feed.ts
 * wrote it (English for now).
 */
export function messagesFor(fresh: NoteLike[], app: App, lang: Lang): PushMessage[] {
  const list = app === "seller" ? "/seller/app/notifications" : "/app/notifications";
  if (fresh.length > 3) return [{ title: translate(lang, "{n} New Notifications", { n: fresh.length }), body: translate(lang, "Open Rezekii to see them."), url: list, tag: "rz-new" }];
  return [...fresh]
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    // Sign-in steps (/api/…) and other sites open from Notifications instead.
    .map((n) => ({ title: n.title, body: n.line, url: n.href?.startsWith("/") && !n.href.startsWith("/api/") && !n.href.startsWith("//") ? n.href : list, tag: n.id.slice(0, 100) }));
}

/**
 * The quarter-hour step (api/cron/posts): pushes each person's new notifications to her devices. Notifications aren't stored (feed.ts
 * builds them from real events), so her list is built here as she'd see it, and each device keeps the ids already pushed to it
 * (written before sending, so nothing goes twice). `feed` is feed.ts's feedFor, passed in so this file needs nothing from the pages.
 * `dryRun` sends and saves nothing and says what it would send.
 */
export async function pushNewNotes(
  feed: (userId: string, side: App) => Promise<{ notes: NoteLike[] }>,
  opts: { dryRun?: boolean; now?: number } = {},
): Promise<Tally & { people: number; preview: { device: string; messages: PushMessage[] }[] }> {
  const now = opts.now ?? Date.now();
  const subs = await rows<PushSub>(`push_subscriptions?select=${SUB_COLUMNS}&order=user_id&limit=2000`);
  const people = new Map<string, PushSub[]>();
  for (const s of subs) people.set(`${s.user_id}:${s.app}`, [...(people.get(`${s.user_id}:${s.app}`) ?? []), s]);
  const tally: Tally = { devices: subs.length, sent: 0, dropped: 0, failed: 0 };
  const preview: { device: string; messages: PushMessage[] }[] = [];
  const one = async (list: PushSub[]) => {
    const { notes } = await feed(list[0].user_id, list[0].app);
    for (const sub of list) {
      const fresh = pickNew(notes, sub, now);
      if (!fresh.length) continue;
      const messages = messagesFor(fresh, sub.app, sub.lang);
      if (opts.dryRun) {
        preview.push({ device: sub.id, messages });
        continue;
      }
      await supabaseRest(`push_subscriptions?id=eq.${sub.id}`, { method: "PATCH", headers: minimal, body: JSON.stringify({ sent_ids: [...fresh.map((n) => n.id), ...sub.sent_ids].slice(0, 300) }) });
      count(tally, await sendTo(sub, messages));
    }
  };
  // A few people at a time.
  const all = [...people.values()];
  for (let i = 0; i < all.length; i += 4) {
    await Promise.all(all.slice(i, i + 4).map((list) => one(list).catch((err) => { tally.failed += list.length; console.error("[push]", err instanceof Error ? err.message : err); })));
  }
  return { ...tally, people: people.size, preview };
}
