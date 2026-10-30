import { createHmac } from "node:crypto";

/**
 * TikTok Shop request signature:
 * 1. take every query param except `sign` and `access_token`, sorted by key
 * 2. join as {path}{key1}{value1}{key2}{value2}...
 * 3. append the raw JSON body, if any
 * 4. wrap as {secret}{string}{secret}
 * 5. HMAC-SHA256 with the secret, hex
 */
export function signRequest(
  path: string,
  params: Record<string, string>,
  body: string,
  secret: string,
): string {
  const joined = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "access_token")
    .sort()
    .map((key) => key + params[key])
    .join("");
  const plain = secret + path + joined + body + secret;
  return createHmac("sha256", secret).update(plain).digest("hex");
}
