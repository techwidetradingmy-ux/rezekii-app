import { API_BASE, appCredentials } from "./config.ts";
import { signRequest } from "./sign.ts";

/** TikTok Shop's reply envelope. `code` 0 means success. */
export type ApiReply<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

/** Calls a TikTok Shop API with a creator's or partner's access token. */
export async function callApi<T>(opts: {
  method: "GET" | "POST";
  path: string;
  accessToken: string;
  query?: Record<string, string>;
  body?: unknown;
}): Promise<ApiReply<T>> {
  const { appKey, appSecret } = appCredentials();
  const body = opts.body === undefined ? "" : JSON.stringify(opts.body);
  const params: Record<string, string> = {
    ...opts.query,
    app_key: appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  params.sign = signRequest(opts.path, params, body, appSecret);

  const res = await fetch(`${API_BASE}${opts.path}?${new URLSearchParams(params)}`, {
    method: opts.method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": opts.accessToken,
    },
    body: body || undefined,
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiReply<T>;
  } catch {
    return { code: -1, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }
}
