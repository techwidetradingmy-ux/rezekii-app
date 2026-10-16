import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignFields, changedFields, toDay, type CampaignForm } from "./campaigns.ts";

// 16 Oct 2026, 18:30 in Malaysia.
const NOW = Date.parse("2026-10-16T10:30:00Z");

const form = (o: Partial<CampaignForm> = {}): CampaignForm => ({
  name: "Wellness Year-End Push", description: "Health and beauty.", regEnd: "2026-11-15", start: "2026-11-01", end: "2026-12-31",
  commission: 18, local: true, crossBorder: false, shopCodes: [], whatsapp: "+60123456789", email: "partners@techwide.my", phone: "", ...o,
});

test("campaignFields turns the form into TikTok's fields (Malaysia days, 0.01% units)", () => {
  const r = campaignFields(form(), NOW);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.fields.commission_rate, 1800);
  // TikTok requires registration to open when the campaign starts.
  assert.equal(r.fields.registration_start_time, r.fields.campaign_start_time);
  assert.equal(r.fields.campaign_start_time, Date.parse("2026-10-31T16:00:00Z") / 1000);
  assert.equal(r.fields.registration_end_time, Date.parse("2026-11-15T16:00:00Z") / 1000 - 1);
  assert.equal(r.fields.campaign_end_time, Date.parse("2026-12-31T16:00:00Z") / 1000 - 1);
  assert.deepEqual(r.fields.target_seller_types, ["LOCAL"]);
  assert.deepEqual(r.fields.contact_info, { whatsapp: "+60123456789", email: "partners@techwide.my" });
  assert.equal(toDay(r.fields.campaign_start_time), "2026-11-01");
});

test("campaignFields refuses what TikTok would refuse", () => {
  const no = (o: Partial<CampaignForm>) => { const r = campaignFields(form(o), NOW); return r.ok ? "" : r.error; };
  assert.match(no({ name: "x".repeat(50) }), /under 50/);
  assert.match(no({ commission: 1 }), /more than 1%/);
  assert.match(no({ commission: 80 }), /less than 80%/);
  assert.match(no({ start: "2026-12-31", end: "2026-11-01" }), /start before it ends/);
  assert.match(no({ start: "2026-11-01", end: "2027-10-27" }), /360 days/);
  assert.ok(campaignFields(form({ start: "2026-11-01", end: "2027-10-26", regEnd: "2027-10-26" }), NOW).ok, "360 days counting the start day");
  assert.match(no({ local: false }), /which shops/);
  assert.match(no({ whatsapp: " " }), /WhatsApp/);
  assert.match(no({ whatsapp: "12ab" }), /WhatsApp number doesn't look right/);
  assert.match(no({ description: "  " }), /needs a description/);
  assert.match(no({ description: "x".repeat(1001) }), /at most 1,000/);
  assert.ok(campaignFields(form({ description: "x".repeat(1000) }), NOW).ok);
  assert.match(no({ regEnd: "2027-01-05" }), /close between/);
  assert.match(no({ regEnd: "2026-10-30" }), /close between/);
  assert.ok(campaignFields(form({ local: false, shopCodes: [" mylcabc123 "] }), NOW).ok);
});

test("e164: Malaysian numbers typed any usual way go to TikTok as +60…", async () => {
  const { e164 } = await import("./campaigns.ts");
  assert.deepEqual(["60124979020", "0124979020", "012-497 9020", "+60 12-497 9020", "0060124979020", "124979020"].map(e164), Array(6).fill("+60124979020"));
  assert.equal(e164("+65 9123 4567"), "+6591234567");
  assert.equal(e164("12ab"), null);
  assert.equal(e164("012"), null);
  const r = campaignFields(form({ whatsapp: "012-497 9020", phone: "03-1234 5678" }), NOW);
  assert.ok(r.ok && r.fields.contact_info.whatsapp === "+60124979020" && r.fields.contact_info.phone === "+60312345678");
});

test("campaign dates: starting today means 10 minutes from now; a new campaign can't start in the past", () => {
  const today = campaignFields(form({ start: "2026-10-16", end: "2026-10-23", regEnd: "2026-10-23" }), NOW);
  assert.ok(today.ok && today.fields.campaign_start_time === NOW / 1000 + 600 && today.fields.registration_start_time === NOW / 1000 + 600);
  const past = campaignFields(form({ start: "2026-10-15", end: "2026-10-23", regEnd: "2026-10-23" }), NOW);
  assert.ok(!past.ok && /before today/.test(past.error));
  assert.ok(campaignFields(form({ start: "2026-10-01", end: "2026-10-23", regEnd: "2026-10-23" }), NOW, false).ok, "an existing campaign keeps its start");
});

test("changedFields: an edit sends only what changed, so a running campaign's start isn't sent again", () => {
  const running = form({ start: "2026-10-01", end: "2026-12-31", regEnd: "2026-12-31" });
  const was = campaignFields(running, NOW, false), next = campaignFields({ ...running, description: "New words." }, NOW, false);
  assert.ok(was.ok && next.ok);
  if (!was.ok || !next.ok) return;
  assert.deepEqual(changedFields(next.fields, was.fields), { description: "New words." });
});
