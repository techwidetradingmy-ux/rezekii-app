import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { Lang, T } from "../../lib/i18n/lang.ts";
import { translate } from "../../lib/i18n/translate.ts";
import { errorLine } from "../posting/errors.ts";
import { creditLine } from "../rewards/ledger.ts";
import { REASON_TEXT, type Review } from "../tap/reviews.ts";
import { myWishes } from "../wishes/wishes.ts";
import { systemNotes } from "./system.ts";

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
/** The label each notification carries, so the important ones are easy to spot (owner, 31 Oct 2026). */
export type Category = "system" | "account" | "products" | "posts" | "rewards" | "chances";
const CATEGORY: [string, Category][] = [["sys:", "system"], ["a:", "account"], ["t:", "account"], ["shop:", "account"], ["rv:", "products"], ["sub:", "products"], ["r:", "products"], ["p:", "posts"], ["s:", "posts"], ["l:", "rewards"], ["j:", "rewards"], ["w:", "chances"]];
const categoryOf = (id: string): Category => CATEGORY.find(([p]) => id.startsWith(p))?.[1] ?? "account";
export type Feed = { notes: (Note & { unread: boolean; cat: Category })[]; unread: number };
/** What she can switch off in Settings (owner, 31 Oct 2026). Connection reminders always show: things stop working without them. */
export type Topic = "samples" | "chances" | "posts" | "rewards";
export type Prefs = Partial<Record<Topic, boolean>>;
const TOPIC: [string, Topic][] = [["l:", "rewards"], ["j:", "rewards"], ["p:", "posts"], ["s:", "posts"], ["r:", "samples"], ["sub:", "samples"], ["rv:", "samples"], ["w:", "chances"]];
const topicOf = (id: string): Topic | null => TOPIC.find(([p]) => id.startsWith(p))?.[1] ?? null;

const DAY = 86_400_000;
const enc = encodeURIComponent;
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];
const daysLeft = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY));
const APP = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" } as Record<string, string>;

/**
 * Notifications from real events (owner, 31 Oct 2026), newest first: credits in and out, invites that joined, posts that went out
 * or failed, connections that need renewing, and sample requests. Nothing is stored but what she has read, so every line is
 * written as it's read, in her language (owner, 3 Nov 2026).
 */
export async function notesFor(userId: string, side: Side, lang: Lang = "en"): Promise<Note[]> {
  const t: T = (en, vars) => translate(lang, en, vars);
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const base = side === "seller" ? "/seller/app" : "/app";
  const walletHref = side === "seller" ? "/seller/app/rewards/wallet" : "/app/account#wallet";
  // Everything read at once, Techwide's announcements too (owner, 2 Nov 2026: notifications were slow).
  const [ledger, invites, posts, social, accounts, shop, tiktok, samples, submissions, wishes, reviews, system] = await Promise.all([
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
    // Techwide's decisions on products her shop registered in its campaign (owner, 31 Oct 2026), with the reason when made in Rezekii.
    side === "seller"
      ? rows<{ shop_id: string }>(`seller_connections?connected_by=eq.${userId}&select=shop_id`).then((sh) =>
          sh.length ? rows<Review>(`product_reviews?shop_id=in.(${sh.map((x) => x.shop_id).join(",")})&decided_at=gte.${enc(since)}&decided_by=neq.backfill&select=*&order=decided_at.desc&limit=30`) : [],
        )
      : Promise.resolve([] as Review[]),
    systemNotes(side, t).catch(() => []),
  ]);

  const notes: Note[] = [];
  const credit = { welcome: "gift", mission: "trophy", chest: "gift", streak: "flame", referral: "users", refund: "refresh", admin: "wallet", expired: "wallet" } as const;
  const seeWallet = t("See wallet");
  for (const r of ledger) {
    if (r.kind === "expired") {
      const n = Math.abs(r.amount);
      notes.push({ id: `l:${r.id}`, at: r.created_at, icon: "wallet", title: n === 1 ? t("{n} credit expired", { n }) : t("{n} credits expired", { n }), line: t("Credits last 12 months. The oldest are used first."), href: walletHref, cta: seeWallet, urgent: null });
      continue;
    }
    if (r.amount <= 0) continue;
    const n = r.amount;
    const title = r.kind === "refund" ? (n === 1 ? t("{n} credit back", { n }) : t("{n} credits back", { n }))
      : r.kind === "mission" ? t("Mission done: {name}", { name: t(r.what.replace(/^Mission:\s*/i, "")) })
      : r.kind === "referral" ? t("Your invite counted")
      : creditLine(t, r.what);
    const line = r.kind === "refund" ? t("+{n} credits are in your wallet. {what}.", { n, what: creditLine(t, r.what) }) : n === 1 ? t("+{n} credit is in your wallet.", { n }) : t("+{n} credits are in your wallet.", { n });
    notes.push({ id: `l:${r.id}`, at: r.created_at, icon: credit[r.kind as keyof typeof credit] ?? "wallet", title, line, href: walletHref, cta: seeWallet, urgent: null });
  }
  for (const r of invites) {
    notes.push({ id: `j:${r.friend_id}`, at: r.joined_at, icon: "users", title: t("A friend joined with your invite"), line: side === "seller" ? t("It counts when they link their TikTok Shop within 14 days.") : t("It counts when they link TikTok Shop within 14 days."), href: side === "seller" ? "/seller/app/rewards/referral" : "/app/account#referral", cta: t("See invites"), urgent: null });
  }
  for (const p of posts) {
    const what = (p.caption ?? "").split("\n")[0].slice(0, 60) || t("Your video");
    if (p.status === "posted") notes.push({ id: `p:${p.id}:ok`, at: p.posted_at ?? p.updated_at, icon: "video", title: t("Posted to TikTok"), line: what, href: `${base}/publish/calendar`, cta: t("See posts"), urgent: null });
    else notes.push({ id: `p:${p.id}:fail`, at: p.updated_at, icon: "x", title: t("TikTok post didn't go out"), line: p.last_error ? errorLine(t, p.last_error) : what, href: `${base}/publish/calendar`, cta: t("Try again"), urgent: t("Failed") });
  }
  for (const p of social) {
    const app = APP[p.platform] ?? p.platform;
    const what = (p.caption ?? "").split("\n")[0].slice(0, 60) || t("Your post");
    if (p.status === "failed") notes.push({ id: `s:${p.id}:fail`, at: p.updated_at, icon: "x", title: t("{app} post didn't go out", { app }), line: p.last_error ? errorLine(t, p.last_error) : what, href: `${base}/publish/calendar`, cta: t("Try again"), urgent: t("Failed") });
    else if (p.posted_at) notes.push({ id: `s:${p.id}:ok`, at: p.posted_at, icon: "video", title: p.account_name ? t("Posted to {app} · {name}", { app, name: p.account_name }) : t("Posted to {app}", { app }), line: what, href: p.permalink ?? `${base}/publish/calendar`, cta: p.permalink ? t("Open post") : t("See posts"), urgent: null });
  }
  const connections = side === "seller" ? "/seller/app/account" : "/app/account#connections";
  const left = (iso: string) => { const n = daysLeft(iso); return n === 1 ? t("{n} day left", { n }) : t("{n} days left", { n }); };
  for (const a of accounts) {
    const app = APP[a.platform] ?? a.platform;
    const soon = a.token_expires_at && daysLeft(a.token_expires_at) <= 7;
    if (a.status !== "reconnect" && !soon) continue;
    notes.push({
      id: `a:${a.id}:${a.status === "reconnect" ? "re" : a.token_expires_at}`, at: a.status === "reconnect" || !a.token_expires_at ? a.updated_at : new Date(Date.parse(a.token_expires_at) - 7 * DAY).toISOString(),
      icon: "link", title: a.name ? t("Reconnect {app}: {name}", { app, name: a.name }) : t("Reconnect {app}", { app }), line: t("{app} asks you to sign in again from time to time. Until then, posts to it can't go out.", { app }),
      href: side === "seller" ? connections : `/api/auth/meta/${a.platform}/start?from=account`, cta: t("Reconnect"), urgent: a.status === "reconnect" ? t("Needs reconnecting") : left(a.token_expires_at!),
    });
  }
  for (const c of tiktok) {
    const soon = c.refresh_token_expires_at && daysLeft(c.refresh_token_expires_at) <= 7;
    if (c.status !== "reconnect" && !soon) continue;
    notes.push({
      id: `t:${c.open_id}:${c.status === "reconnect" ? "re" : c.refresh_token_expires_at}`, at: c.status === "reconnect" || !c.refresh_token_expires_at ? c.updated_at : new Date(Date.parse(c.refresh_token_expires_at) - 7 * DAY).toISOString(),
      icon: "link", title: c.username ? t("Reconnect TikTok @{name}", { name: c.username }) : t("Reconnect TikTok"), line: t("TikTok asks you to sign in again from time to time, so your posts keep going out."),
      href: "/api/auth/tiktok/start", cta: t("Reconnect"), urgent: c.status === "reconnect" ? t("Needs reconnecting") : left(c.refresh_token_expires_at!),
    });
  }
  const shopEnd = shop[0]?.refresh_token_expires_at;
  if (shopEnd && daysLeft(shopEnd) <= 30) {
    const n = daysLeft(shopEnd);
    notes.push({
      id: `shop:${shopEnd}`, at: new Date(Date.parse(shopEnd) - 30 * DAY).toISOString(), icon: "alert",
      title: !n ? t("Reconnect TikTok Shop") : n === 1 ? t("Reconnect TikTok Shop in {n} day", { n }) : t("Reconnect TikTok Shop in {n} days", { n }),
      line: t("TikTok asks you to approve access again every year. Reconnect so scans and commission numbers keep working."),
      href: "/api/auth/tiktokshop/start", cta: t("Reconnect"), urgent: n ? left(shopEnd) : t("Expired"),
    });
  }
  // Each step of a product she submitted, as whole lines with its name.
  const STEP: Record<string, [Note["icon"], (name: string) => string, string]> = {
    approved: ["check", (name) => t("{name} passed Techwide's review", { name }), t("Next: we send it to TikTok for the TAP campaign.")],
    with_tiktok: ["refresh", (name) => t("{name} is with TikTok", { name }), t("TikTok checks it before it joins the TAP campaign.")],
    live: ["check", (name) => t("{name} is live in the TAP campaign", { name }), t("Creators can now find it on Rezekii and add it to their showcase.")],
    not_approved: ["x", (name) => t("{name} wasn't approved", { name }), t("See why, change it and send it again.")],
  };
  for (const s of submissions) {
    const [icon, title, line] = STEP[s.status] ?? ["check", (name: string) => t("{name} was updated", { name }), ""];
    notes.push({ id: `sub:${s.id}:${s.status}`, at: s.updated_at, icon, title: title(s.product_name ?? t("Your product")), line: s.status === "not_approved" && s.reason ? s.reason : line, href: "/seller/app/progress", cta: t("See progress"), urgent: null });
  }
  for (const r of reviews) {
    const name = r.product_name ?? t("Your product");
    if (r.decision === "approved") notes.push({ id: `rv:${r.id}`, at: r.decided_at, icon: "check", title: t("Approved: {name}", { name }), line: t("Creators can now find it on Rezekii and add it to their showcase."), href: "/seller/app/submit", cta: t("See products"), urgent: null });
    else notes.push({ id: `rv:${r.id}`, at: r.decided_at, icon: "x", title: t("Not approved: {name}", { name }), line: r.reason ? t("{reason}. Change it in Seller Center and register again.", { reason: t(REASON_TEXT[r.reason] ?? r.reason) }) : t("Change it in Seller Center and register again."), href: "/seller/app/submit", cta: t("See why"), urgent: null });
  }
  // Her wishes: launched on Rezekii, or the seller said no.
  for (const w of wishes) {
    if (w.status === "On Rezekii") notes.push({ id: `w:${w.id}:live`, at: w.changed ?? w.at, icon: "check", title: t("Now on Rezekii: {name}", { name: w.name }), line: w.raise ? t("+{n}% for you. Add it to your showcase.", { n: w.raise }) : t("Add it to your showcase from the product page."), href: `/app/product/${w.id}`, cta: t("Open product"), urgent: null });
    if (w.status === "Seller said no") notes.push({ id: `w:${w.id}:no`, at: w.changed ?? w.at, icon: "x", title: t("Seller said no: {name}", { name: w.name }), line: t("It stays off Rezekii for now."), href: "/app/account#wish", cta: t("See wish list"), urgent: null });
  }
  for (const s of samples) {
    notes.push({ id: `r:${s.id}`, at: s.created_at, icon: "box", title: s.product_name ? t("Sample requested: {name}", { name: s.product_name }) : t("Sample requested"), line: t("You'll see TikTok's steps (approved, shipped, received) in Samples & Delivery."), href: "/app/account#samples", cta: t("See sample"), urgent: null });
  }
  // Techwide's announcements (as Techwide wrote them) and late or failed data updates, for everyone.
  for (const n of system) {
    notes.push({ id: n.id, at: n.at, icon: n.important ? "alert" : "check", title: n.title, line: n.line, href: null, cta: null, urgent: n.important ? t("Important") : null });
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
export async function feedFor(userId: string, side: Side, lang: Lang = "en"): Promise<Feed> {
  const [notes, state] = await Promise.all([notesFor(userId, side, lang), stateOf(userId, side)]);
  const read = new Set(state.read_ids);
  const shown = notes.filter((n) => { const t = topicOf(n.id); return !t || state.prefs[t] !== false; });
  const out = shown.map((n) => ({ ...n, cat: categoryOf(n.id), unread: n.at > state.seen_at && !read.has(n.id) }));
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
