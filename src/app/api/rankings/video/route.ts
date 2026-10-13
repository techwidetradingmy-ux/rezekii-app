import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { videoInfo } from "@/modules/rankings/query.ts";
import { rankings } from "@/modules/rankings/store.ts";

export const dynamic = "force-dynamic";

/** What the video player shows for one TikTok video: ?id= */
export async function GET(req: NextRequest) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await rankings();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const info = b && /^\d{5,25}$/.test(id) ? videoInfo(b, id) : null;
  return info ? NextResponse.json(info, { headers: { "cache-control": "private, max-age=300" } }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
