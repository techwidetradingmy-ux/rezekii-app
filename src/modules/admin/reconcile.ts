import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { REFERRAL_REWARD } from "../rewards/rules.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
type Row = { user_id: string; side: string; amount: number; kind: string; ref: string; created_at: string };

/**
 * Reconciliation from the credit ledger (owner, 31 Oct 2026): credits in and out per Malaysia day for 14 days, and checks that
 * must always hold. Each failed check names what to look at.
 */
export async function reconcile() {
  const [rows, qualified, posts, social] = await Promise.all([
    (await supabaseRest("credit_ledger?select=user_id,side,amount,kind,ref,created_at&limit=20000")).json() as Promise<Row[]>,
    (await supabaseRest("referrals?qualified_at=not.is.null&select=friend_id,inviter_id,side&limit=10000")).json() as Promise<{ friend_id: string; inviter_id: string; side: string }[]>,
    (await supabaseRest("posts?status=in.(failed,cancelled)&select=id&limit=10000")).json() as Promise<{ id: string }[]>,
    (await supabaseRest("social_posts?status=in.(failed,cancelled,removed)&select=id&limit=10000")).json() as Promise<{ id: string }[]>,
  ]);
  const today = Math.floor((Date.now() + MYT) / DAY);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = today - 13 + i;
    return { day: new Date(d * DAY).toISOString().slice(0, 10), given: 0, used: 0, refunded: 0, expired: 0 };
  });
  for (const r of rows) {
    const i = Math.floor((Date.parse(r.created_at) + MYT) / DAY) - (today - 13);
    if (i < 0 || i > 13) continue;
    if (r.kind === "post") days[i].used += -r.amount;
    else if (r.kind === "refund") days[i].refunded += r.amount;
    else if (r.kind === "expired") days[i].expired += -r.amount;
    else if (r.amount > 0) days[i].given += r.amount;
  }

  // 1. No wallet below zero.
  const balance = new Map<string, number>();
  for (const r of rows) balance.set(`${r.user_id}|${r.side}`, (balance.get(`${r.user_id}|${r.side}`) ?? 0) + r.amount);
  const negative = [...balance.values()].filter((v) => v < 0).length;
  // 2. Referral credits match the referrals that counted (both sides paid).
  const referralCredits = rows.filter((r) => r.kind === "referral").reduce((t, r) => t + r.amount, 0);
  const expectedReferral = qualified.length * (REFERRAL_REWARD.inviter + REFERRAL_REWARD.friend);
  // 3. One welcome bonus per wallet.
  const welcome = new Map<string, number>();
  for (const r of rows.filter((x) => x.kind === "welcome")) welcome.set(`${r.user_id}|${r.side}`, (welcome.get(`${r.user_id}|${r.side}`) ?? 0) + 1);
  const twice = [...welcome.values()].filter((n) => n > 1).length;
  // 4. Every charge for a post that failed or was cancelled has its refund (refunds are paid when the owner next opens their posts).
  const failed = new Set([...posts, ...social].map((p) => p.id));
  const refunds = new Set(rows.filter((r) => r.ref.startsWith("refund:")).map((r) => r.ref.slice(7)));
  const owed = rows.filter((r) => r.ref.startsWith("post:") && failed.has(r.ref.split(":")[1]) && !refunds.has(r.ref.slice(5))).length;

  const checks = [
    { label: "No wallet below zero", ok: negative === 0, detail: negative ? `${negative} wallet${negative === 1 ? "" : "s"} below zero` : "Every wallet is 0 or more" },
    { label: "Referral credits match referrals that counted", ok: referralCredits === expectedReferral, detail: `${qualified.length} successful referral${qualified.length === 1 ? "" : "s"} × ${REFERRAL_REWARD.inviter + REFERRAL_REWARD.friend} = ${expectedReferral} expected · ${referralCredits} paid` },
    { label: "One welcome bonus per wallet", ok: twice === 0, detail: twice ? `${twice} wallet${twice === 1 ? "" : "s"} got it twice` : `${welcome.size} wallets, once each` },
    { label: "Failed or cancelled posts refunded", ok: owed === 0, detail: owed ? `${owed} charge${owed === 1 ? "" : "s"} not refunded yet (paid when the owner next opens their posts)` : "All refunded" },
  ];
  const sum = (f: (r: Row) => boolean) => rows.filter(f).reduce((t, r) => t + r.amount, 0);
  return {
    days,
    checks,
    totals: { given: sum((r) => r.amount > 0 && r.kind !== "refund"), used: -sum((r) => r.kind === "post"), refunded: sum((r) => r.kind === "refund"), expired: -sum((r) => r.kind === "expired"), wallets: sum(() => true) },
  };
}
