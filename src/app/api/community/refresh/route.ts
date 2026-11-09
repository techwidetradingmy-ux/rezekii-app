import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { refreshMine } from "@/modules/community/numbers.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Refresh now (Posts → Numbers): reads the signed-in account's own Facebook Pages and Instagram accounts straight away. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const r = await refreshMine(user.id, Date.now() + 45_000);
  if (r === "recent") return NextResponse.json({ recent: true });
  return NextResponse.json(r);
}
