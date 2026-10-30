import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { addressOf, cleanAddress, saveAddressFor } from "@/modules/creator-details/card.ts";

export const dynamic = "force-dynamic";

/** Her delivery address (owner, 31 Oct 2026: real storage), for paid reviews sent through the Rate Card. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ address: await addressOf(user.id) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const a = cleanAddress((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (!a) return NextResponse.json({ error: "Fill in the name, address, 5-digit postcode, city and state." }, { status: 400 });
  if (!(await saveAddressFor(user.id, a))) return NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
  return NextResponse.json({ address: a });
}
