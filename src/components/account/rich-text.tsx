import { Fragment } from "react";

/**
 * A translated line with React parts (a bold name, a link, a highlighted word) put in at its {placeholders}, so the whole
 * sentence stays one line in the word lists instead of pieces glued together. Placeholders without a part stay as written.
 */
export function rich(line: string, parts: Record<string, React.ReactNode>) {
  return line.split(/(\{\w+\})/).map((s, i) => {
    const k = /^\{(\w+)\}$/.exec(s)?.[1];
    return <Fragment key={i}>{k !== undefined && k in parts ? parts[k] : s}</Fragment>;
  });
}
