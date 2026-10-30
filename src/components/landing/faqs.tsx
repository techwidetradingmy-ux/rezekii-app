"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

/** Answers that mention our policies link to them (owner, 30 Oct 2026). */
const LINKS: Record<string, string> = { "Privacy Policy": "https://rezekii.com/privacy", "Terms of Service": "https://rezekii.com/terms" };
const linkify = (a: string) => a.split(/(Privacy Policy|Terms of Service)/).map((part, i) => (LINKS[part] ? <a key={i} href={LINKS[part]} target="_blank" rel="noreferrer">{part}</a> : part));

/** FAQ on the landing pages (owner, 29 Oct 2026: short page): the first few questions, the rest behind More Questions. */
export function Faqs({ items, show = 4 }: { items: [string, string][]; show?: number }) {
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, show);
  return (
    <div className="hm-faqs lp-faqs">
      {list.map(([q, a]) => (
        <details key={q} className="hm-faq">
          <summary>{q}<Icon name="plus" size={20} /></summary>
          <p>{linkify(a)}</p>
        </details>
      ))}
      {items.length > show && (
        <button type="button" className="lp-ghost lp-more" aria-expanded={all} onClick={() => setAll((x) => !x)}>
          {all ? "Show Fewer Questions" : `Show ${items.length - show} More Questions`}
          <Icon name="arrow" size={16} width={2.4} />
        </button>
      )}
    </div>
  );
}
