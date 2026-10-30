import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { creatorsPage } from "@/modules/admin/creators.ts";
import { postsBetween } from "@/modules/admin/posts.ts";
import { missionsReport } from "@/modules/admin/missions-report.ts";
import { analyticsV2 } from "@/modules/admin/analytics-v2.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 86_400_000;
const PARTS = {
  creators: async () => (await creatorsPage()).creators,
  review: creatorsPage,
  missions: missionsReport,
  analytics: analyticsV2,
  posts: () => postsBetween(new Date(Date.now() - 14 * DAY).toISOString(), new Date(Date.now() + 14 * DAY).toISOString()),
} as const;

/** Admin data from Rezekii's own records (admins only; owner, 31 Oct 2026): ?part=creators|review|missions|analytics|posts. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const part = req.nextUrl.searchParams.get("part") as keyof typeof PARTS | null;
  if (!part || !(part in PARTS)) return NextResponse.json({ error: "Say which part." }, { status: 400 });
  try {
    return NextResponse.json({ data: await PARTS[part]() }, { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    console.error("[admin data]", part, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load this. Please try again." }, { status: 502 });
  }
}
