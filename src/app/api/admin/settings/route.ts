import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, logActivity } from "@/modules/admin/admins.ts";
import { savePostingTimes } from "@/modules/posting/times.ts";

export const dynamic = "force-dynamic";

/** Saves the recommended posting times: { times: ["06:00", ...] } (Malaysia time, at least one, at most 12). */
export async function PUT(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { times } = (await req.json().catch(() => ({}))) as { times?: unknown };
  const list = Array.isArray(times) ? [...new Set(times.filter((t): t is string => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort() : [];
  if (!list.length || list.length > 12) return NextResponse.json({ error: "Keep between 1 and 12 posting times." }, { status: 400 });
  await savePostingTimes(list, user.id);
  await logActivity(actorName(user.email), "Posts", `set the recommended posting times to ${list.join(", ")}`);
  return NextResponse.json({ ok: true, times: list });
}
