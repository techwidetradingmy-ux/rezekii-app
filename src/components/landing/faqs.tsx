"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

/** FAQ on the landing pages (owner, 29 Oct 2026: short page): the first few questions, the rest behind More Questions. */
export function Faqs({ items, show = 4 }: { items: [string, string][]; show?: number }) {
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, show);
  return (
    <div className="hm-faqs lp-faqs">
      {list.map(([q, a]) => (
        <details key={q} className="hm-faq">
          <summary>{q}<Icon name="plus" size={20} /></summary>
          <p>{a}</p>
        </details>
      ))}
      {items.length > show && (
        <button type="button" className="lp-ghost lp-more" aria-expanded={all} onClick={() => setAll((x) => !x)}>
          {all ? "Fewer Questions" : `More Questions (${items.length - show})`}
        </button>
      )}
    </div>
  );
}
