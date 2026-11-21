import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { communityNumbers } from "@/modules/community/numbers.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin › Community Numbers (as on rezekii.com): every Admin's Facebook Pages, Instagram accounts and Threads profiles, last 28 days. */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json(await communityNumbers(28), { headers: { "cache-control": "private, no-store" } });
}
