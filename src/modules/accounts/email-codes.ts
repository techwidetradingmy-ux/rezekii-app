import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { layout, sendEmail } from "../../integrations/email/resend.ts";

/**
 * 6-digit email codes (owner, 31 Oct 2026): to confirm a new email account, to sign in without a password, and to reset a
 * password. A code works once, for 10 minutes, with 5 tries. Only a keyed hash of it is saved.
 */
export type CodePurpose = "signup" | "signin" | "reset";
type Fail = { ok: false; error: string; status: number };

const TTL = 10 * 60_000;
/** One new code a minute and 5 an hour per email; at most 80 a day in all, which keeps room in Resend's free 100 a day. */
const WAIT = 60_000;
const PER_HOUR = 5;
const PER_DAY = 80;
const TRIES = 5;
const MYT = 8 * 3_600_000;

const enc = encodeURIComponent;
const hash = (email: string, purpose: CodePurpose, code: string) =>
  createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "rezekii-dev").update(`${purpose}|${email}|${code}`).digest("hex");
const count = async (path: string) => Number(((await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } })).headers.get("content-range") ?? "*/0").split("/")[1]) || 0;

const WHAT: Record<CodePurpose, { subject: string; title: string; line: string }> = {
  signup: { subject: "confirm your email", title: "Confirm your email", line: "Enter this code on Rezekii to finish creating your account." },
  signin: { subject: "sign in", title: "Sign in to Rezekii", line: "Enter this code on Rezekii to sign in." },
  reset: { subject: "reset your password", title: "Reset your password", line: "Enter this code on Rezekii, then choose a new password." },
};

/** Emails a new code for `purpose`. Asking again replaces the earlier code. */
export async function sendCode(email: string, purpose: CodePurpose): Promise<{ ok: true } | Fail> {
  const recent = (await (await supabaseRest(`email_codes?email=eq.${enc(email)}&created_at=gte.${new Date(Date.now() - 3_600_000).toISOString()}&select=created_at&order=created_at.desc`)).json()) as { created_at: string }[];
  if (recent[0] && Date.now() - Date.parse(recent[0].created_at) < WAIT) return { ok: false, error: "We just sent you a code. Wait a minute before asking for another one.", status: 429 };
  if (recent.length >= PER_HOUR) return { ok: false, error: "Too many codes for this email. Please try again in an hour.", status: 429 };
  const dayStart = new Date(Math.floor((Date.now() + MYT) / 86_400_000) * 86_400_000 - MYT).toISOString();
  if ((await count(`email_codes?created_at=gte.${dayStart}&select=id`)) >= PER_DAY) return { ok: false, error: "We can't send more codes today. Please continue with Google, or try again tomorrow.", status: 503 };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const w = WHAT[purpose];
  // The new code replaces any earlier one for the same purpose.
  await supabaseRest(`email_codes?email=eq.${enc(email)}&purpose=eq.${purpose}&used_at=is.null`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ used_at: new Date().toISOString() }) });
  await supabaseRest("email_codes", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ email, purpose, code_hash: hash(email, purpose, code), expires_at: new Date(Date.now() + TTL).toISOString() }) });
  try {
    await sendEmail({ to: email, subject: `${code} is your Rezekii code to ${w.subject}`, ...layout({ title: w.title, lines: [w.line, "It works for 10 minutes."], code, foot: "Didn't ask for this? You can ignore it: nobody can use your account without this code. Rezekii · www.rezekii.com" }) });
  } catch (err) {
    console.error("[email code]", err instanceof Error ? err.message : err);
    return { ok: false, error: "We couldn't send the email. Please try again.", status: 502 };
  }
  return { ok: true };
}

/** Checks a code she typed. Null when it's right (and it can't be used again), otherwise what to tell her. */
export async function checkCode(email: string, purpose: CodePurpose, code: string): Promise<string | null> {
  const typed = String(code ?? "").replace(/\D/g, "");
  if (typed.length !== 6) return "Enter the 6-digit code from the email.";
  const [row] = (await (await supabaseRest(`email_codes?email=eq.${enc(email)}&purpose=eq.${purpose}&used_at=is.null&expires_at=gt.${new Date().toISOString()}&select=id,code_hash,attempts&order=created_at.desc&limit=1`)).json()) as { id: string; code_hash: string; attempts: number }[];
  if (!row || row.attempts >= TRIES) return "This code has expired. Ask for a new one.";
  const a = Buffer.from(hash(email, purpose, typed), "hex");
  const b = Buffer.from(row.code_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await supabaseRest(`email_codes?id=eq.${row.id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ attempts: row.attempts + 1 }) });
    return row.attempts + 1 >= TRIES ? "Too many wrong tries. Ask for a new code." : "That code isn't right. Check the email and try again.";
  }
  await supabaseRest(`email_codes?id=eq.${row.id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ used_at: new Date().toISOString() }) });
  return null;
}
