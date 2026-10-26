import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { MetaError } from "../../integrations/meta/graph.ts";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import type { SocialAccount } from "../social/accounts.ts";
import { noteFor, refreshCommunity, yesterday } from "./numbers.ts";

test("yesterday is Malaysia's yesterday, as a date and its start and end", () => {
  // 23 Oct 2026, 01:30 in Malaysia (22 Oct, 17:30 UTC)
  const y = yesterday(Date.parse("2026-10-22T17:30:00Z"));
  assert.deepEqual(y, { day: "2026-10-22", from: "2026-10-21T16:00:00.000Z", to: "2026-10-22T16:00:00.000Z" });
});

test("a channel that can't be read gets a note an Admin can act on", () => {
  assert.equal(noteFor(new MetaError("Error validating access token", 190)), "The sign-in has ended: connect this channel again.");
  assert.equal(noteFor(new MetaError("(#10) Application does not have permission for this action", 10)), "Connect this channel again to allow Community's numbers.");
  assert.equal(noteFor(new MetaError("(#100) Invalid metric", 100)), "(#100) Invalid metric");
});

test("the daily read keeps channels waiting to be reconnected and marks one whose sign-in has ended", async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SECRET_KEY = "secret";
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const page = (id: string, external_id: string, status: SocialAccount["status"]): SocialAccount => ({
    id, user_id: "a1", platform: "facebook", external_id, name: id, username: null, avatar_url: null, account_type: null,
    token_enc: encryptToken("page-token"), token_expires_at: null, status, connected_at: "2026-10-01T00:00:00Z",
  });
  const channels = [page("ended", "111", "active"), page("waiting", "222", "reconnect"), page("old", "333", "active")];
  // Meta: 111 and 222 say the sign-in has ended (190); 333 lacks Community's permissions (10).
  const metaError: Record<string, { message: string; code: number }> = { "111": { message: "Error validating access token", code: 190 }, "222": { message: "Error validating access token", code: 190 }, "333": { message: "(#10) Application does not have permission", code: 10 } };
  const calls: { url: string; init: RequestInit }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const graph = url.match(/graph\.facebook\.com\/[^/]+\/(\d+)/);
    if (graph) return new Response(JSON.stringify({ error: metaError[graph[1]] }), { status: 400 });
    if (url.includes("app_users?role=eq.admin")) return new Response(JSON.stringify([{ id: "a1" }]));
    if (url.includes("social_accounts?user_id=in.")) return new Response(JSON.stringify(channels));
    return new Response("");
  }) as typeof fetch;
  try {
    await refreshCommunity(0, Date.now() + 60_000, Date.parse("2026-10-22T17:30:00Z"));
  } finally {
    globalThis.fetch = real;
  }
  assert.match(calls.find((c) => c.url.includes("social_accounts?user_id=in."))!.url, /status=in\.\(active,reconnect\)/);
  // Only the channel that was still active and whose sign-in ended is marked; the note saved stays as before.
  const marked = calls.filter((c) => c.init.method === "PATCH" && JSON.parse(String(c.init.body)).status === "reconnect").map((c) => c.url);
  assert.deepEqual(marked, ["https://db.test/rest/v1/social_accounts?id=eq.ended"]);
  const notes = Object.fromEntries(calls.filter((c) => c.url.includes("social_stats?")).map((c) => JSON.parse(String(c.init.body))[0]).map((r) => [r.account_id, r.numbers.note]));
  assert.deepEqual(notes, { ended: "The sign-in has ended: connect this channel again.", waiting: "The sign-in has ended: connect this channel again.", old: "Connect this channel again to allow Community's numbers." });
});
