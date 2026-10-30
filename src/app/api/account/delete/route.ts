import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { deleteAccount } from "@/modules/accounts/manage.ts";
import { SESSION_COOKIE } from "@/modules/accounts/session.ts";

export const dynamic = "force-dynamic";

/** Delete my Rezekii account: POST { confirm: "DELETE" }. Same-origin only. Admin accounts are removed by Techwide instead. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ error: "Admin accounts are removed by Techwide." }, { status: 403 });
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  try {
    await deleteAccount(user);
  } catch (err) {
    console.error("[account] delete failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not delete the account right now. Please try again." }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
