/**
 * Meta's Graph APIs (Facebook Pages, Instagram with Instagram Login, Threads). Server-only: uses the app secrets.
 * One Meta app ("Rezekii", 1781974539594430) with three use cases; Instagram and Threads each have their own app id and secret.
 */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";
export const THREADS_VERSION = "v1.0";

export type MetaKind = "facebook" | "instagram" | "threads";
const ENV: Record<MetaKind, [string, string]> = {
  facebook: ["META_APP_ID", "META_APP_SECRET"],
  instagram: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
  threads: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
};
export function metaApp(kind: MetaKind): { id: string; secret: string } {
  const [idKey, secretKey] = ENV[kind];
  const id = process.env[idKey];
  const secret = process.env[secretKey];
  if (!id || !secret) throw new Error(`${idKey} and ${secretKey} must be set`);
  return { id, secret };
}

/** An error from Meta, keeping its code (190 = the sign-in is no longer valid; the account must reconnect). */
export class MetaError extends Error {
  readonly code?: number;
  readonly subcode?: number;
  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.code = code;
    this.subcode = subcode;
  }
  get needsReconnect(): boolean {
    return this.code === 190 || this.code === 102;
  }
  /** The post (or other object) no longer exists, e.g. it was deleted in the app. */
  get gone(): boolean {
    return this.code === 100 && (this.subcode === 33 || /does not exist/i.test(this.message));
  }
}

/** GET (or POST with a form body when `form` is given), returning Meta's JSON or throwing a MetaError with Meta's own words. */
export async function metaFetch<T>(url: string, form?: Record<string, string>, timeoutMs = 60_000): Promise<T> {
  const res = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: form ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
    body: form ? new URLSearchParams(form) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string; code?: number; error_subcode?: number } | string; error_message?: string };
  if (!res.ok || body.error) {
    const e = typeof body.error === "object" ? body.error : {};
    const msg = e.error_user_msg || e.message || body.error_message || (typeof body.error === "string" ? body.error : "") || `HTTP ${res.status}`;
    throw new MetaError(msg, e.code, e.error_subcode);
  }
  return body as T;
}

export const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();
