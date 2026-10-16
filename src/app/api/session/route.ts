import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { myPhoto } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

/** Who is signed in, for the static homepage's top bar ("Sign in" or "My account"). Never cached. */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ? { signedIn: true, avatar: await myPhoto(user) } : { signedIn: false }, { headers: { "cache-control": "no-store" } });
}
