import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, deleteSession } from "@/modules/accounts/session.ts";
import { appBase } from "../oauth.ts";

export const dynamic = "force-dynamic";

/** Ends the session (POST from the Sign out button) and returns to the homepage. */
export async function POST(req: NextRequest) {
  try {
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (err) {
    console.error("[signout] could not delete session", err instanceof Error ? err.message : err);
  }
  const res = NextResponse.redirect(`${appBase(req)}/`, 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
