import { cookies } from "next/headers";
import { LANG_COOKIE, langOf, makeT, type Lang, type T } from "./lang.ts";
import { wordsFor } from "./translate.ts";

/** The language this device picked (English until the switch is used). */
export async function getLang(): Promise<Lang> {
  return langOf((await cookies()).get(LANG_COOKIE)?.value);
}

export const tFor = (lang: Lang): T => makeT(wordsFor(lang));
