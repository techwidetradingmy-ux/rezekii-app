import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { attachReferral, cleanCode, ownerOf, readRefCookie, REF_COOKIE, type RefCookie } from "@/modules/rewards/referrals.ts";
import { refCookieOptions } from "./link";

export const dynamic = "force-dynamic";

/** The invite this browser came with, or the one a signed-in account joined with, so sign-up can show it. */
export async function GET(req: NextRequest) {
  const ref = readRefCookie(req.cookies.get(REF_COOKIE)?.value);
  let code = ref?.c ?? null;
  const user = code ? null : await currentUser();
  if (user) {
    const [r] = (await (await supabaseRest(`referrals?friend_id=eq.${user.id}&select=inviter_id&limit=1`)).json()) as { inviter_id: string }[];
    if (r) code = ((await (await supabaseRest(`referral_codes?user_id=eq.${r.inviter_id}&select=code&limit=1`)).json()) as { code: string }[])[0]?.code ?? null;
  }
  return NextResponse.json({ code, joined: !!user && !!code }, { headers: { "cache-control": "private, no-store" } });
}

/**
 * A friend's code typed at sign-up (owner, 30 Oct 2026): { code, side }. Checks it's real and keeps it for the sign-up that
 * follows, like an invite link would.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { code?: string; side?: string; join?: boolean };
  const code = cleanCode(b.code);
  if (!code || !(await ownerOf(code).catch(() => null))) return NextResponse.json({ ok: false, error: "We couldn't find that code." }, { status: 404 });
  // Typed in the sign-up form right after signing up: joins the friend now (only a new account, only once).
  if (b.join) {
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
    await attachReferral(user.id, { c: code, s: b.side === "seller" ? "seller" : "creator", v: "code", t: Date.now() });
    return NextResponse.json({ ok: true, code });
  }
  const res = NextResponse.json({ ok: true, code });
  res.cookies.set(REF_COOKIE, JSON.stringify({ c: code, s: b.side === "seller" ? "seller" : "creator", v: "code", t: Date.now() } satisfies RefCookie), refCookieOptions);
  return res;
}
