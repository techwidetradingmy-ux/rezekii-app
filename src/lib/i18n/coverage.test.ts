import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { ACCOUNT_TABS } from "../account-tabs.ts";
import { MENUS } from "../menus.ts";
import { MS, MS_PARTS } from "./ms.ts";
import { translate } from "./translate.ts";
import { ZH, ZH_PARTS } from "./zh.ts";

const src = new URL("../../", import.meta.url);

/**
 * Rezekii 2.0 in English, Malay and Chinese (owner, 3 Nov 2026): every screen creators and sellers see. Admin stays English, so
 * its pages and components aren't read. Run with `npm run test:i18n`.
 */
/** I18N_ONLY=<regex> checks only the files it matches (paths like "app/app/market/page.tsx"), e.g. while one area is done. */
const ONLY = process.env.I18N_ONLY ? new RegExp(process.env.I18N_ONLY) : null;
const SKIP = /(^|\/)(app\/admin|components\/admin|lib\/i18n)(\/|$)|\.test\.ts$/;
const FILES = ["app", "components", "lib", "modules"].flatMap((dir) =>
  (readdirSync(new URL(`${dir}/`, src), { recursive: true }) as string[])
    .map((f) => `${dir}/${f.replaceAll("\\", "/")}`)
    .filter((f) => /\.tsx?$/.test(f) && !SKIP.test(f) && (!ONLY || ONLY.test(f))),
);

/** Every English text written as t("…"), tx("…") or translate(lang, "…") in a file, in double or single quotes. */
function keysIn(file: string): string[] {
  const text = readFileSync(new URL(file, src), "utf8");
  const out: string[] = [];
  for (const m of text.matchAll(/\b(?:t\(|tx\(|translate\(\s*\w+\s*,)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g))
    out.push(m[1] !== undefined ? JSON.parse(`"${m[1]}"`) : m[2].replace(/\\(.)/g, "$1"));
  return out;
}

/** Words that come from shared lists rather than t("…") calls: the creator and seller menus and My Account's sections. */
const LISTS = [
  ...[...MENUS.creator, ...MENUS.seller].flatMap((s) => [s.label, ...s.pages.map(([, l]) => l)]),
  ...ACCOUNT_TABS.map(([, l]) => l),
  "Market", "Bronze", "Silver", "Gold", "Light", "Dark", "Auto",
];
const KEYS = new Set([...FILES.flatMap(keysIn), ...(ONLY ? [] : LISTS)]);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

for (const [name, words, parts] of [["Malay", MS, MS_PARTS], ["Chinese", ZH, ZH_PARTS]] as const) {
  test(`i18n: every English line has a ${name} version`, () => {
    assert.ok(ONLY || KEYS.size > 100, `only ${KEYS.size} lines found: is the scanner reading the files?`);
    const missing = [...KEYS].filter((k) => !(k in words));
    assert.deepEqual(missing, [], `no ${name} yet for:\n${missing.join("\n")}`);
  });

  test(`i18n: each ${name} line keeps the same {placeholders} and isn't empty`, () => {
    const wrong = Object.entries(words).filter(([en, w]) => !w.trim() || placeholders(en) !== placeholders(w)).map(([en]) => en);
    assert.deepEqual(wrong, []);
  });

  test(`i18n: each English line is in one ${name} word list only, so it can't get two different versions`, () => {
    const seen = new Map<string, string>();
    const twice: string[] = [];
    for (const [part, list] of Object.entries(parts))
      for (const en of Object.keys(list)) {
        if (seen.has(en)) twice.push(`${en} (${seen.get(en)} and ${part})`);
        else seen.set(en, part);
      }
    assert.deepEqual(twice, []);
  });
}

test("i18n: English stays as written; Malay and Chinese are looked up and filled in; anything unknown stays English", () => {
  assert.equal(translate("en", "Marketplace"), "Marketplace");
  assert.equal(translate("ms", "Marketplace"), "Pasaran");
  assert.equal(translate("zh", "Marketplace"), "选品广场");
  assert.equal(translate("ms", "{n}-day streak", { n: 5 }), "Streak 5 hari");
  assert.equal(translate("zh", "Not a word we know"), "Not a word we know");
});
