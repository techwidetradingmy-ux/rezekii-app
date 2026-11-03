import { NextResponse, type NextRequest } from "next/server";
import { cleanEmail, passwordProblem } from "@/modules/accounts/password.ts";
import { createEmailUser, emailAccount, emailSignIn, resetPassword, signInWithCode } from "@/modules/accounts/users.ts";
import { sendCode, checkCode, type CodePurpose } from "@/modules/accounts/email-codes.ts";
import { needsDetails } from "@/modules/rewards/profiles.ts";
import { joinInviter } from "../oauth.ts";
import { signInDevice } from "../device.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const PURPOSES: CodePurpose[] = ["signup", "signin", "reset"];

/**
 * Email sign-in and sign-up: POST { mode, email, ... }. Same-origin only.
 * - "check": whether the email has an account and how it signs in.
 * - "code": emails a 6-digit code for `purpose` (signup, signin or reset).
 * - "signup": email, password, name and the code (owner, 31 Oct 2026: the email is confirmed before the account exists).
 * - "signin": email with a password, or with a code.
 * - "reset": email, the code and a new password.
 * On success the session cookie is set; `details` says the sign-up details are still to fill in.
 */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please sign in from rezekii.com.") }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { mode?: string; email?: string; password?: string; name?: string; code?: string; purpose?: string };
  const email = cleanEmail(body.email);
  const password = String(body.password ?? "");
  const code = body.code ? String(body.code) : "";
  if (!email) return NextResponse.json({ error: t("Enter a valid email address.") }, { status: 400 });
  if (body.mode === "check") return NextResponse.json(await emailAccount(email));

  if (body.mode === "code") {
    const purpose = PURPOSES.find((p) => p === body.purpose);
    if (!purpose) return NextResponse.json({ error: t("Say what the code is for.") }, { status: 400 });
    const acct = await emailAccount(email);
    if (purpose === "signup" && acct.exists) return NextResponse.json({ error: t("An account with this email already exists. Sign in instead.") }, { status: 409 });
    if (purpose === "signin" && !acct.exists) return NextResponse.json({ error: t("No Rezekii account uses this email. Create one instead.") }, { status: 404 });
    if (purpose === "reset" && !acct.password) return NextResponse.json({ error: acct.exists ? t("This email signs in with Google. Continue with Google, or ask for a sign-in code.") : t("No Rezekii account uses this email. Create one instead.") }, { status: 404 });
    const sent = await sendCode(email, purpose, t);
    return sent.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: sent.error }, { status: sent.status });
  }

  let result;
  const wrongCode = (purpose: CodePurpose) => checkCode(email, purpose, code, t);
  if (body.mode === "signup") {
    const problem = passwordProblem(password, t);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const bad = await wrongCode("signup");
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const name = String(body.name ?? "").trim().slice(0, 60) || null;
    result = await createEmailUser(email, password, name, t);
  } else if (body.mode === "reset") {
    const problem = passwordProblem(password, t);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const bad = await wrongCode("reset");
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    result = await resetPassword(email, password, t);
  } else if (code) {
    const bad = await wrongCode("signin");
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    result = await signInWithCode(email, t);
  } else {
    if (!password) return NextResponse.json({ error: t("Enter your password.") }, { status: 400 });
    result = await emailSignIn(email, password, t);
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const res = NextResponse.json({ ok: true, details: await needsDetails(result.user.id).catch(() => false) });
  // The account that was in use stays signed in on this device, to switch back to (owner, 4 Nov 2026).
  await signInDevice(req, res, result.user.id);
  await joinInviter(req, res, result.user.id);
  return res;
}
