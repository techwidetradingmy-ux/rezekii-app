import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { creditLine, wallet } from "@/modules/rewards/ledger.ts";
import { claim, missionBoard, recordEvent, type Side } from "@/modules/rewards/missions.ts";
import { codeFor, friendsOf, settleReferrals } from "@/modules/rewards/referrals.ts";
import { REFERRAL_DAYS, REFERRAL_REWARD } from "@/modules/rewards/rules.ts";
import { settlePostRefunds } from "@/modules/rewards/post-credits.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { headers: { "cache-control": "private, no-store" } };
const sideOf = (v: unknown): Side => (v === "seller" ? "seller" : "creator");
/** The share mission's id on each side: sharing is recorded when it's claimed. */
const SHARE: Record<Side, string> = { creator: "d6", seller: "d5" };

async function joined(userId: string): Promise<string> {
  const [u] = (await (await supabaseRest(`app_users?id=eq.${userId}&select=created_at&limit=1`)).json()) as { created_at: string }[];
  return u?.created_at ?? new Date().toISOString();
}

/**
 * Rewards on real data (owner, 31 Oct 2026). ?part=missions (the board), wallet (balance and history) or referral (code, link,
 * friends); ?side=creator or seller.
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const side = sideOf(q.get("side"));
  const part = q.get("part");
  const settle = () => settleReferrals(user.id).catch((e) => console.error("[referrals] settle", e instanceof Error ? e.message : e));
  // Her invite (owner, 2 Nov 2026: the gift box was slow): friends settled and her code read together, then her friends.
  if (part === "referral") {
    const [, code] = await Promise.all([settle(), codeFor(user)]);
    return NextResponse.json({ code, link: `${process.env.APP_URL ?? req.nextUrl.origin}/${side === "seller" ? "s" : "r"}/${code}`, friends: await friendsOf(user.id, side, t), reward: REFERRAL_REWARD, days: REFERRAL_DAYS }, NO_STORE);
  }
  // Friends who became successful get paid, and failed or cancelled posts get their credits back, whenever she looks.
  await Promise.all([settle(), settlePostRefunds(user.id).catch((e) => console.error("[post credits] refunds", e instanceof Error ? e.message : e))]);
  if (part === "wallet") {
    const w = await wallet(user.id, side);
    return NextResponse.json({ ...w, history: w.history.map((h) => ({ ...h, what: creditLine(t, h.what) })) }, NO_STORE);
  }
  return NextResponse.json(await missionBoard({ id: user.id, created_at: await joined(user.id) }, side), NO_STORE);
}

/** { action: "claim", side, id } claims a mission; { action: "event", kind: "results" } records a results visit. */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from Rezekii.") }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; side?: string; id?: string; kind?: string };
  if (b.action === "event" && b.kind === "results") {
    await recordEvent(user.id, "results");
    return NextResponse.json({ ok: true });
  }
  if (b.action !== "claim" || typeof b.id !== "string") return NextResponse.json({ error: t("Unknown step.") }, { status: 400 });
  const side = sideOf(b.side);
  if (b.id === SHARE[side]) await recordEvent(user.id, "share");
  const r = await claim({ id: user.id, created_at: await joined(user.id) }, side, b.id, t);
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
