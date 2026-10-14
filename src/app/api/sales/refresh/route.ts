import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { historyDone, syncCreatorOrders } from "@/modules/sales/orders.ts";
import { lastOrderSync } from "@/modules/sales/summary.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EVERY = 15 * 60_000;

/** Reads the signed-in creator's latest orders from TikTok when the last read is over 15 minutes old, or their history is still being read. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const last = await lastOrderSync(user.id);
  if (last && Date.now() - Date.parse(last) < EVERY && (await historyDone(user.id))) return NextResponse.json({ synced: false, at: last });
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ error: "Link your TikTok Shop first." }, { status: 403 });
  try {
    const lines = await syncCreatorOrders(user.id, token, Date.now() + 45_000);
    // done: false while the creator's older history is still being read; the page asks again.
    return NextResponse.json({ synced: true, lines, at: new Date().toISOString(), done: await historyDone(user.id) });
  } catch (err) {
    console.error("[sales refresh]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop didn't send your orders. Try again in a minute." }, { status: 502 });
  }
}
