"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

/** Answers that mention our policies link to them (owner, 30 Oct 2026), by the policy's name in her language. */
const POLICIES: [string, string][] = [[tx("Privacy Policy"), "https://rezekii.com/privacy"], [tx("Terms of Service"), "https://rezekii.com/terms"]];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * FAQ on the landing pages (owner, 29 Oct 2026: short page): the first few questions, the rest behind More Questions.
 * Questions and answers come in already translated.
 */
export function Faqs({ items, show = 4 }: { items: [string, string][]; show?: number }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const list = all ? items : items.slice(0, show);
  const links = new Map(POLICIES.map(([name, href]) => [t(name), href]));
  const split = new RegExp(`(${[...links.keys()].map(esc).join("|")})`);
  const linkify = (a: string) => a.split(split).map((part, i) => (links.has(part) ? <a key={i} href={links.get(part)} target="_blank" rel="noreferrer">{part}</a> : part));
  const more = items.length - show;
  return (
    <div className="hm-faqs lp-faqs">
      {list.map(([q, a]) => (
        <details key={q} className="hm-faq">
          <summary>{q}<Icon name="plus" size={20} /></summary>
          <p>{linkify(a)}</p>
        </details>
      ))}
      {more > 0 && (
        <button type="button" className="lp-ghost lp-more" aria-expanded={all} onClick={() => setAll((x) => !x)}>
          {all ? t("Show Fewer Questions") : more === 1 ? t("Show {n} More Question", { n: more }) : t("Show {n} More Questions", { n: more })}
          <Icon name="arrow" size={16} width={2.4} />
        </button>
      )}
    </div>
  );
}
