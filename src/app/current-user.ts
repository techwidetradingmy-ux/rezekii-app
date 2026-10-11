import { cookies } from "next/headers";
import { SESSION_COOKIE, userForSession } from "@/modules/accounts/session.ts";
import type { AppUser } from "@/modules/accounts/users.ts";

/** The signed-in account for server components, or null. A database hiccup counts as signed out rather than crashing the page. */
export async function currentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    return await userForSession(token);
  } catch (err) {
    console.error("[session] lookup failed", err instanceof Error ? err.message : err);
    return null;
  }
}
