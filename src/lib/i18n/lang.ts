/**
 * Rezekii in English or Chinese (Simplified), picked with the EN | 中文 switch and kept in a cookie on that device.
 * Every line of text is written in English and looked up in the Chinese word list; anything missing stays English.
 * The word list itself is only sent to the browser when the page is in Chinese (see translate.ts and LangProvider).
 */
export type Lang = "en" | "zh";
export type Vars = Record<string, string | number>;
export type T = (en: string, vars?: Vars) => string;
export type Words = Record<string, string>;

export const LANG_COOKIE = "rz_lang";
export const langOf = (value?: string | null): Lang => (value === "zh" ? "zh" : "en");

/** `text` with {name} filled in from `vars`. */
export const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

/** The translator for a word list: Chinese when `words` is given, English (as written) when it's null. */
export const makeT = (words: Words | null): T => (en, vars) => fill(words?.[en] ?? en, vars);

/** Marks English text that is translated later, where it's shown (so the word-list test finds it). */
export const tx = (en: string) => en;

/** Dates in the reader's language: "17 Sep" in English, "9月17日" in Chinese. */
export const dateLocale = (lang: Lang) => (lang === "zh" ? "zh-CN" : "en-GB");
