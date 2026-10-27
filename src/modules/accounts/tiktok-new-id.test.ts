import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { earlierConnection, linkOrSignInTikTok, PRODUCTION_KEY_FROM, replaceTikTokConnection, type AppUser } from "./users.ts";

process.env.SUPABASE_URL = "https://db.test";
process.env.SUPABASE_SECRET_KEY = "secret";

/**
 * Supabase stand-in: `answer` picks the reply for each call by its path. TikTok gave the account NEW in place of OLD when
 * rezekii.com moved to the Production key.
 */
let calls: { path: string; method: string; body: unknown }[] = [];
let answer: (path: string, method: string) => unknown[] = () => [];
beforeEach(() => {
  calls = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const path = decodeURIComponent(String(input).replace("https://db.test/rest/v1/", ""));
    const method = init.method ?? "GET";
    calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify(answer(path, method)), { status: 200 });
  }) as typeof fetch;
});

const user = (id: string, tiktok: string | null, role: AppUser["role"] = "creator"): AppUser => ({ id, role, display_name: null, avatar_url: null, email: null, tiktok_open_id: tiktok, tiktok_username: "homefithacksofficial" });
const profile = { open_id: "NEW", username: "HomeFitHacksOfficial" };

test("the same account under its pre-switch open_id is found by username, only for connections not seen since the switch", async () => {
  answer = (p) => (p.startsWith("tiktok_connections?username=") ? [{ open_id: "OLD", user_id: "u1" }] : []);
  assert.deepEqual(await earlierConnection(profile), { open_id: "OLD", user_id: "u1" });
  const q = calls[0].path;
  assert.match(q, /username=eq\.homefithacksofficial/);
  assert.match(q, /union_id=is\.null/);
  assert.ok(q.includes(`updated_at=lt.${PRODUCTION_KEY_FROM}`));
  assert.match(q, /open_id=neq\.NEW/);
});

test("after 2026 the username match stops; union_id still matches", async () => {
  answer = () => [{ open_id: "OLD", user_id: "u1" }];
  assert.equal(await earlierConnection(profile, Date.parse("2027-01-02T00:00:00Z")), null);
  assert.deepEqual(await earlierConnection({ ...profile, union_id: "U" }, Date.parse("2027-01-02T00:00:00Z")), { open_id: "OLD", user_id: "u1" });
  assert.match(calls.at(-1)!.path, /union_id=eq\.U/);
});

test("signing in with TikTok under the new open_id reaches the creator's own account, not a new one", async () => {
  let moved = false;
  answer = (p, m) => {
    if (p.startsWith("app_users?tiktok_open_id=eq.NEW")) return moved ? [user("u1", "NEW")] : [];
    if (p.startsWith("tiktok_connections?open_id=eq.NEW")) return [];
    if (p.startsWith("tiktok_connections?username=")) return [{ open_id: "OLD", user_id: "u1" }];
    if (p.startsWith("app_users?id=eq.u1") && m === "GET") return [user("u1", "OLD")];
    if (p.startsWith("app_users?id=eq.u1") && m === "PATCH") return (moved = true), [user("u1", "NEW")];
    return [];
  };
  const r = await linkOrSignInTikTok(null, profile);
  assert.ok("user" in r && r.user.id === "u1" && !r.linked);
  assert.ok(!calls.some((c) => c.method === "POST" && c.path.startsWith("app_users")), "no new account");
});

test("a Techwide team account (held, not signed in with) under its new open_id still can't be signed into", async () => {
  answer = (p, m) => {
    if (p.startsWith("tiktok_connections?username=")) return [{ open_id: "OLD", user_id: "admin1" }];
    if (p.startsWith("app_users?id=eq.admin1") && m === "GET") return [user("admin1", "SOMEONE_ELSE", "admin")];
    return [];
  };
  assert.deepEqual(await linkOrSignInTikTok(null, profile), { taken: true });
});

test("connecting another Rezekii account's TikTok (under its new open_id) is refused", async () => {
  answer = (p) => (p.startsWith("tiktok_connections?username=") ? [{ open_id: "OLD", user_id: "u1" }] : []);
  assert.deepEqual(await linkOrSignInTikTok(user("u2", null), profile), { taken: true });
});

test("the old open_id's posts, videos, brand channels and sign-in move to the new one; the old connection goes", async () => {
  answer = (p, m) => (p.startsWith("social_brands?user_id") && m === "GET" ? [{ id: "b1", channels: ["tiktok:OLD", "page-1"] }] : []);
  await replaceTikTokConnection("u1", "OLD", "NEW");
  const w = calls.filter((c) => c.method !== "GET").map((c) => [c.method, c.path.split("?")[0], c.body]);
  assert.deepEqual(w, [
    ["PATCH", "posts", { tiktok_open_id: "NEW" }],
    ["PATCH", "tiktok_videos", { open_id: "NEW" }],
    ["PATCH", "social_brands", { channels: ["tiktok:NEW", "page-1"] }],
    ["PATCH", "app_users", { tiktok_open_id: "NEW" }],
    ["DELETE", "tiktok_connections", null],
  ]);
  assert.ok(calls.every((c) => c.method === "GET" || c.path.includes("OLD") || c.path.includes("b1")), "only the old account's rows change");
});
