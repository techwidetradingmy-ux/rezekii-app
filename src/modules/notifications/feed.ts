import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { myWishes } from "../wishes/wishes.ts";

export type Side = "creator" | "seller";
export type Note = {
  id: string;
  /** When it happened (ISO). */
  at: string;
  icon: "gift" | "trophy" | "flame" | "users" | "wallet" | "refresh" | "video" | "alert" | "x" | "link" | "box" | "check";
  title: string;
  line: string;
  href: string | null;
  cta: string | null;
  /** Short red tag for things that need her, e.g. "5 days left". */
  urgent: string | null;
};
export type Feed = { notes: (Note & { unread: boolean })[]; unread: number };
/** What she can switch off in Settings (owner, 31 Oct 2026). Connection reminders always show: things stop working without them. */
export type Topic = "samples" | "chances" | "posts" | "rewards";
export type Prefs = Partial<Record<Topic, boolean>>;
const TOPIC: [string, Topic][] = [["l:", "rewards"], ["j:", "rewards"], ["p:", "posts"], ["s:", "posts"], ["r:", "samples"], ["sub:", "samples"], ["w:", "chances"]];
const topicOf = (id: string): Topic | null => TOPIC.find(([p]) => id.startsWith(p))?.[1] ?? null;

const DAY = 86_400_000;
const enc = encodeURIComponent;
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY));
const APP = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" } as Record<string, string>;

/**
 * Notifications from real events (owner, 31 Oct 2026), newest first: credits in and out, invites that joined, posts that went out
 * or failed, connections that need renewing, and sample requests. Nothing is stored but what she has read.
 */
export async function notesFor(userId: string, side: Side): Promise<Note[]> {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const base = side === "seller" ? "/seller/app" : "/app";
  const walletHref = side === "seller" ? "/seller/app/rewards/wallet" : "/app/account#wallet";
  const [ledger, invites, posts, social, accounts, shop, tiktok, samples, submissions, wishes] = await Promise.all([
    rows<{ id: string; amount: number; kind: string; what: string; created_at: string; expires_at: string | null }>(
      `credit_ledger?user_id=eq.${userId}&side=eq.${side}&created_at=gte.${enc(since)}&kind=neq.post&select=id,amount,kind,what,created_at,expires_at&order=created_at.desc&limit=40`,
    ),
    rows<{ friend_id: string; joined_at: string }>(`referrals?inviter_id=eq.${userId}&side=eq.${side}&joined_at=gte.${enc(since)}&select=friend_id,joined_at&order=joined_at.desc&limit=20`),
    side === "creator"
      ? rows<{ id: string; status: string; caption: string | null; posted_at: string | null; updated_at: string; last_error: string | null }>(
          `posts?user_id=eq.${userId}&status=in.(posted,failed)&updated_at=gte.${enc(since)}&select=id,status,caption,posted_at,updated_at,last_error&order=updated_at.desc&limit=20`,
        )
      : Promise.resolve([]),
    rows<{ id: string; platform: string; account_name: string | null; status: string; caption: string | null; posted_at: string | null; updated_at: string; last_error: string | null; permalink: string | null }>(
      `social_posts?user_id=eq.${userId}&or=(status.eq.failed,posted_at.not.is.null)&updated_at=gte.${enc(since)}&select=id,platform,account_name,status,caption,posted_at,updated_at,last_error,permalink&order=updated_at.desc&limit=20`,
    ),
    rows<{ id: string; platform: string; name: string | null; status: string; token_expires_at: string | null; updated_at: string }>(`social_accounts?user_id=eq.${userId}&select=id,platform,name,status,token_expires_at,updated_at`),
    side === "creator" ? rows<{ refresh_token_expires_at: string | null }>(`affiliate_connections?user_id=eq.${userId}&select=refresh_token_expires_at&limit=1`) : Promise.resolve([]),
    rows<{ open_id: string; username: string | null; status: string; refresh_token_expires_at: string | null; updated_at: string }>(`tiktok_connections?user_id=eq.${userId}&select=open_id,username,status,refresh_token_expires_at,updated_at`),
    side === "creator"
      ? rows<{ id: string; product_name: string | null; created_at: string }>(`sample_requests?user_id=eq.${userId}&created_at=gte.${enc(since)}&select=id,product_name,created_at&order=created_at.desc&limit=20`)
      : Promise.resolve([]),
    side === "seller"
      ? rows<{ id: string; product_name: string | null; status: string; reason: string | null; updated_at: string }>(
          `tap_submissions?submitted_by=eq.${userId}&status=in.(approved,with_tiktok,live,not_approved)&updated_at=gte.${enc(since)}&select=id,product_name,status,reason,updated_at&order=updated_at.desc&limit=30`,
        )
      : Promise.resolve([]),
    side === "creator" ? myWishes(userId).catch(() => []) : Promise.resolve([]),
  ]);

  const notes: Note[] = [];
  const credit = { welcome: "gift", mission: "trophy", chest: "gift", streak: "flame", referral: "users", refund: "refresh", admin: "wallet", expired: "wallet" } as const;
  for (const r of ledger) {
    if (r.kind === "expired") {
      notes.push({ id: `l:${r.id}`, at: r.created_at, icon: "wallet", title: `${Math.abs(r.amount)} credits expired`, line: "Credits last 12 months. The oldest are used first.", href: walletHref, cta: "See wallet", urgent: null });
      continue;
    }
    if (r.amount <= 0) continue;
    const title = r.kind === "refund" ? `${r.amount} credits back` : r.kind === "mission" ? `Mission done: ${r.what.replace(/^Mission:\s*/i, "")}` : r.kind === "referral" ? "Your invite counted" : r.what;
    notes.push({ id: `l:${r.id}`, at: r.created_at, icon: credit[r.kind as keyof typeof credit] ?? "wallet", title, line: `+${r.amount} credits are in your wallet.${r.kind === "refund" ? ` ${r.what}.` : ""}`, href: walletHref, cta: "See wallet", urgent: null });
  }
  for (const r of invites) {
    notes.push({ id: `j:${r.friend_id}`, at: r.joined_at, icon: "users", title: "A friend joined with your invite", line: side === "seller" ? "It counts when they link their TikTok Shop within 14 days." : "It counts when they link TikTok Shop within 14 days.", href: side === "seller" ? "/seller/app/rewards/referral" : "/app/account#referral", cta: "See invites", urgent: null });
  }
  for (const p of posts) {
    const what = (p.caption ?? "").split("\n")[0].slice(0, 60) || "Your video";
    if (p.status === "posted") notes.push({ id: `p:${p.id}:ok`, at: p.posted_at ?? p.updated_at, icon: "video", title: "Posted to TikTok", line: what, href: `${base}/publish/calendar`, cta: "See posts", urgent: null });
    else notes.push({ id: `p:${p.id}:fail`, at: p.updated_at, icon: "x", title: "TikTok post didn't go out", line: p.last_error ?? what, href: `${base}/publish/calendar`, cta: "Try again", urgent: "Failed" });
  }
  for (const p of social) {
    const app = APP[p.platform] ?? p.platform;
    const what = (p.caption ?? "").split("\n")[0].slice(0, 60) || "Your post";
    if (p.status === "failed") notes.push({ id: `s:${p.id}:fail`, at: p.updated_at, icon: "x", title: `${app} post didn't go out`, line: p.last_error ?? what, href: `${base}/publish/calendar`, cta: "Try again", urgent: "Failed" });
    else if (p.posted_at) notes.push({ id: `s:${p.id}:ok`, at: p.posted_at, icon: "video", title: `Posted to ${app}${p.account_name ? ` · ${p.account_name}` : ""}`, line: what, href: p.permalink ?? `${base}/publish/calendar`, cta: p.permalink ? "Open post" : "See posts", urgent: null });
  }
  const connections = side === "seller" ? "/seller/app/account" : "/app/account#connections";
  for (const a of accounts) {
    const app = APP[a.platform] ?? a.platform;
    const soon = a.token_expires_at && daysLeft(a.token_expires_at) <= 7;
    if (a.status !== "reconnect" && !soon) continue;
    notes.push({
      id: `a:${a.id}:${a.status === "reconnect" ? "re" : a.token_expires_at}`, at: a.status === "reconnect" || !a.token_expires_at ? a.updated_at : new Date(Date.parse(a.token_expires_at) - 7 * DAY).toISOString(),
      icon: "link", title: `Reconnect ${app}${a.name ? `: ${a.name}` : ""}`, line: `${app} asks you to sign in again from time to time. Until then, posts to it can't go out.`,
      href: side === "seller" ? connections : `/api/auth/meta/${a.platform}/start?from=account`, cta: "Reconnect", urgent: a.status === "reconnect" ? "Needs reconnecting" : `${daysLeft(a.token_expires_at!)} days left`,
    });
  }
  for (const t of tiktok) {
    const soon = t.refresh_token_expires_at && daysLeft(t.refresh_token_expires_at) <= 7;
    if (t.status !== "reconnect" && !soon) continue;
    notes.push({
      id: `t:${t.open_id}:${t.status === "reconnect" ? "re" : t.refresh_token_expires_at}`, at: t.status === "reconnect" || !t.refresh_token_expires_at ? t.updated_at : new Date(Date.parse(t.refresh_token_expires_at) - 7 * DAY).toISOString(),
      icon: "link", title: `Reconnect TikTok${t.username ? ` @${t.username}` : ""}`, line: "TikTok asks you to sign in again from time to time, so your posts keep going out.",
      href: "/api/auth/tiktok/start", cta: "Reconnect", urgent: t.status === "reconnect" ? "Needs reconnecting" : `${daysLeft(t.refresh_token_expires_at!)} days left`,
    });
  }
  const shopEnd = shop[0]?.refresh_token_expires_at;
  if (shopEnd && daysLeft(shopEnd) <= 30) {
    const left = daysLeft(shopEnd);
    notes.push({
      id: `shop:${shopEnd}`, at: new Date(Date.parse(shopEnd) - 30 * DAY).toISOString(), icon: "alert",
      title: left ? `Reconnect TikTok Shop in ${left} day${left === 1 ? "" : "s"}` : "Reconnect TikTok Shop",
      line: "TikTok asks you to approve access again every year. Reconnect so scans and commission numbers keep working.",
      href: "/api/auth/tiktokshop/start", cta: "Reconnect", urgent: left ? `${left} day${left === 1 ? "" : "s"} left` : "Expired",
    });
  }
  const STEP: Record<string, [Note["icon"], string, string]> = {
    approved: ["check", "passed Techwide's review", "Next: we send it to TikTok for the TAP campaign."],
    with_tiktok: ["refresh", "is with TikTok", "TikTok checks it before it joins the TAP campaign."],
    live: ["check", "is live in the TAP campaign", "Creators can now find it on Rezekii and add it to their showcase."],
    not_approved: ["x", "wasn't approved", "See why, change it and send it again."],
  };
  for (const t of submissions) {
    const [icon, what, line] = STEP[t.status] ?? ["check", "was updated", ""];
    notes.push({ id: `sub:${t.id}:${t.status}`, at: t.updated_at, icon, title: `${t.product_name ?? "Your product"} ${what}`, line: t.status === "not_approved" && t.reason ? t.reason : line, href: "/seller/app/progress", cta: "See progress", urgent: null });
  }
  // Her wishes: launched on Rezekii, or the seller said no.
  for (const w of wishes) {
    if (w.status === "On Rezekii") notes.push({ id: `w:${w.id}:live`, at: w.changed ?? w.at, icon: "check", title: `Now on Rezekii: ${w.name}`, line: w.raise ? `+${w.raise}% for you. Add it to your showcase.` : "Add it to your showcase from the product page.", href: `/app/product/${w.id}`, cta: "Open product", urgent: null });
    if (w.status === "Seller said no") notes.push({ id: `w:${w.id}:no`, at: w.changed ?? w.at, icon: "x", title: `Seller said no: ${w.name}`, line: "It stays off Rezekii for now.", href: "/app/account#wish", cta: "See wish list", urgent: null });
  }
  for (const s of samples) {
    notes.push({ id: `r:${s.id}`, at: s.created_at, icon: "box", title: `Sample requested: ${s.product_name ?? "a product"}`, line: "You'll see TikTok's steps (approved, shipped, received) in Samples & Delivery.", href: "/app/account#samples", cta: "See sample", urgent: null });
  }
  return notes.sort((a, b) => (a.at < b.at ? 1 : -1));
}

type State = { seen_at: string; read_ids: string[]; prefs: Prefs };
async function stateOf(userId: string, side: Side): Promise<State> {
  const [row] = await rows<State>(`notification_state?user_id=eq.${userId}&side=eq.${side}&select=seen_at,read_ids,prefs&limit=1`);
  return row ?? { seen_at: new Date(0).toISOString(), read_ids: [], prefs: {} };
}
const upsertState = (body: Record<string, unknown>) =>
  supabaseRest("notification_state?on_conflict=user_id,side", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
  });

/** Her notifications with what's unread: anything after she last marked all as read that she hasn't opened. */
export async function feedFor(userId: string, side: Side): Promise<Feed> {
  const [notes, state] = await Promise.all([notesFor(userId, side), stateOf(userId, side)]);
  const read = new Set(state.read_ids);
  const shown = notes.filter((n) => { const t = topicOf(n.id); return !t || state.prefs[t] !== false; });
  const out = shown.map((n) => ({ ...n, unread: n.at > state.seen_at && !read.has(n.id) }));
  return { notes: out, unread: out.filter((n) => n.unread).length };
}

/** Marks one notification read, or all of them (everything up to now). */
export async function markRead(userId: string, side: Side, id: string | null): Promise<void> {
  const state = await stateOf(userId, side);
  await upsertState(
    id
      ? { user_id: userId, side, seen_at: state.seen_at, read_ids: [id, ...state.read_ids.filter((x) => x !== id)].slice(0, 300) }
      : { user_id: userId, side, seen_at: new Date().toISOString(), read_ids: [] },
  );
}

/** Which topics she wants in the app (all on until she changes one). */
export async function prefsOf(userId: string, side: Side): Promise<Record<Topic, boolean>> {
  const p = (await stateOf(userId, side)).prefs;
  return { samples: p.samples !== false, chances: p.chances !== false, posts: p.posts !== false, rewards: p.rewards !== false };
}
export async function savePrefs(userId: string, side: Side, prefs: Prefs): Promise<Record<Topic, boolean>> {
  const clean: Prefs = {};
  for (const t of ["samples", "chances", "posts", "rewards"] as Topic[]) if (typeof prefs[t] === "boolean") clean[t] = prefs[t];
  const state = await stateOf(userId, side);
  await upsertState({ user_id: userId, side, seen_at: state.seen_at, read_ids: state.read_ids, prefs: { ...state.prefs, ...clean } });
  return prefsOf(userId, side);
}
