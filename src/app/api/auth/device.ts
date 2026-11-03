import type { NextRequest, NextResponse } from "next/server";
import {
  ACCOUNTS_COOKIE, MAX_ACCOUNTS, SESSION_COOKIE, SIGNED_IN_COOKIE, createSession, deleteSession, liveSessions, readSaved, savedCookieOptions,
  sessionCookieOptions, signedInCookieOptions, type DeviceSession,
} from "@/modules/accounts/session.ts";

/**
 * The accounts signed in on this device (owner, 4 Nov 2026: switch accounts without signing in again). The one in use is
 * the session cookie; the others wait in ACCOUNTS_COOKIE. Signing in to another account keeps the one that was in use.
 */

/** This device's sessions that are still signed in: the one in use first (when it still is), then the others. */
export async function deviceSessions(req: NextRequest): Promise<{ current: DeviceSession | null; others: DeviceSession[] }> {
  const current = req.cookies.get(SESSION_COOKIE)?.value;
  const all = await liveSessions([current, ...readSaved(req.cookies.get(ACCOUNTS_COOKIE)?.value)]);
  const now = all[0]?.token === current ? all[0] : null;
  return { current: now, others: now ? all.slice(1) : all };
}

/** Saves the list of waiting accounts (none: the cookie goes). */
export function setOthers(res: NextResponse, others: DeviceSession[]): void {
  if (others.length) res.cookies.set(ACCOUNTS_COOKIE, others.map((s) => s.token).join("."), savedCookieOptions());
  else res.cookies.set(ACCOUNTS_COOKIE, "", { path: "/", maxAge: 0 });
}

/** Puts a session in use on this device. */
export function setCurrent(res: NextResponse, s: { token: string; expires: Date }): void {
  res.cookies.set(SESSION_COOKIE, s.token, sessionCookieOptions(s.expires));
  res.cookies.set(SIGNED_IN_COOKIE, "1", signedInCookieOptions(s.expires));
}

/** Nobody is signed in on this device any more. */
export function clearSession(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(SIGNED_IN_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Signs this device in to the account (a new 90-day session). The account that was in use, and the others waiting, stay
 * signed in for switching back; past the limit the oldest is signed out.
 */
export async function signInDevice(req: NextRequest, res: NextResponse, userId: string): Promise<void> {
  const session = await createSession(userId);
  setCurrent(res, session);
  if (!req.cookies.get(SESSION_COOKIE)?.value && !req.cookies.get(ACCOUNTS_COOKIE)?.value) return;
  try {
    const { current, others } = await deviceSessions(req);
    const keep = [...(current ? [current] : []), ...others].filter((s) => s.userId !== userId);
    for (const s of keep.slice(MAX_ACCOUNTS - 1)) await deleteSession(s.token).catch(() => null);
    setOthers(res, keep.slice(0, MAX_ACCOUNTS - 1));
  } catch (err) {
    // The list stays as it was; she is still signed in to the new account.
    console.error("[accounts] keep others", err instanceof Error ? err.message : err);
  }
}

/**
 * The account in use was signed out or deleted: the next account signed in on this device takes over, if there is one.
 * True when one did.
 */
export async function nextAccount(req: NextRequest, res: NextResponse): Promise<boolean> {
  const { others } = await deviceSessions(req).catch(() => ({ others: [] as DeviceSession[] }));
  const [next, ...rest] = others;
  if (!next) {
    clearSession(res);
    setOthers(res, []);
    return false;
  }
  setCurrent(res, next);
  setOthers(res, rest);
  return true;
}
