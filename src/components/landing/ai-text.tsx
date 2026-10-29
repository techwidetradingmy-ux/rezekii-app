import { Fragment } from "react";
import { AiTag } from "@/components/ui";

/** AI names that get the AI look wherever a landing line mentions them (owner, 29 Oct 2026). Longest first. */
const AI_TERMS = ["AI Viral Product Sourcing", "Rezekii AI", "AI Picks", "AI Video"];
const SPLIT = new RegExp(`(${AI_TERMS.join("|")})`);

/** Wherever a landing line names Rezekii's AI, the name shows in the AI colours with its sparkle. */
export function AiText({ text }: { text: string }) {
  return (
    <>
      {text.split(SPLIT).map((part, i) => (
        <Fragment key={i}>{AI_TERMS.includes(part) ? <AiTag label={part} inline /> : part}</Fragment>
      ))}
    </>
  );
}
