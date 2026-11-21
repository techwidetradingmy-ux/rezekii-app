import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { balanceOf, grant, spend, type Side } from "./ledger.ts";
import { POST_CREDITS } from "./rules.ts";
import { makeT, type T } from "../../lib/i18n/lang.ts";

/** English, as written; routes pass the reader's language. */
const EN: T = makeT(null);

/**
 * Post Everywhere costs credits (owner, 28 Oct 2026; real from 31 Oct): POST_CREDITS per channel when a post is scheduled or
 * sent now. Drafts are free. A channel that fails or is cancelled gets its credits back, once. Trying a failed channel again
 * charges again. Each charge is "post:<channel post id>:<n>" and its refund "refund:<id>:<n>", so nothing pays twice.
 */

export type Charged = { id: string; app: string };
const NAMES: Record<string, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };
const sideOf = (v: unknown): Side => (v === "seller" ? "seller" : "creator");
export { sideOf as postSide };

/**
 * Posting is free for Admins and the accounts Meta reviews with (app setting meta_review_users, e.g. testtest): owner, 21 Nov
 * 2026. Everyone else pays per channel.
 */
export async function postsFree(userId: string): Promise<boolean> {
  const [[user], [review]] = await Promise.all([
    supabaseRest(`app_users?id=eq.${userId}&select=role`).then((r) => r.json() as Promise<{ role: string }[]>).catch(() => []),
    supabaseRest("app_settings?key=eq.meta_review_users&select=value").then((r) => r.json() as Promise<{ value: unknown }[]>).catch(() => []),
  ]);
  return user?.role === "admin" || (Array.isArray(review?.value) && review.value.includes(userId));
}

/** Can this wallet pay for this many channels? */
export async function canPay(userId: string, side: Side, channels: number): Promise<boolean> {
  return channels === 0 || (await postsFree(userId)) || (await balanceOf(userId, side)) >= channels * POST_CREDITS;
}

type Charge = { id: string; n: number; side: Side; refunded: boolean };

/** Every channel post this account was charged for, with its latest charge and whether that was refunded. */
async function charges(userId: string, ids?: string[]): Promise<Map<string, Charge>> {
  const filter = ids ? `&or=(${ids.flatMap((id) => [`ref.like."post:${id}:*"`, `ref.like."refund:${id}:*"`]).join(",")})` : `&or=(ref.like."post:*",ref.like."refund:*")`;
  const rows = (await (await supabaseRest(`credit_ledger?user_id=eq.${userId}${filter}&select=ref,side&limit=5000`)).json()) as { ref: string; side: Side }[];
  const out = new Map<string, Charge>();
  for (const r of rows) {
    const m = /^post:([0-9a-f-]{36}):(\d+)$/.exec(r.ref);
    if (!m) continue;
    const n = Number(m[2]);
    const had = out.get(m[1]);
    if (!had || n > had.n) out.set(m[1], { id: m[1], n, side: r.side, refunded: false });
  }
  for (const r of rows) {
    const m = /^refund:([0-9a-f-]{36}):(\d+)$/.exec(r.ref);
    const c = m ? out.get(m[1]) : undefined;
    if (c && c.n === Number(m![2])) c.refunded = true;
  }
  return out;
}

/**
 * Charges each channel post once. All or nothing: if the wallet runs short part way, what was charged is refunded and the
 * caller cancels the posts.
 */
export async function chargePosts(userId: string, side: Side, posts: Charged[], t: T = EN): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!posts.length || (await postsFree(userId))) return { ok: true };
  const had = await charges(userId, posts.map((p) => p.id));
  const done: Charged[] = [];
  for (const p of posts) {
    const c = had.get(p.id);
    if (c && !c.refunded) continue;
    const n = (c?.n ?? 0) + 1;
    const r = await spend(userId, side, POST_CREDITS, `post:${p.id}:${n}`, `Post Everywhere · ${NAMES[p.app] ?? p.app}`);
    if (!r.ok) {
      for (const d of done) await refundOne(userId, side, d, "cancelled");
      return { ok: false, error: t("Not enough credits: each channel takes {n}. Earn more or save as a draft.", { n: POST_CREDITS }) };
    }
    done.push(p);
  }
  return { ok: true };
}

async function refundOne(userId: string, side: Side, p: Charged, why: "failed" | "cancelled", n?: number) {
  const c = n ?? (await charges(userId, [p.id])).get(p.id)?.n;
  if (!c) return;
  await grant(userId, side, { amount: POST_CREDITS, kind: "refund", what: `Refund: ${NAMES[p.app] ?? p.app} post ${why}`, ref: `refund:${p.id}:${c}` });
}

/**
 * Gives back credits for channels that failed or were cancelled (a cancelled TikTok post goes back to Drafts). Runs whenever
 * posts or the wallet are read, so no refund waits on the timer.
 */
export async function settlePostRefunds(userId: string): Promise<void> {
  const open = [...(await charges(userId)).values()].filter((c) => !c.refunded);
  if (!open.length) return;
  const ids = open.map((c) => c.id).join(",");
  const [tt, social] = await Promise.all([
    supabaseRest(`posts?user_id=eq.${userId}&id=in.(${ids})&select=id,status`).then((r) => r.json() as Promise<{ id: string; status: string }[]>),
    supabaseRest(`social_posts?user_id=eq.${userId}&id=in.(${ids})&select=id,status,platform`).then((r) => r.json() as Promise<{ id: string; status: string; platform: string }[]>),
  ]);
  const status = new Map<string, { status: string; app: string }>([...tt.map((p) => [p.id, { status: p.status, app: "tiktok" }] as const), ...social.map((p) => [p.id, { status: p.status, app: p.platform }] as const)]);
  for (const c of open) {
    const s = status.get(c.id);
    if (!s) continue;
    const why = s.status === "failed" ? "failed" : s.status === "cancelled" || s.status === "draft" ? "cancelled" : null;
    if (why) await refundOne(userId, c.side, { id: c.id, app: s.app }, why, c.n);
  }
}

/** Trying a failed channel again: charges again if its last charge was refunded. False when the wallet is short. */
export async function chargeRetry(userId: string, post: Charged, fallback: Side): Promise<boolean> {
  await settlePostRefunds(userId);
  const c = (await charges(userId, [post.id])).get(post.id);
  if (c && !c.refunded) return true;
  return (await chargePosts(userId, c?.side ?? fallback, [post])).ok;
}
