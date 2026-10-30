import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cleanEmail } from "@/modules/accounts/password.ts";
import { setEmailLogin } from "@/modules/accounts/users.ts";

export const dynamic = "force-dynamic";

/**
 * Email sign-in on my account: POST { email?, password?, current? }. The first time, an email and a password; after that a new
 * email or a new password on its own, with the current password. Same-origin only.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown; current?: unknown };
  const change = {
    ...(body.email !== undefined && body.email !== "" ? { email: cleanEmail(body.email) } : {}),
    ...(body.password !== undefined && body.password !== "" ? { password: String(body.password) } : {}),
  };
  const result = await setEmailLogin(user.id, change, String(body.current ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
