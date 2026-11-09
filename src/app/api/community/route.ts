import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { communityNumbers, refreshMine } from "@/modules/community/numbers.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Channel Numbers: the signed-in account's own Facebook Pages and Instagram accounts, from the daily reading (last 28 days). */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const [data, accounts] = await Promise.all([communityNumbers(28, undefined, user.id), listAccounts(user.id).catch(() => [])]);
  return NextResponse.json({ ...data, hasThreads: accounts.some((a) => a.platform === "threads") });
}

/** Refresh Now: reads those channels straight away (not again within 10 minutes). */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from rezekii.com.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const r = await refreshMine(user.id, Date.now() + 45_000);
  return NextResponse.json(r === "recent" ? { recent: true } : r);
}
