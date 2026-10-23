import { cookies } from "next/headers";
import { currentUser } from "@/app/current-user";
import { adminView } from "@/app/view";
import { LANG_COOKIE, langOf, makeT, type Lang, type T } from "./lang.ts";
import { wordsFor } from "./translate.ts";

/** The language this device picked (English until the switch is used). The admin dashboard is English: it isn't translated. */
export async function getLang(): Promise<Lang> {
  const lang = langOf((await cookies()).get(LANG_COOKIE)?.value);
  return lang === "zh" && (await adminView(await currentUser())) ? "en" : lang;
}

export const tFor = (lang: Lang): T => makeT(wordsFor(lang));
