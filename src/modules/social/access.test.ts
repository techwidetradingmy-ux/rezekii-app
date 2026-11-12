import { test } from "node:test";
import assert from "node:assert/strict";
import { facebookAuthUrl } from "../../integrations/meta/facebook.ts";
import { instagramAuthUrl } from "../../integrations/meta/instagram.ts";
import { threadsAuthUrl } from "../../integrations/meta/threads.ts";
import { levelFor } from "./access.ts";

test("Admins get Community's permissions, the review accounts the second review's, everyone else what Meta approved", () => {
  const none = { everyone: false, users: new Set<string>() };
  const listed = { everyone: false, users: new Set(["r1"]) };
  assert.equal(levelFor({ id: "a1", role: "admin" }, none), "community");
  assert.equal(levelFor({ id: "r1", role: "creator" }, listed), "insights");
  assert.equal(levelFor({ id: "c1", role: "creator" }, listed), "basic");
  assert.equal(levelFor({ id: "c1", role: "creator" }, { everyone: true, users: new Set() }), "insights");
});

test("the second review's level asks for exactly the four permissions in review on top of the approved ones", () => {
  process.env.META_APP_ID = process.env.INSTAGRAM_APP_ID = process.env.THREADS_APP_ID = "1";
  process.env.META_APP_SECRET = process.env.INSTAGRAM_APP_SECRET = process.env.THREADS_APP_SECRET = "s";
  delete process.env.META_FB_CONFIG_ID;
  delete process.env.META_FB_INSIGHTS_CONFIG_ID;
  const scope = (url: string) => new URL(url).searchParams.get("scope")!.split(",");
  const extra = (level: "basic" | "insights", f: typeof instagramAuthUrl) => scope(f("S", "https://x.test/cb", level)).filter((s) => !scope(f("S", "https://x.test/cb", "basic")).includes(s));
  assert.deepEqual(extra("insights", facebookAuthUrl), ["read_insights"]);
  assert.deepEqual(extra("insights", instagramAuthUrl), ["instagram_business_manage_insights"]);
  assert.deepEqual(extra("insights", threadsAuthUrl), ["threads_manage_insights", "threads_read_replies"]);
  // Everyone else keeps the saved Facebook configuration.
  process.env.META_FB_CONFIG_ID = "cfg-basic";
  assert.equal(new URL(facebookAuthUrl("S", "https://x.test/cb")).searchParams.get("config_id"), "cfg-basic");
  assert.equal(new URL(facebookAuthUrl("S", "https://x.test/cb", "insights")).searchParams.get("config_id"), null);
  delete process.env.META_FB_CONFIG_ID;
});
