/**
 * Hero line above the headline on both landing pages (owner, 29 Oct 2026): just the words, no icon or chip, which read as extra.
 */
export function AiEyebrow({ text = "AI-Powered Affiliate Platform · Malaysia" }: { text?: string }) {
  return <span className="lp-eyebrow">{text}</span>;
}
