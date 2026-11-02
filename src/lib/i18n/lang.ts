/**
 * Rezekii in English, Malay or Chinese (Simplified) (owner, 3 Nov 2026: in that order, English by default), picked in Settings or
 * the menu and kept in a cookie on that device. Every line of text is written in English and looked up in that language's word
 * list; anything missing stays English. A word list is only sent to the browser when the page is in that language.
 */
export type Lang = "en" | "ms" | "zh";
/** The choices, in the order shown, each in its own language. */
export const LANGS: [Lang, string][] = [["en", "English"], ["ms", "Bahasa Melayu"], ["zh", "中文"]];
export type Vars = Record<string, string | number>;
export type T = (en: string, vars?: Vars) => string;
export type Words = Record<string, string>;

export const LANG_COOKIE = "rz_lang";
export const langOf = (value?: string | null): Lang => (value === "zh" || value === "ms" ? value : "en");

/** `text` with {name} filled in from `vars`. */
export const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

/** The translator for a word list: that language when `words` is given, English (as written) when it's null. */
export const makeT = (words: Words | null): T => (en, vars) => fill(words?.[en] ?? en, vars);

/** Marks English text that is translated later, where it's shown (so the word-list test finds it). */
export const tx = (en: string) => en;

/** Dates in the reader's language: "17 Sep" in English, "17 Sep" in Malay, "9月17日" in Chinese. */
export const dateLocale = (lang: Lang) => (lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en-GB");
/** The page's own language tag. */
export const htmlLang = (lang: Lang) => (lang === "zh" ? "zh-Hans" : lang === "ms" ? "ms" : "en");
