import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Passwords are stored as "scrypt$N$r$p$salt$hash" (base64url). Only the hash is kept, never the password. */
const N = 16384, R = 8, P = 1, KEYLEN = 32;

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))));

/** The same for every account, admins included (owner, 27 Oct 2026); 5 wrong tries lock the account for 15 minutes. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** True when the password matches the stored hash. Compares in constant time; a malformed hash is a mismatch. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64url");
  const want = Buffer.from(parts[5], "base64url");
  if (!n || !r || !p || !salt.length || !want.length) return false;
  const got = await scrypt(password, salt, want.length, { N: n, r, p });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** A sign-up email: trimmed and lowercased, or null when it does not look like an address. */
export function cleanEmail(email: unknown): string | null {
  const e = String(email ?? "").trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/**
 * Why an account's email sign-in can't be added or changed, or null when it can (owner, 15 Oct 2026: any creator account,
 * however it was made, can also sign in with email). The first time it needs an email and a password; after that the email
 * and the password change on their own, each confirmed with the current password. `email` / `password` are undefined when
 * not being changed (an email that isn't valid is null). Admin accounts may add it too (owner, 27 Oct 2026). The sign-in
 * email is its own address, so it needn't match a Google email (27 Oct 2026); no other account may use it (checked in
 * setEmailLogin).
 */
export function emailLoginProblem(a: { role: string; hasPassword: boolean; currentOk: boolean; email?: string | null; password?: string }): string | null {
  if (a.hasPassword && !a.currentOk) return "Your current password is wrong.";
  if (!a.hasPassword && a.email === undefined) return "Enter your email.";
  if (!a.hasPassword && a.password === undefined) return "Choose a password.";
  if (a.email === undefined && a.password === undefined) return "Nothing to change.";
  if (a.email !== undefined && !a.email) return "Enter a valid email address.";
  return a.password === undefined ? null : passwordProblem(a.password);
}

/** Why a new password is not accepted, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  const pw = String(password ?? "");
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}
