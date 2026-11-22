import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { makePass } from "@/modules/accounts/connect-pass.ts";

export const dynamic = "force-dynamic";

/** A 10-minute pass for connecting an app from the Home Screen app, for the signed-in account (see connect-pass.ts). */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ pass: makePass(user.id) }, { headers: { "cache-control": "no-store" } });
}
