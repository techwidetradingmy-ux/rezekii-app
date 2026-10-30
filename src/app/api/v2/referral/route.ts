import { NextResponse, type NextRequest } from "next/server";
import { cleanCode, ownerOf, REF_COOKIE, type RefCookie } from "@/modules/rewards/referrals.ts";
import { refCookieOptions } from "./link";

export const dynamic = "force-dynamic";

/**
 * A friend's code typed at sign-up (owner, 30 Oct 2026): { code, side }. Checks it's real and keeps it for the sign-up that
 * follows, like an invite link would.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { code?: string; side?: string };
  const code = cleanCode(b.code);
  if (!code || !(await ownerOf(code).catch(() => null))) return NextResponse.json({ ok: false, error: "We couldn't find that code." }, { status: 404 });
  const res = NextResponse.json({ ok: true, code });
  res.cookies.set(REF_COOKIE, JSON.stringify({ c: code, s: b.side === "seller" ? "seller" : "creator", v: "code", t: Date.now() } satisfies RefCookie), refCookieOptions);
  return res;
}
