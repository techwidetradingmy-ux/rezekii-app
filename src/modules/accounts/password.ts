import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Passwords are stored as "scrypt$N$r$p$salt$hash" (base64url). Only the hash is kept, never the password. */
const N = 16384, R = 8, P = 1, KEYLEN = 32;

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))));

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

/** Why a new password is not accepted, or null when it is fine. */
export function passwordProblem(password: unknown): string | null {
  const pw = String(password ?? "");
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}
