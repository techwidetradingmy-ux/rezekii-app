import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { listAccounts } from "@/modules/social/accounts.ts";
import { canUseSocial, metaLevel } from "@/modules/social/access.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** The signed-in Admin's connected Facebook Pages, Instagram accounts and Threads profiles (no tokens). */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ accounts: [] });
  // Threads replies need threads_read_replies, asked only of the accounts at the "insights" level and up (see metaLevel).
  const [accounts, level] = await Promise.all([listAccounts(user.id), metaLevel(user)]);
  return NextResponse.json({ accounts, threadsReplies: level !== "basic" });
}
