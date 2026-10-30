import { randomInt } from "node:crypto";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { grant } from "./ledger.ts";
import { REFERRAL_DAYS, REFERRAL_REWARD } from "./rules.ts";

/**
 * Referrals (owner, 28-30 Oct 2026: real data from 31 Oct). Each account has one invite code; creators invite creators with
 * /r/CODE and sellers invite sellers with /s/CODE. The last link tapped in the 14 days before sign-up wins; a typed code works
 * too. The inviter is set when the account is made and never changes. Both sides get credits once the friend is successful:
 * links TikTok Shop (creators) or connects Seller Center (sellers) within 14 days of joining (owner, 31 Oct 2026).
 */

export type Side = "creator" | "seller";
/** The cookie a referral link or typed code leaves for sign-up: code, side, how, when. */
export const REF_COOKIE = "rz_ref";
export type RefCookie = { c: string; s: Side; v: "link" | "code"; t: number };

const DAY = 86400_000;
const CODE = /^[A-Z0-9]{4,12}$/;

export const cleanCode = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "");

export function readRefCookie(raw: string | undefined): RefCookie | null {
  try {
    const v = JSON.parse(raw ?? "") as RefCookie;
    return CODE.test(v.c) && (v.s === "creator" || v.s === "seller") && (v.v === "link" || v.v === "code") && Date.now() - v.t < REFERRAL_DAYS * DAY ? v : null;
  } catch {
    return null;
  }
}

/** The account that owns a code, or null. */
export async function ownerOf(code: string): Promise<string | null> {
  if (!CODE.test(code)) return null;
  const [r] = (await (await supabaseRest(`referral_codes?code=eq.${code}&select=user_id&limit=1`)).json()) as { user_id: string }[];
  return r?.user_id ?? null;
}

/** The account's invite code, made the first time from its name (letters, then two digits). */
export async function codeFor(user: { id: string; display_name: string | null; tiktok_username: string | null }): Promise<string> {
  const [have] = (await (await supabaseRest(`referral_codes?user_id=eq.${user.id}&select=code&limit=1`)).json()) as { code: string }[];
  if (have) return have.code;
  const base = (user.tiktok_username ?? user.display_name ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
  for (let i = 0; i < 6; i++) {
    const stem = base.length >= 3 ? base : `RZ${base}`;
    const code = `${stem}${randomInt(10, i < 3 ? 100 : 10000)}`.slice(0, 12);
    const res = await supabaseRest("referral_codes?on_conflict=code", {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify({ user_id: user.id, code }),
    }).catch(() => null);
    if (res && ((await res.json()) as unknown[]).length) return code;
    // Lost a race to our own second tap: the code is there now.
    const [again] = (await (await supabaseRest(`referral_codes?user_id=eq.${user.id}&select=code&limit=1`)).json()) as { code: string }[];
    if (again) return again.code;
  }
  throw new Error("Couldn't make an invite code. Please try again.");
}

/**
 * At sign-up: links a brand-new account to the friend who invited it. Only an account made in the last 30 minutes, only once,
 * never to itself.
 */
export async function attachReferral(userId: string, ref: RefCookie | null): Promise<void> {
  if (!ref) return;
  const [user] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=id,created_at&limit=1`)).json()) as { id: string; created_at: string }[];
  if (!user || Date.now() - Date.parse(user.created_at) > 30 * 60_000) return;
  const inviter = await ownerOf(ref.c);
  if (!inviter || inviter === user.id) return;
  await supabaseRest("referrals?on_conflict=friend_id", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ friend_id: user.id, inviter_id: inviter, side: ref.s, via: ref.v, clicked_at: new Date(ref.t).toISOString() }),
  });
}

type Ref = { friend_id: string; inviter_id: string; side: Side; joined_at: string; qualified_at: string | null; qualified_with: string | null };

/** The shop the friend linked and when, if any: their TikTok Shop creator account, or the Seller Center shop they connected. */
async function shopOf(friendId: string, side: Side): Promise<{ id: string; at: string } | null> {
  if (side === "creator") {
    const [c] = (await (await supabaseRest(`affiliate_connections?user_id=eq.${friendId}&select=creator_user_open_id,connected_at&limit=1`)).json()) as { creator_user_open_id: string; connected_at: string }[];
    return c ? { id: c.creator_user_open_id, at: c.connected_at } : null;
  }
  const [s] = (await (await supabaseRest(`seller_connections?connected_by=eq.${friendId}&select=shop_id,connected_at&order=connected_at.asc&limit=1`)).json()) as { shop_id: string; connected_at: string }[];
  return s ? { id: s.shop_id, at: s.connected_at } : null;
}

/** Marks friends successful once they meet the rule, and pays both sides once. Runs when either side opens Rewards. */
export async function settleReferrals(userId: string): Promise<void> {
  const open = (await (await supabaseRest(`referrals?or=(inviter_id.eq.${userId},friend_id.eq.${userId})&qualified_at=is.null&select=friend_id,inviter_id,side,joined_at,qualified_at,qualified_with`)).json()) as Ref[];
  for (const r of open) {
    const by = Date.parse(r.joined_at) + REFERRAL_DAYS * DAY;
    const shop = await shopOf(r.friend_id, r.side);
    if (!shop || Date.parse(shop.at) > by) continue;
    // One shop earns once: if it already counted for someone, this one doesn't.
    const ok = await supabaseRest(`referrals?friend_id=eq.${r.friend_id}&qualified_at=is.null`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ qualified_at: new Date().toISOString(), qualified_with: shop.id }),
    }).then((x) => x.json() as Promise<unknown[]>).catch(() => []);
    if (!ok.length) continue;
    const name = await nameOf(r.friend_id, r.side);
    await grant(r.inviter_id, r.side, { amount: REFERRAL_REWARD.inviter, kind: "referral", what: `Referral: ${name}`, ref: `referral:${r.friend_id}` });
    await grant(r.friend_id, r.side, { amount: REFERRAL_REWARD.friend, kind: "referral", what: "Joined with a friend's invite", ref: "referred" });
  }
}

async function nameOf(userId: string, side: Side): Promise<string> {
  if (side === "seller") {
    const [s] = (await (await supabaseRest(`seller_connections?connected_by=eq.${userId}&select=shop_name&order=connected_at.asc&limit=1`)).json()) as { shop_name: string }[];
    if (s?.shop_name) return s.shop_name;
  }
  const [u] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=display_name,tiktok_username&limit=1`)).json()) as { display_name: string | null; tiktok_username: string | null }[];
  return u?.tiktok_username ? `@${u.tiktok_username}` : u?.display_name ?? "A friend";
}

export type Friend = { name: string; joined: string; successful: boolean; next: string | null };

/** The friends who joined with this account's code on one side, newest first. */
export async function friendsOf(userId: string, side: Side): Promise<Friend[]> {
  const rows = (await (await supabaseRest(`referrals?inviter_id=eq.${userId}&side=eq.${side}&select=friend_id,joined_at,qualified_at&order=joined_at.desc&limit=200`)).json()) as { friend_id: string; joined_at: string; qualified_at: string | null }[];
  return Promise.all(rows.map(async (r) => {
    if (r.qualified_at) return { name: await nameOf(r.friend_id, side), joined: r.joined_at, successful: true, next: null };
    const late = Date.now() > Date.parse(r.joined_at) + REFERRAL_DAYS * DAY;
    const shop = await shopOf(r.friend_id, side);
    const next = late ? "Missed the 14 days" : shop ? "Counting soon" : side === "seller" ? "Connect Seller Center" : "Link TikTok Shop";
    return { name: await nameOf(r.friend_id, side), joined: r.joined_at, successful: false, next };
  }));
}
