import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cleanEmail } from "@/modules/accounts/password.ts";
import { setEmailLogin } from "@/modules/accounts/users.ts";

export const dynamic = "force-dynamic";

/** Sign in with email too: POST { email, password, current? } adds an email and password to my account, or changes them. Same-origin only. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown; current?: unknown };
  const result = await setEmailLogin(user.id, cleanEmail(body.email), String(body.password ?? ""), String(body.current ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
