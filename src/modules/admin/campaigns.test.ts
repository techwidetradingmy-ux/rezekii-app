import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignFields, toDay, type CampaignForm } from "./campaigns.ts";

const form = (o: Partial<CampaignForm> = {}): CampaignForm => ({
  name: "Wellness Year-End Push", description: "Health and beauty.", regEnd: "2026-11-15", start: "2026-11-01", end: "2026-12-31",
  commission: 18, local: true, crossBorder: false, shopCodes: [], whatsapp: "+60123456789", email: "partners@techwide.my", phone: "", ...o,
});

test("campaignFields turns the form into TikTok's fields (Malaysia days, 0.01% units)", () => {
  const r = campaignFields(form());
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
  const no = (o: Partial<CampaignForm>) => { const r = campaignFields(form(o)); return r.ok ? "" : r.error; };
  assert.match(no({ name: "x".repeat(50) }), /under 50/);
  assert.match(no({ commission: 1 }), /more than 1%/);
  assert.match(no({ commission: 80 }), /less than 80%/);
  assert.match(no({ start: "2026-12-31", end: "2026-11-01" }), /start before it ends/);
  assert.match(no({ start: "2026-01-01", end: "2026-12-31" }), /360 days/);
  assert.match(no({ local: false }), /which shops/);
  assert.match(no({ whatsapp: " " }), /WhatsApp/);
  assert.match(no({ whatsapp: "12ab" }), /WhatsApp number doesn't look right/);
  assert.match(no({ description: "  " }), /needs a description/);
  assert.match(no({ description: "x".repeat(1001) }), /at most 1,000/);
  assert.ok(campaignFields(form({ description: "x".repeat(1000) })).ok);
  assert.match(no({ regEnd: "2027-01-05" }), /close between/);
  assert.match(no({ regEnd: "2026-10-30" }), /close between/);
  assert.ok(campaignFields(form({ local: false, shopCodes: [" mylcabc123 "] })).ok);
});

test("e164: Malaysian numbers typed any usual way go to TikTok as +60…", async () => {
  const { e164 } = await import("./campaigns.ts");
  assert.deepEqual(["60124979020", "0124979020", "012-497 9020", "+60 12-497 9020", "0060124979020", "124979020"].map(e164), Array(6).fill("+60124979020"));
  assert.equal(e164("+65 9123 4567"), "+6591234567");
  assert.equal(e164("12ab"), null);
  assert.equal(e164("012"), null);
  const r = campaignFields(form({ whatsapp: "012-497 9020", phone: "03-1234 5678" }));
  assert.ok(r.ok && r.fields.contact_info.whatsapp === "+60124979020" && r.fields.contact_info.phone === "+60312345678");
});
