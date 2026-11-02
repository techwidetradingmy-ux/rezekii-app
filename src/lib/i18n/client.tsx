"use client";

import { createContext, useContext, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE, htmlLang, makeT, type Lang, type T, type Words } from "./lang.ts";

const LangContext = createContext<{ lang: Lang; words: Words | null }>({ lang: "en", words: null });

/**
 * Gives every page the language picked on this device (set by the root layout from the cookie). `words` is that language's
 * word list, sent only when the page isn't in English, so English pages don't download it.
 */
export function LangProvider({ lang, words, children }: { lang: Lang; words: Words | null; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
  }, [lang]);
  const value = useMemo(() => ({ lang, words }), [lang, words]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;

export function useT(): T {
  const { words } = useContext(LangContext);
  return useMemo(() => makeT(words), [words]);
}

/** Picks a language: saved on this device for a year, and the page's text reloads in it (owner, 3 Nov 2026). */
export function useSetLang(): [(next: Lang) => void, boolean] {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (next: Lang) => {
    if (next === lang || pending) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return [pick, pending];
}

/** English | Bahasa Melayu | 中文, each written in its own language. */
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const [pick, pending] = useSetLang();
  return (
    <div className={`lang-switch${pending ? " busy" : ""}`} role="group" aria-label="Language / Bahasa / 语言">
      {LANGS.map(([k, label]) => (
        <button key={k} type="button" lang={htmlLang(k)} aria-pressed={lang === k} onClick={() => pick(k)}>
          {compact ? (k === "en" ? "EN" : k === "ms" ? "BM" : "中文") : label}
        </button>
      ))}
    </div>
  );
}
