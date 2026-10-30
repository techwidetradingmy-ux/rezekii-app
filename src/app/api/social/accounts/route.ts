import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { listAccounts } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";

export const dynamic = "force-dynamic";

/** The signed-in Admin's connected Facebook Pages, Instagram accounts and Threads profiles (no tokens). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!canUseSocial(user)) return NextResponse.json({ accounts: [] });
  return NextResponse.json({ accounts: await listAccounts(user.id) });
}
