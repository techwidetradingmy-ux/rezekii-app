import { Fragment, type ReactNode } from "react";

/**
 * A translated line with its {slots} filled by markup, like a bold name or number (owner, 3 Nov 2026: every line is written
 * whole in each language, so a bold part can't be glued between two translated pieces). Pass the line translated but not
 * filled in, so its {slots} are still there.
 */
export function rich(line: string, slots: Record<string, ReactNode>): ReactNode {
  return line.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? <Fragment key={i}>{part in slots ? slots[part] : `{${part}}`}</Fragment> : part));
}
