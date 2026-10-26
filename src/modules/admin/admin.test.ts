import { test } from "node:test";
import assert from "node:assert/strict";
import { calStatus, calWeek } from "./posts.ts";
import { channelReconnects, type ReconnectChannel } from "./today.ts";

test("admin calendar: statuses, including paused and unconfirmed", () => {
  const now = Date.parse("2026-10-14T04:00:00Z");
  assert.equal(calStatus({ status: "posted", updated_at: "" }, false, now), "published");
  assert.equal(calStatus({ status: "scheduled", updated_at: "" }, true, now), "paused");
  assert.equal(calStatus({ status: "scheduled", updated_at: "" }, false, now), "scheduled");
  assert.equal(calStatus({ status: "processing", updated_at: "2026-10-14T03:50:00Z" }, false, now), "sending");
  assert.equal(calStatus({ status: "processing", updated_at: "2026-10-14T03:00:00Z" }, false, now), "unconfirmed");
  assert.equal(calStatus({ status: "draft", updated_at: "" }, false, now), null);
});

test("admin calendar: weeks run Monday to Sunday in Malaysia time", () => {
  // Wednesday 14 Oct 2026, 12:30 AM in Malaysia (still Tuesday in UTC)
  const w = calWeek(0, Date.parse("2026-10-13T16:30:00Z"));
  assert.equal(w.todayKey, "2026-10-14");
  assert.deepEqual([w.days[0].key, w.days[6].key], ["2026-10-12", "2026-10-18"]);
  assert.equal(w.startIso, "2026-10-11T16:00:00.000Z");
  assert.equal(w.label, "This week · 12 Oct – 18 Oct");
  assert.equal(calWeek(-1, Date.parse("2026-10-13T16:30:00Z")).days[0].key, "2026-10-05");
});

test("admin Today: channels to reconnect, one item per owner per app, with the button only for the admin who connected them", () => {
  const ch = (user_id: string, platform: ReconnectChannel["platform"], name: string | null, username: string | null = null): ReconnectChannel => ({ user_id, platform, name, username });
  const pages = ["21st Bags", "CC HomeLiving", ...Array.from({ length: 31 }, (_, i) => `Page ${i + 3}`)].map((n) => ch("me", "facebook", n));
  const needs = channelReconnects(
    [...pages, ch("me", "instagram", null, "tina.ig"), ch("boss", "threads", "Boss A"), ch("boss", "threads", "Boss B"), ch("cr1", "facebook", "Kedai Ali")],
    [{ id: "me", role: "admin", display_name: "Me", email: null }, { id: "boss", role: "admin", display_name: null, email: "boss@techwide.my" }, { id: "cr1", role: "creator", display_name: "Ali", email: null }],
    "me",
  );
  assert.deepEqual(needs.map((x) => [x.title, x.detail, x.techwide, x.href, x.by]), [
    ["Reconnect needed · Facebook · 33 Pages", "21st Bags, CC HomeLiving and 31 more can't post until they're connected again.", true, "/api/auth/meta/facebook/start", undefined],
    ["Reconnect needed · Instagram · 1 account", "tina.ig can't post until it's connected again.", true, "/api/auth/meta/instagram/start", undefined],
    ["Reconnect needed · Threads · 2 profiles", "Boss A and Boss B can't post until they're connected again.", true, undefined, "boss@techwide.my"],
    ["Reconnect needed · Facebook · 1 Page", "Kedai Ali can't post until it's connected again.", false, undefined, undefined],
  ]);
  assert.ok(needs.every((x) => x.kind === "reconnect"));
  assert.deepEqual(channelReconnects([], [], "me"), []);
});
