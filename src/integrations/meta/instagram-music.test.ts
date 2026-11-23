import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstagramReel, instagramFacebookAuthUrl, instagramSongs, pagesInstagram } from "./instagram.ts";
import { cleanSettings, songRefused, type InstagramSettings } from "../../modules/social/settings.ts";
import { igViaFacebookFor } from "../../modules/social/access.ts";

type Call = { url: URL; form: Record<string, string> };
async function withApi<T>(reply: unknown, run: () => Promise<T>): Promise<{ result: T; calls: Call[] }> {
  const calls: Call[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    calls.push({ url: new URL(String(input)), form: Object.fromEntries(new URLSearchParams(init.body ? String(init.body) : "")) });
    return new Response(JSON.stringify(reply));
  }) as typeof fetch;
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = real;
  }
}
const song = { id: "9876", volume: 50 };

test("a Reel through Facebook goes to graph.facebook.com with the song; with Instagram Login there's no song", async () => {
  const fb = await withApi({ id: "c1" }, () => createInstagramReel("ig1", { token: "page-tok", viaFacebook: true }, "https://s/v.mp4", "Cap", { audio: song }));
  assert.equal(fb.calls[0].url.host, "graph.facebook.com");
  assert.equal(fb.calls[0].form.access_token, "page-tok");
  assert.deepEqual(JSON.parse(fb.calls[0].form.audio_configuration), { audio_id: "9876", audio_volume: 50, video_volume: 100 });
  const ig = await withApi({ id: "c1" }, () => createInstagramReel("ig1", "ig-tok", "https://s/v.mp4", "Cap", { audio: song }));
  assert.equal(ig.calls[0].url.host, "graph.instagram.com");
  assert.equal(ig.calls[0].form.audio_configuration, undefined);
  const none = await withApi({ id: "c1" }, () => createInstagramReel("ig1", { token: "page-tok", viaFacebook: true }, "https://s/v.mp4", "Cap", { audio: null }));
  assert.equal(none.calls[0].form.audio_configuration, undefined);
});

test("songs: trending when the search is empty (no search_query), Meta's fields mapped", async () => {
  const reply = { audio: [{ audio_id: 111, title: "Lagu", display_artist: "Siti", duration_in_ms: 61400, cover_artwork_thumbnail_uri: "https://c/1.jpg", download_url: "https://d/1.mp4" }, { title: "No id" }] };
  const trending = await withApi(reply, () => instagramSongs("ig1", { token: "t", viaFacebook: true }));
  assert.equal(trending.calls[0].url.pathname, "/v25.0/ig_audio");
  assert.equal(trending.calls[0].url.searchParams.get("audio_type"), "music");
  assert.equal(trending.calls[0].url.searchParams.get("user_id"), "ig1");
  assert.equal(trending.calls[0].url.searchParams.has("search_query"), false);
  assert.deepEqual(trending.result, [{ id: "111", title: "Lagu", artist: "Siti", seconds: 61, cover: "https://c/1.jpg", preview: "https://d/1.mp4" }]);
  const searched = await withApi(reply, () => instagramSongs("ig1", { token: "t", viaFacebook: true }, "  siti "));
  assert.equal(searched.calls[0].url.searchParams.get("search_query"), "siti");
});

test("connecting through Facebook keeps each Instagram account once, with its Page's token; Pages without one are skipped", async () => {
  const ig = { id: "1784", username: "kedai.aina", name: "Kedai Aina", profile_picture_url: "https://p/1.jpg" };
  const r = await withApi({ data: [{ access_token: "pt1", instagram_business_account: ig }, { access_token: "pt2" }, { access_token: "pt3", instagram_business_account: ig }] }, () => pagesInstagram("user-tok"));
  assert.deepEqual(r.result, [{ pageToken: "pt1", ...ig }]);
  assert.match(r.calls[0].url.searchParams.get("fields") ?? "", /instagram_business_account\{id,username,name,profile_picture_url\}/);
});

test("Facebook's sign-in for Instagram asks for the Instagram and Page permissions, or uses the saved configuration", () => {
  process.env.META_APP_ID = "1";
  process.env.META_APP_SECRET = "s";
  delete process.env.META_IG_FB_CONFIG_ID;
  delete process.env.META_IG_FB_INSIGHTS_CONFIG_ID;
  const scope = (level: "basic" | "insights") => new URL(instagramFacebookAuthUrl("S", "https://x.test/api/auth/meta/facebook/callback", level)).searchParams.get("scope")!.split(",");
  assert.deepEqual(scope("basic"), ["instagram_basic", "instagram_content_publish", "instagram_manage_comments", "pages_show_list", "pages_read_engagement", "business_management"]);
  assert.deepEqual(scope("insights").filter((s) => !scope("basic").includes(s)), ["instagram_manage_insights"]);
  process.env.META_IG_FB_CONFIG_ID = "cfg-ig";
  const url = new URL(instagramFacebookAuthUrl("S", "https://x.test/cb"));
  assert.equal(url.searchParams.get("config_id"), "cfg-ig");
  assert.equal(url.searchParams.get("scope"), null);
  delete process.env.META_IG_FB_CONFIG_ID;
});

test("the song is kept as sent (unknown volumes become medium); anything else is no song", () => {
  const ig = (audio: unknown) => (cleanSettings("instagram", { audio }) as InstagramSettings).audio;
  assert.deepEqual(ig({ id: "9876", title: "Lagu", artist: "Siti", volume: 25 }), { id: "9876", title: "Lagu", artist: "Siti", volume: 25 });
  assert.equal(ig({ id: "9876", title: "Lagu", artist: "Siti", volume: 7 })?.volume, 50);
  assert.equal(ig({ id: "bad id!", title: "x" }), null);
  assert.equal(ig(null), null);
  assert.equal((cleanSettings("instagram", {}) as InstagramSettings).audio, null);
});

test("a refusal naming the song drops it; other errors (a video's audio codec) don't", () => {
  assert.equal(songRefused("Invalid parameter: audio_id is not available"), true);
  assert.equal(songRefused("This song isn't available in your region"), true);
  assert.equal(songRefused("The video's audio codec is not supported"), false);
  assert.equal(songRefused("The following user(s) cannot be accessed: aina"), false);
});

test("Connect through Facebook: Admins and the review accounts, then everyone once it's turned on", () => {
  const none = { everyone: false, users: new Set<string>() };
  assert.equal(igViaFacebookFor({ id: "a1", role: "admin" }, none), true);
  assert.equal(igViaFacebookFor({ id: "r1", role: "creator" }, { everyone: false, users: new Set(["r1"]) }), true);
  assert.equal(igViaFacebookFor({ id: "c1", role: "creator" }, none), false);
  assert.equal(igViaFacebookFor({ id: "c1", role: "creator" }, { everyone: true, users: new Set() }), true);
});

test("Comments and Numbers read an account connected through Facebook from graph.facebook.com", async () => {
  const { instagramComments } = await import("./comments.ts");
  const { instagramDay } = await import("./insights.ts");
  const fb = { token: "page-tok", viaFacebook: true as const };
  const c = await withApi({ data: [] }, () => instagramComments("ig1", fb, "kedai.aina"));
  assert.deepEqual([c.calls[0].url.host, c.calls[0].url.searchParams.get("access_token")], ["graph.facebook.com", "page-tok"]);
  const d = await withApi({ followers_count: 5, data: [] }, () => instagramDay("ig1", fb, "2026-11-22T00:00:00Z", "2026-11-23T00:00:00Z"));
  assert.ok(d.calls.length > 0 && d.calls.every((x) => x.url.host === "graph.facebook.com"));
});
