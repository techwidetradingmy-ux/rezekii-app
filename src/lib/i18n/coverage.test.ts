import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CREATOR_ACCOUNT, CREATOR_MENU } from "../../app/menus.ts";
import { MK_SORTS } from "../../modules/tap/sorts.ts";
import { rowLook, SAMPLE_LOOK, SAMPLE_STEPS, statusLook } from "../../modules/tap/stages.ts";
import { translate } from "./translate.ts";
import { ZH, ZH_PARTS } from "./zh.ts";

/** The pages and parts that switch to Chinese (Part 1, approved 22 Oct 2026). */
const FILES = [
  "app/site.tsx", "app/menu-links.tsx", "app/bottom-nav.tsx",
  "app/app/marketplace/page.tsx", "app/app/marketplace/marketplace-view.tsx", "app/app/marketplace/product-view.tsx", "app/app/marketplace/use-tap-actions.tsx", "app/app/marketplace/[id]/page.tsx",
  "app/app/my-tap/page.tsx", "app/app/my-tap/my-tap-view.tsx",
  "app/app/links/page.tsx", "app/app/links/links-view.tsx",
  "app/app/lookup/page.tsx", "app/app/lookup/lookup-view.tsx",
  "app/app/sales/page.tsx", "app/app/sales/sales-view.tsx",
  "app/app/accounts/page.tsx", "app/app/accounts/accounts-view.tsx", "app/app/accounts/sign-in-security.tsx",
  "app/app/calendar-picker.tsx", "app/app/product-card.tsx", "app/app/gmv-chart.tsx",
  "modules/sales/frames.ts", "modules/accounts/manage.ts",
];
const src = new URL("../../", import.meta.url);

/** Every English text written as t("…"), tx("…") or translate(lang, "…") in a file. */
function keysIn(file: string): string[] {
  const text = readFileSync(new URL(file, src), "utf8");
  const out: string[] = [];
  for (const m of text.matchAll(/\b(?:t\(|tx\(|translate\(\s*\w+\s*,)\s*"((?:[^"\\]|\\.)*)"/g)) out.push(JSON.parse(`"${m[1]}"`));
  return out;
}

/** Words that come from shared lists rather than t("…") calls. */
const LISTS = [
  ...CREATOR_MENU.flatMap((s) => [s.label, s.short, ...s.pages.map(([, l]) => l)]),
  CREATOR_ACCOUNT.label, ...CREATOR_ACCOUNT.pages.map(([, l]) => l),
  ...MK_SORTS.map(([, l]) => l),
  ...SAMPLE_STEPS, ...Object.values(SAMPLE_LOOK).map(([l]) => l),
  ...["PENDING", "AWAITING_SHIPMENT", "SHIPPED", "CONTENT_PENDING", "COMPLETED", "REJECTED", "OVERDUE_CANCELLED", "UNFULFILL_CANCELLED", "UNFULFILLABLE_CANCELLED", "SELLER_NOT_SHIP_CANCELLED", "WITHDRAW_CANCELLED"].map((s) => statusLook(s)[0]),
  rowLook({ stage: 1, request: { status: "requested", note: null, createdAt: "", updatedAt: "", tiktok: null } })[0],
  "hour", "day", "month",
];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("i18n: every English line on the Chinese pages has a Chinese version", () => {
  const keys = new Set([...FILES.flatMap(keysIn), ...LISTS]);
  assert.ok(keys.size > 300, `only ${keys.size} lines found: is the scanner reading the files?`);
  const missing = [...keys].filter((k) => !(k in ZH));
  assert.deepEqual(missing, [], `no Chinese yet for:\n${missing.join("\n")}`);
});

test("i18n: each Chinese line keeps the same {placeholders} and isn't empty", () => {
  const wrong = Object.entries(ZH).filter(([en, zh]) => !zh.trim() || placeholders(en) !== placeholders(zh)).map(([en]) => en);
  assert.deepEqual(wrong, []);
});

test("i18n: each English line is in one word list only, so it can't get two different translations", () => {
  const seen = new Map<string, string>();
  const twice: string[] = [];
  for (const [part, list] of Object.entries(ZH_PARTS))
    for (const en of Object.keys(list)) {
      if (seen.has(en)) twice.push(`${en} (${seen.get(en)} and ${part})`);
      else seen.set(en, part);
    }
  assert.deepEqual(twice, []);
});

test("i18n: English stays exactly as written; Chinese is looked up and filled in; anything unknown stays English", () => {
  assert.equal(translate("en", "Marketplace"), "Marketplace");
  assert.equal(translate("en", "{n} products", { n: 5 }), "5 products");
  assert.equal(translate("zh", "Marketplace"), "选品广场");
  assert.equal(translate("zh", "{n} products", { n: 5 }), "5 件商品");
  assert.equal(translate("zh", "Not a word we know"), "Not a word we know");
});
