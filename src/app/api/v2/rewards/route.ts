import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { wallet } from "@/modules/rewards/ledger.ts";
import { claim, missionBoard, recordEvent, type Side } from "@/modules/rewards/missions.ts";
import { codeFor, friendsOf, settleReferrals } from "@/modules/rewards/referrals.ts";
import { REFERRAL_DAYS, REFERRAL_REWARD } from "@/modules/rewards/rules.ts";

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
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const side = sideOf(q.get("side"));
  // Friends who became successful get paid whenever either side looks.
  await settleReferrals(user.id).catch((e) => console.error("[referrals] settle", e instanceof Error ? e.message : e));
  const part = q.get("part");
  if (part === "wallet") return NextResponse.json(await wallet(user.id, side), NO_STORE);
  if (part === "referral") {
    const code = await codeFor(user);
    return NextResponse.json({ code, link: `${req.nextUrl.origin}/${side === "seller" ? "s" : "r"}/${code}`, friends: await friendsOf(user.id, side), reward: REFERRAL_REWARD, days: REFERRAL_DAYS }, NO_STORE);
  }
  return NextResponse.json(await missionBoard({ id: user.id, created_at: await joined(user.id) }, side), NO_STORE);
}

/** { action: "claim", side, id } claims a mission; { action: "event", kind: "results" } records a results visit. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; side?: string; id?: string; kind?: string };
  if (b.action === "event" && b.kind === "results") {
    await recordEvent(user.id, "results");
    return NextResponse.json({ ok: true });
  }
  if (b.action !== "claim" || typeof b.id !== "string") return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  const side = sideOf(b.side);
  if (b.id === SHARE[side]) await recordEvent(user.id, "share");
  const r = await claim({ id: user.id, created_at: await joined(user.id) }, side, b.id);
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
