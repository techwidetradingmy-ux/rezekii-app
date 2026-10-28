"use client";

import { Title } from "@/components/ui";
import { AiPicks } from "@/components/creator1/ai-picks";
import "@/app/creator1.css";

/** AI Picks (owner, 28 Oct 2026): its own page in Analytics, not a tab inside Performance. */
export default function DataAiPicks() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="AI Picks" sub="Products picked from your sales, top sellers and Rezekii campaigns, with what to film." />
      <AiPicks />
    </div>
  );
}
