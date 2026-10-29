import { AiMark, AiTag } from "@/components/ui";

/** Hero badge on both landing pages (owner, 29 Oct 2026): Rezekii introduces itself as an AI-powered affiliate platform. */
export function AiEyebrow({ text = "AI-Powered Affiliate Platform · Malaysia" }: { text?: string }) {
  return (
    <span className="lp-eyebrow">
      <AiMark size={22} />
      <AiTag label="Rezekii AI" bare />
      <span>{text}</span>
    </span>
  );
}
