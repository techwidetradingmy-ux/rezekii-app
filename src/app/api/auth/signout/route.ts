import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTS_COOKIE, SESSION_COOKIE, deleteSession, readSaved } from "@/modules/accounts/session.ts";
import { clearSession, nextAccount, setOthers } from "../device.ts";

export const dynamic = "force-dynamic";

/**
 * Sign Out (POST): ends the session in use. Another account signed in on this device takes over (owner, 4 Nov 2026), and
 * { switched: true } says so. ?all=1 signs out every account on this device.
 */
export async function POST(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";
  const current = req.cookies.get(SESSION_COOKIE)?.value;
  const res = NextResponse.json({ switched: false }, { headers: { "cache-control": "no-store" } });
  try {
    await deleteSession(current);
    if (all) for (const token of readSaved(req.cookies.get(ACCOUNTS_COOKIE)?.value)) await deleteSession(token);
  } catch (err) {
    console.error("[signout] could not delete session", err instanceof Error ? err.message : err);
  }
  if (all) {
    clearSession(res);
    setOthers(res, []);
    return res;
  }
  if (!(await nextAccount(req, res))) return res;
  const switched = NextResponse.json({ switched: true }, { headers: { "cache-control": "no-store" } });
  for (const c of res.cookies.getAll()) switched.cookies.set(c);
  return switched;
}
