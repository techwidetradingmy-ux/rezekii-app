import { Icon, type IconName } from "@/components/icons";

export type PathStep = { icon: IconName; title: string; line: string; soon?: boolean };

/**
 * Every steps list on the landing pages (owner, 29 Oct 2026: "all these process should be in this format"): one compact row
 * per step, a green icon node with its number, the title and one short line, joined by a line that fills in as the section
 * scrolls in (Reveal's cr1-shown).
 */
export function Path({ steps, label }: { steps: PathStep[]; label: string }) {
  return (
    <ol className="lp-path" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.title} className={s.soon ? "soon" : undefined}>
          <span className="lp-node"><Icon name={s.icon} size={22} width={2.1} /><b>{i + 1}</b></span>
          <span>
            <strong>{s.title}{s.soon && <span className="badge badge-amber">Coming Soon</span>}</strong>
            <small>{s.line}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
