import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptToken } from "../creator-accounts/token-crypto.ts";
import { channelComments, commentAction } from "./comments.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

/** The database answers with `rows` for the channel lookup; Meta answers `meta`. Every call is recorded. */
async function run<T>(rows: object[], meta: (url: string) => Response, go: () => Promise<T>): Promise<{ result: T; urls: string[] }> {
  const urls: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith("https://db.test")) return new Response(JSON.stringify(url.includes("social_accounts?id=eq.") ? rows : []));
    return meta(url);
  }) as typeof fetch;
  try {
    return { result: await go(), urls };
  } finally {
    globalThis.fetch = real;
  }
}
const page = (platform = "facebook") => ({ id: "acc1", user_id: "u1", platform, external_id: "p1", name: "Shop", username: null, token_enc: encryptToken("tok"), token_expires_at: null, status: "active" });

test("a reply needs words, a known action and a comment id, before anything is asked", async () => {
  const { result: a, urls } = await run([page()], () => new Response("{}"), async () => [
    await commentAction("u1", "acc1", "c1", "reply", "   "),
    await commentAction("u1", "acc1", "c1", "like" as never),
    await commentAction("u1", "acc1", "../x", "hide"),
  ]);
  assert.deepEqual(a.map((r) => (r.ok ? "ok" : r.error)), ["Write a reply first.", "Something's missing. Reload the page and try again.", "Something's missing. Reload the page and try again."]);
  assert.deepEqual(urls, []);
});

test("only the person's own channel can be read or answered; Threads needs threads_read_replies and can't delete", async () => {
  const { result: notMine } = await run([], () => new Response("{}"), () => commentAction("u2", "acc1", "c1", "hide"));
  assert.deepEqual(notMine, { ok: false, error: "This channel isn't connected to your account." });
  const refused = () => new Response(JSON.stringify({ error: { message: "(#10) Application does not have permission for this action", code: 10 } }), { status: 400 });
  const { result: threads, urls } = await run([page("threads")], refused, () => channelComments("u1", "acc1"));
  assert.deepEqual(threads, { posts: [], problem: "permission" });
  assert.ok(urls.some((u) => u.startsWith("https://graph.threads.net/")), "a Threads channel is read from Threads");
  const { result: del } = await run([page("threads")], () => new Response("{}"), () => commentAction("u1", "acc1", "c1", "delete"));
  assert.deepEqual(del, { ok: false, error: "Threads doesn't let apps delete replies. Hide it instead." });
  const { urls: lookup } = await run([page()], () => new Response(JSON.stringify({ data: [] })), () => channelComments("u1", "acc1"));
  assert.match(lookup[0], /social_accounts\?id=eq\.acc1&user_id=eq\.u1/);
});

test("a channel connected without the comments permission says so instead of failing", async () => {
  const { result } = await run([page()], () => new Response(JSON.stringify({ error: { message: "(#10) Requires pages_read_user_content permission", code: 10 } }), { status: 400 }), () => channelComments("u1", "acc1"));
  assert.deepEqual(result, { posts: [], problem: "permission" });
});
