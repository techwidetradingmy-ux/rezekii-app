import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { hashToken } from "./session.ts";

/**
 * Signing in from the Home Screen app (owner, 3 Nov 2026). The app keeps its own sign-in, apart from the phone's browser, and
 * Google's and TikTok's pages open in the browser, so a sign-in finished there never reached the app (it opened as signed out,
 * and Google asked for the password every time). Now the app makes a random code and opens sign-in in the browser with it; when
 * sign-in finishes there, the code is saved against her account, and the app claims it and gets its own session. A code works
 * once, within 10 minutes, and only its hash is stored.
 */
export const HANDOFF_COOKIE = "rz_handoff";
const TEN_MINUTES = 10 * 60_000;

/** A code the app made: 20 to 64 letters, digits and dashes. */
export const handoffCode = (v: string | null | undefined): string | null => (v && /^[A-Za-z0-9-]{20,64}$/.test(v) ? v : null);

/** Saves a finished sign-in for the app to claim, with where she goes next. */
export async function saveHandoff(code: string, userId: string, next: string): Promise<void> {
  await supabaseRest("auth_handoffs?on_conflict=id_hash", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ id_hash: hashToken(code), user_id: userId, next }),
  });
  // Old codes go (claimed or not); they only matter for 10 minutes.
  await supabaseRest(`auth_handoffs?created_at=lt.${new Date(Date.now() - 24 * 3600_000).toISOString()}`, { method: "DELETE", headers: { prefer: "return=minimal" } }).catch(() => undefined);
}

/** Claims a code once: her account and where to go, or null when it isn't ready, was used, or is older than 10 minutes. */
export async function takeHandoff(code: string): Promise<{ userId: string; next: string } | null> {
  const fresh = new Date(Date.now() - TEN_MINUTES).toISOString();
  const res = await supabaseRest(`auth_handoffs?id_hash=eq.${hashToken(code)}&used_at=is.null&created_at=gt.${encodeURIComponent(fresh)}&select=user_id,next`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  });
  const [row] = (await res.json().catch(() => [])) as { user_id: string; next: string | null }[];
  return row ? { userId: row.user_id, next: row.next && row.next.startsWith("/") && !row.next.startsWith("//") ? row.next : "/app" } : null;
}
