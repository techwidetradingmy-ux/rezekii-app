import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, passwordProblem } from "@/modules/accounts/password.ts";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/modules/accounts/session.ts";
import { createEmailUser, emailAccount, emailSignIn } from "@/modules/accounts/users.ts";
import { needsDetails } from "@/modules/rewards/profiles.ts";
import { joinInviter } from "../oauth.ts";

export const dynamic = "force-dynamic";

/**
 * Email sign-in and sign-up: POST { mode: "check" | "signin" | "signup", email, password, name? }. "check" says whether the email
 * has an account and how it signs in. Same-origin only. On success the session cookie is set; `details` says the sign-up
 * details are still to fill in.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please sign in from rezekii.com." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { mode?: string; email?: string; password?: string; name?: string };
  const email = cleanEmail(body.email);
  const password = String(body.password ?? "");
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (body.mode === "check") return NextResponse.json(await emailAccount(email));

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
  const res = NextResponse.json({ ok: true, details: await needsDetails(result.user.id).catch(() => false) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  await joinInviter(req, res, result.user.id);
  return res;
}
