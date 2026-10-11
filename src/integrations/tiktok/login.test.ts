import { test } from "node:test";
import assert from "node:assert/strict";
import { googleAuthUrl } from "../google/oauth.ts";
import { DEFAULT_SCOPES, tiktokAuthUrl } from "./login.ts";

test("TikTok Login Kit link: client key, comma-separated scopes, code flow, redirect and state", () => {
  process.env.TIKTOK_CLIENT_KEY = "ck_test";
  process.env.TIKTOK_CLIENT_SECRET = "cs_test";
  delete process.env.TIKTOK_SCOPES;
  const u = new URL(tiktokAuthUrl("S1", "https://rezekii.com/api/auth/tiktok/callback"));
  assert.equal(u.origin + u.pathname, "https://www.tiktok.com/v2/auth/authorize/");
  assert.equal(u.searchParams.get("client_key"), "ck_test");
  assert.equal(u.searchParams.get("scope"), DEFAULT_SCOPES.join(","));
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("redirect_uri"), "https://rezekii.com/api/auth/tiktok/callback");
  assert.equal(u.searchParams.get("state"), "S1");
  assert.equal(u.searchParams.get("client_secret"), null);
  process.env.TIKTOK_SCOPES = "user.info.basic, video.upload";
  assert.equal(new URL(tiktokAuthUrl("S", "https://x.test/cb")).searchParams.get("scope"), "user.info.basic,video.upload");
  delete process.env.TIKTOK_SCOPES;
});

test("Google sign-in link: client id, openid email profile, account picker, no secret", () => {
  process.env.GOOGLE_CLIENT_ID = "gid.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "gsecret";
  const u = new URL(googleAuthUrl("S2", "https://rezekii.com/api/auth/google/callback"));
  assert.equal(u.host, "accounts.google.com");
  assert.equal(u.searchParams.get("client_id"), "gid.apps.googleusercontent.com");
  assert.equal(u.searchParams.get("scope"), "openid email profile");
  assert.equal(u.searchParams.get("prompt"), "select_account");
  assert.equal(u.searchParams.get("state"), "S2");
  assert.equal(u.searchParams.get("client_secret"), null);
});

test("missing credentials fail loudly instead of sending a broken link", () => {
  delete process.env.TIKTOK_CLIENT_KEY;
  assert.throws(() => tiktokAuthUrl("S", "https://x.test/cb"), /TIKTOK_CLIENT_KEY/);
});
