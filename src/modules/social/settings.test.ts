import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSettings, cleanTopic, parseCollaborators, settingsProblems, threadsTopic } from "./settings.ts";

test("S1: Facebook can save a Reel as a draft on the Page; drafts work for Reels (3–90 s) only", () => {
  assert.deepEqual(cleanSettings("facebook", { draft: true }), { draft: true });
  assert.deepEqual(cleanSettings("facebook", { draft: "yes" }), { draft: false });
  assert.deepEqual(settingsProblems("facebook", { draft: true }, 30), []);
  assert.match(settingsProblems("facebook", { draft: true }, 120)[0], /Reels only/);
  assert.deepEqual(settingsProblems("facebook", { draft: false }, 120), []);
});

test("S2: Instagram shows in the feed by default; collaborators are up to 3 valid usernames", () => {
  assert.deepEqual(cleanSettings("instagram", {}), { feed: true, collaborators: [], tags: [], trial: "off" });
  assert.deepEqual(cleanSettings("instagram", { feed: false, collaborators: ["@Brand.One", "brand_two", "brand.one", "x y", "c", "d"], trial: "auto" }), { feed: false, collaborators: ["brand.one", "brand_two", "c"], tags: [], trial: "auto" });
  assert.deepEqual(parseCollaborators("@a.b, c_d  e"), { list: ["a.b", "c_d", "e"], bad: [] });
  assert.match(settingsProblems("instagram", {}, null, "@ok, not-valid!")[0], /isn't an Instagram username/);
  assert.match(settingsProblems("instagram", {}, null, "a b c d")[0], /up to 3/);
});

test("S3: Instagram trial reels are manual or automatic; anything else is off", () => {
  assert.equal((cleanSettings("instagram", { trial: "manual" }) as { trial: string }).trial, "manual");
  assert.equal((cleanSettings("instagram", { trial: "public" }) as { trial: string }).trial, "off");
});

test("S4: Threads replies default to everyone; only Threads' own choices are kept", () => {
  assert.deepEqual(cleanSettings("threads", { replies: "followers_only", topic: "#Krill Oil" }), { replies: "followers_only", topic: "Krill Oil" });
  assert.equal((cleanSettings("threads", { replies: "nobody" }) as { replies: string }).replies, "everyone");
});

test("C3d: the Threads topic comes from the first hashtag; no #, periods or ampersands, at most 50 characters", () => {
  assert.equal(threadsTopic("Lutut berat? #krilloil #sendi"), "krilloil");
  assert.equal(threadsTopic("No tags here"), "");
  assert.equal(cleanTopic("##Mom & Kids. Club"), "Mom Kids Club");
  assert.equal(cleanTopic("x".repeat(60)).length, 50);
});

test("S6: Instagram tagged people are up to 20 valid usernames; anything else is refused with the reason", () => {
  assert.deepEqual((cleanSettings("instagram", { tags: ["@Shopee_MY", "x y", "shopee_my"] }) as { tags: string[] }).tags, ["shopee_my"]);
  assert.equal((cleanSettings("instagram", { tags: Array.from({ length: 25 }, (_, i) => `u${i}`) }) as { tags: string[] }).tags.length, 20);
  assert.match(settingsProblems("instagram", {}, null, "", "@ok bad!")[0], /tagged people/);
});
