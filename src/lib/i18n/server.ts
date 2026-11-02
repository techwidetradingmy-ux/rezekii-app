import { cookies } from "next/headers";
import { LANG_COOKIE, langOf, makeT, type Lang, type T } from "./lang.ts";
import { wordsFor } from "./translate.ts";

/** The language this device picked (English until it's changed). */
export async function getLang(): Promise<Lang> {
  return langOf((await cookies()).get(LANG_COOKIE)?.value);
}

/** The translator for server code (API messages, notifications, the Daily Story). */
export const tFor = (lang: Lang): T => makeT(wordsFor(lang));
