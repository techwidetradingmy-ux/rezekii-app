import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, passwordProblem } from "@/modules/accounts/password.ts";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/modules/accounts/session.ts";
import { createEmailUser, emailSignIn } from "@/modules/accounts/users.ts";

export const dynamic = "force-dynamic";

/**
 * Email sign-in and sign-up: POST { mode: "signin" | "signup", email, password, name? }.
 * Same-origin only. On success the session cookie is set and the page goes to /app.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please sign in from rezekii.com." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { mode?: string; email?: string; password?: string; name?: string };
  const email = cleanEmail(body.email);
  const password = String(body.password ?? "");
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  let result;
  if (body.mode === "signup") {
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const name = String(body.name ?? "").trim().slice(0, 60) || null;
    result = await createEmailUser(email, password, name);
  } else {
    if (!password) return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    result = await emailSignIn(email, password);
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const { token, expires } = await createSession(result.user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  return res;
}
