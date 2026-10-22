"use client";

import { createContext, useContext, useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LANG_COOKIE, makeT, type Lang, type T, type Words } from "./lang.ts";

const LangContext = createContext<{ lang: Lang; words: Words | null }>({ lang: "en", words: null });

/**
 * Gives the signed-in pages the language picked on this device (set by the app layout from the cookie). `words` is the
 * Chinese word list, sent only when the page is in Chinese, so English pages don't download it.
 */
export function LangProvider({ lang, words, children }: { lang: Lang; words: Words | null; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
  }, [lang]);
  const value = useMemo(() => ({ lang, words }), [lang, words]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;

export function useT(): T {
  const { words } = useContext(LangContext);
  return useMemo(() => makeT(words), [words]);
}

/** EN | 中文 in the top bar: saves the choice on this device for a year and reloads the page's text. */
export function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const pick = (next: Lang) => {
    if (next === lang || pending) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // The Chinese copies' own addresses (/zh, /zh/signin) are Chinese whatever the cookie says: English is at the plain address.
    if (next === "en" && /^\/zh(\/|$)/.test(path)) router.replace(path.replace(/^\/zh/, "") || "/");
    else start(() => router.refresh());
  };
  return (
    <div className={`lang-switch${pending ? " busy" : ""}`} role="group" aria-label="Language / 语言">
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => pick("en")}>
        EN
      </button>
      <button type="button" lang="zh-Hans" aria-pressed={lang === "zh"} onClick={() => pick("zh")}>
        中文
      </button>
    </div>
  );
}
