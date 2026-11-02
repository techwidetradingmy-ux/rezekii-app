"use client";

import { Title } from "@/components/ui";
import { AiPicks } from "@/components/creator1/ai-picks";
import { useT } from "@/lib/i18n/client";
import "@/app/creator1.css";

/** AI Picks (owner, 28 Oct 2026): its own page in Analytics, not a tab inside Performance. */
export default function DataAiPicks() {
  const t = useT();
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title ai title={t("AI Picks")} sub={t("Your account analysed from the last 30 days: what sells for you, video or LIVE, when your buyers order, which products earn most per post, and the products on TikTok Shop that fit you best.")} />
      <AiPicks />
    </div>
  );
}
