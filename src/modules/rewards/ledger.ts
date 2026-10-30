import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { CREDIT_LIFE_DAYS, dayOf, missionDays, streakOf, WELCOME_CREDITS } from "./rules.ts";

/**
 * The credits wallet (owner, 31 Oct 2026: real data). Every credit in and out is one ledger row; the balance is their sum.
 * Each grant has a `ref`, so the same mission, referral or refund can never pay twice.
 */

export type Kind = "welcome" | "mission" | "chest" | "streak" | "referral" | "post" | "refund" | "expired" | "admin";
/** Creators and sellers have separate wallets, even on one account. */
export type Side = "creator" | "seller";
export type Row = { id: string; amount: number; kind: Kind; what: string; ref: string; day: string | null; expires_at: string | null; created_at: string };

const DAY = 86400_000;

/** Adds credits once per ref. Returns false when that ref was already paid. */
export async function grant(userId: string, side: Side, g: { amount: number; kind: Kind; what: string; ref: string; day?: string }): Promise<boolean> {
  if (!(g.amount > 0)) return false;
  const res = await supabaseRest("credit_ledger?on_conflict=user_id,side,ref", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, side, amount: Math.round(g.amount), kind: g.kind, what: g.what.slice(0, 120), ref: g.ref, day: g.day ?? null, expires_at: new Date(Date.now() + CREDIT_LIFE_DAYS * DAY).toISOString() }),
  });
  return ((await res.json()) as unknown[]).length > 0;
}

/** Spends credits if the balance covers it (all or nothing, once per ref). */
export async function spend(userId: string, side: Side, amount: number, ref: string, what: string): Promise<{ ok: boolean; balance?: number }> {
  await settle(userId, side);
  const res = await supabaseRest("rpc/spend_credits", { method: "POST", body: JSON.stringify({ p_user: userId, p_side: side, p_amount: amount, p_ref: ref, p_what: what.slice(0, 120) }) });
  const r = (await res.json()) as { ok: boolean; balance?: number };
  return { ok: !!r.ok, balance: r.balance };
}

async function rows(userId: string, side: Side): Promise<Row[]> {
  return (await supabaseRest(`credit_ledger?user_id=eq.${userId}&side=eq.${side}&select=id,amount,kind,what,ref,day,expires_at,created_at&order=created_at.asc,id.asc&limit=5000`)).json();
}

/**
 * What's left of each grant once spends use the oldest first. Every grant lasts the same 12 months, so oldest-first is also
 * soonest-to-expire-first.
 */
function remaining(all: Row[]): Map<string, number> {
  const left = new Map<string, number>();
  const queue: Row[] = [];
  for (const r of all) {
    if (r.amount > 0) {
      left.set(r.id, r.amount);
      queue.push(r);
      continue;
    }
    let owed = -r.amount;
    for (const g of queue) {
      if (!owed) break;
      const have = left.get(g.id) ?? 0;
      const take = Math.min(have, owed);
      left.set(g.id, have - take);
      owed -= take;
    }
  }
  return left;
}

/** Writes off what's left of grants past their 12 months, and gives the welcome credits the first time. */
export async function settle(userId: string, side: Side): Promise<Row[]> {
  let all = await rows(userId, side);
  let changed = false;
  if (!all.some((r) => r.ref === "welcome")) changed = (await grant(userId, side, { amount: WELCOME_CREDITS, kind: "welcome", what: "Welcome credits: try Post Everywhere", ref: "welcome" })) || changed;
  const left = remaining(all);
  const now = Date.now();
  for (const r of all) {
    const have = left.get(r.id) ?? 0;
    if (r.amount > 0 && have > 0 && r.expires_at && Date.parse(r.expires_at) <= now) {
      await supabaseRest("credit_ledger?on_conflict=user_id,side,ref", {
        method: "POST",
        headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: userId, side, amount: -have, kind: "expired", what: `Expired: ${r.what}`.slice(0, 120), ref: `expired:${r.id}` }),
      });
      changed = true;
    }
  }
  if (changed) all = await rows(userId, side);
  return all;
}

export type Wallet = { balance: number; streak: number; expiring: { amount: number; on: string } | null; history: { at: string; what: string; amount: number; kind: Kind }[] };

/** Balance, credits expiring in the next 30 days, and every row, newest first. */
export async function wallet(userId: string, side: Side): Promise<Wallet> {
  const all = await settle(userId, side);
  const balance = all.reduce((s, r) => s + r.amount, 0);
  const left = remaining(all);
  const soon = Date.now() + 30 * DAY;
  const exp = all.filter((r) => r.amount > 0 && r.expires_at && Date.parse(r.expires_at) <= soon && (left.get(r.id) ?? 0) > 0);
  const expiring = exp.length ? { amount: exp.reduce((s, r) => s + (left.get(r.id) ?? 0), 0), on: exp[0].expires_at as string } : null;
  return { balance, streak: streakOf(missionDays(all), dayOf(Date.now())), expiring, history: [...all].reverse().map((r) => ({ at: r.created_at, what: r.what, amount: r.amount, kind: r.kind })) };
}

/** Just the balance (settling first). */
export async function balanceOf(userId: string, side: Side): Promise<number> {
  return (await settle(userId, side)).reduce((s, r) => s + r.amount, 0);
}
