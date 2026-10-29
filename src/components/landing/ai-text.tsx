import { Fragment } from "react";
import { AiTag } from "@/components/ui";

/** Wherever a landing line names Rezekii AI, the name shows as the AI chip with its sparkle (owner, 29 Oct 2026). */
export function AiText({ text }: { text: string }) {
  return (
    <>
      {text.split("Rezekii AI").map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <AiTag label="Rezekii AI" inline />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
