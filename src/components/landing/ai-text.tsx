"use client";

import { Fragment, useMemo } from "react";
import { AiTag } from "@/components/ui";
import { tx } from "@/lib/i18n/lang";
import { useT } from "@/lib/i18n/client";

/** AI names that get the AI look wherever a landing line mentions them (owner, 29 Oct 2026). Longest first. */
const AI_TERMS = [tx("AI Viral Product Sourcing"), "Rezekii AI", tx("AI Picks"), tx("AI Video")];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wherever a landing line names Rezekii's AI, the name shows in the AI colours with its sparkle. The line comes in already
 * translated, so the names are looked for in her language too (owner, 3 Nov 2026).
 */
export function AiText({ text }: { text: string }) {
  const t = useT();
  const [terms, split] = useMemo(() => {
    const list = [...new Set(AI_TERMS.map((x) => t(x)))].sort((a, b) => b.length - a.length);
    return [list, new RegExp(`(${list.map(esc).join("|")})`)] as const;
  }, [t]);
  return (
    <>
      {text.split(split).map((part, i) => (
        <Fragment key={i}>{terms.includes(part) ? <AiTag label={part} inline /> : part}</Fragment>
      ))}
    </>
  );
}
