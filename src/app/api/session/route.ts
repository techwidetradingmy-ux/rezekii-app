import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";

export const dynamic = "force-dynamic";

/** Who is signed in, for the static homepage's top bar ("Sign in" or "My account"). Never cached. */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ? { signedIn: true, avatar: user.avatar_url ?? null } : { signedIn: false }, { headers: { "cache-control": "no-store" } });
}
