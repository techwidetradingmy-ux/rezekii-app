import { fill, type Lang, type Vars, type Words } from "./lang.ts";
import { ZH } from "./zh.ts";

/** The word list a page in `lang` needs: the Chinese list, or none for English. Server only (keeps it out of English pages). */
export const wordsFor = (lang: Lang): Words | null => (lang === "zh" ? ZH : null);

/** The text in `lang`, with {name} filled in from `vars` (for server code). */
export const translate = (lang: Lang, en: string, vars?: Vars): string => fill(wordsFor(lang)?.[en] ?? en, vars);
