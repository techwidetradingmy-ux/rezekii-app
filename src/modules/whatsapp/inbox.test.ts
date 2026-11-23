import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseWaWebhook, waSignatureOk } from "../../integrations/meta/whatsapp.ts";
import { freeHoursLeft, reply, saveWebhook, waDigits } from "./inbox.ts";

const hook = (value: unknown) => ({ object: "whatsapp_business_account", entry: [{ id: "111", changes: [{ field: "messages", value }] }] });

test("reads customers' messages of each kind, with their WhatsApp name", () => {
  const { messages, statuses } = parseWaWebhook(hook({
    metadata: { phone_number_id: "999" },
    contacts: [{ wa_id: "60123456789", profile: { name: "Aina" } }],
    messages: [
      { from: "60123456789", id: "wamid.A", timestamp: "1795400000", type: "text", text: { body: "Hi, stok ada?" } },
      { from: "60123456789", id: "wamid.B", timestamp: "1795400060", type: "image", image: { id: "55501", mime_type: "image/jpeg", caption: "Yang ni" } },
      { from: "60123456789", id: "wamid.C", timestamp: "1795400120", type: "audio", audio: { id: "55502", mime_type: "audio/ogg" } },
      { from: "60123456789", id: "wamid.D", timestamp: "1795400180", type: "location", location: { latitude: 3.1, longitude: 101.6, name: "KLCC" } },
      { from: "60123456789", id: "wamid.E", timestamp: "1795400240", type: "interactive", interactive: { button_reply: { title: "Ya" } } },
    ],
  }));
  assert.equal(statuses.length, 0);
  assert.deepEqual(messages.map((m) => [m.wamid, m.kind, m.body, m.mediaId]), [
    ["wamid.A", "text", "Hi, stok ada?", null],
    ["wamid.B", "image", "Yang ni", "55501"],
    ["wamid.C", "audio", null, "55502"],
    ["wamid.D", "location", "KLCC\nhttps://maps.google.com/?q=3.1,101.6", null],
    ["wamid.E", "interactive", "Ya", null],
  ]);
  assert.equal(messages[0].name, "Aina");
  assert.equal(messages[0].numberId, "999");
  assert.equal(messages[0].at, new Date(1795400000 * 1000).toISOString());
});

test("reads delivery updates and their errors; ignores other webhooks", () => {
  const { statuses } = parseWaWebhook(hook({
    metadata: { phone_number_id: "999" },
    statuses: [{ id: "wamid.X", status: "failed", timestamp: "1795400000", errors: [{ code: 131047, title: "Re-engagement message", error_data: { details: "More than 24 hours have passed" } }] }],
  }));
  assert.deepEqual(statuses.map((s) => [s.wamid, s.status, s.error]), [["wamid.X", "failed", "More than 24 hours have passed"]]);
  assert.deepEqual(parseWaWebhook({ object: "page", entry: [] }), { messages: [], statuses: [] });
  assert.deepEqual(parseWaWebhook(null), { messages: [], statuses: [] });
});

test("only Meta's signature lets a webhook in", () => {
  const raw = JSON.stringify(hook({}));
  const sig = `sha256=${createHmac("sha256", "s3cret").update(raw).digest("hex")}`;
  assert.equal(waSignatureOk(raw, sig, "s3cret"), true);
  assert.equal(waSignatureOk(`${raw} `, sig, "s3cret"), false);
  assert.equal(waSignatureOk(raw, sig, "other"), false);
  assert.equal(waSignatureOk(raw, null, "s3cret"), false);
  assert.equal(waSignatureOk(raw, sig, undefined), false);
});

test("replies are free for 24 hours after the customer's last message", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  assert.equal(freeHoursLeft("2026-11-23T11:30:00Z", now), 24);
  assert.equal(freeHoursLeft("2026-11-22T12:30:00Z", now), 1);
  assert.equal(freeHoursLeft("2026-11-22T12:00:00Z", now), 0);
  assert.equal(freeHoursLeft(null, now), 0);
});

test("a Malaysian number matches however it was typed", () => {
  assert.equal(waDigits("012-345 6789"), "60123456789");
  assert.equal(waDigits("+60 12-345 6789"), "60123456789");
  assert.equal(waDigits("60123456789"), "60123456789");
  assert.equal(waDigits(null), "");
});

type Call = { url: string; method: string; body: unknown; prefer: string | null };
async function withDb(answers: (url: string) => unknown, run: () => Promise<unknown>): Promise<{ calls: Call[]; result: unknown }> {
  const calls: Call[] = [];
  const real = globalThis.fetch;
  const env = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY, wa: process.env.WHATSAPP_TOKEN };
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SECRET_KEY = "k";
  process.env.WHATSAPP_TOKEN = "t";
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : null, prefer: new Headers(init.headers).get("prefer") });
    return new Response(JSON.stringify(answers(url) ?? []), { status: 200 });
  }) as typeof fetch;
  try {
    return { calls, result: await run() };
  } finally {
    globalThis.fetch = real;
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_SECRET_KEY = env.key;
    process.env.WHATSAPP_TOKEN = env.wa;
  }
}

test("a message is kept once and its chat moves to the top", async () => {
  const msg = { wamid: "wamid.A", numberId: "999", contact: "60123456789", name: "Aina", kind: "text", body: "Hi", mediaId: null, mediaType: null, at: "2026-11-23T12:00:00.000Z" };
  const { calls } = await withDb(() => [], () => saveWebhook({ messages: [msg], statuses: [{ wamid: "wamid.Z", status: "delivered", error: null, at: msg.at }] }));
  assert.match(calls[0].url, /wa_messages\?on_conflict=wamid$/);
  assert.match(calls[0].prefer ?? "", /ignore-duplicates/);
  assert.match(calls[1].url, /wa_chats\?on_conflict=number_id,contact$/);
  assert.deepEqual(calls[1].body, { number_id: "999", contact: "60123456789", name: "Aina", last_at: msg.at, last_in_at: msg.at, last_text: "Hi" });
  // "delivered" never overwrites "read".
  assert.equal(calls[2].method, "PATCH");
  assert.match(calls[2].url, /wamid=eq\.wamid\.Z&direction=eq\.out&status=not\.in\.\(read\)$/);
});

test("no reply goes out after the free 24 hours", async () => {
  const old = new Date(Date.now() - 25 * 3600_000).toISOString();
  const { calls, result } = await withDb((url) => (url.includes("wa_chats") ? [{ last_in_at: old }] : []), () => reply("999", "60123456789", "Hello", "owner"));
  assert.deepEqual(result, { ok: false, error: "The free 24 hours have passed. WhatsApp only takes paid templates now, and those are off." });
  assert.ok(!calls.some((c) => c.url.includes("graph.facebook.com")));
});

test("a reply inside the 24 hours is sent and kept with who sent it", async () => {
  const recent = new Date(Date.now() - 3600_000).toISOString();
  const { calls, result } = await withDb(
    (url) => (url.includes("graph.facebook.com") ? { messages: [{ id: "wamid.OUT" }] } : url.includes("wa_chats?") && !url.includes("PATCH") ? [{ last_in_at: recent }] : []),
    () => reply("999", "60123456789", "Ada, boleh order", "owner"),
  );
  assert.deepEqual(result, { ok: true });
  const sent = calls.find((c) => c.url.includes("graph.facebook.com"));
  assert.match(sent?.url ?? "", /\/999\/messages$/);
  assert.deepEqual(sent?.body, { messaging_product: "whatsapp", recipient_type: "individual", to: "60123456789", type: "text", text: { body: "Ada, boleh order", preview_url: true } });
  const kept = calls.find((c) => c.method === "POST" && c.url.endsWith("/wa_messages"));
  assert.equal((kept?.body as { wamid: string; sent_by: string }).wamid, "wamid.OUT");
  assert.equal((kept?.body as { sent_by: string }).sent_by, "owner");
});
