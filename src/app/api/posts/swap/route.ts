import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { swapPost } from "@/modules/posting/edit.ts";

export const dynamic = "force-dynamic";

/** Saving an edit: { old, new } puts the held, changed post in place of the old one, if the old one hasn't started sending. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { old?: string; new?: string };
  const r = await swapPost(user.id, String(b.old ?? ""), String(b.new ?? ""));
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
