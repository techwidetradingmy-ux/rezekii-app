import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { USER_COLUMNS, type AppUser } from "./users.ts";

/**
 * Connecting an app from the Home Screen app (owner, 23 Nov 2026). The app keeps its own sign-in, apart from the phone's browser,
 * and TikTok Shop, TikTok and Meta finish in the browser, so the link never reached her account and she landed on the sign-in
 * page. Now the app asks for a pass (her account, good for 10 minutes, signed), opens the connect in the browser with it, and
 * what she connects there is saved to her account.
 */
export const CONNECT_COOKIE = "rz_connect";
const TEN_MINUTES = 10 * 60_000;

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY must be set");
  return createHmac("sha256", raw).update("rezekii connect pass").digest();
}
const sign = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

/** A pass for this account: "<account and end, base64url>.<signature>". */
export function makePass(userId: string, now = Date.now()): string {
  const body = `${userId}.${now + TEN_MINUTES}`;
  return `${Buffer.from(body, "utf8").toString("base64url")}.${sign(body)}`;
}

/** The account a pass is for, or null when it's missing, changed or older than 10 minutes. */
export function readPass(pass: string | null | undefined, now = Date.now()): string | null {
  if (!pass || pass.length > 300) return null;
  const [encoded, signature] = pass.split(".");
  if (!encoded || !signature) return null;
  const body = Buffer.from(encoded, "base64url").toString("utf8");
  const want = sign(body);
  if (want.length !== signature.length || !timingSafeEqual(Buffer.from(want), Buffer.from(signature))) return null;
  const [userId, end] = body.split(".");
  return userId && /^[0-9a-f-]{36}$/i.test(userId) && Number(end) > now ? userId : null;
}

/** The account a pass is for, looked up, or null. */
export async function passAccount(pass: string | null | undefined): Promise<AppUser | null> {
  const id = readPass(pass);
  if (!id) return null;
  const [user] = (await (await supabaseRest(`app_users?id=eq.${id}&select=${USER_COLUMNS}&limit=1`)).json().catch(() => [])) as AppUser[];
  return user ?? null;
}
