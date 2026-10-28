"use client";

import { AiPicks } from "@/components/creator1/ai-picks";
import { Flow, Title } from "@/components/ui";
import "@/app/creator1.css";

/** AI picks on their own page: how the AI picks first, then the picks. */
export default function AiPicksPage() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="AI picks" sub="What to sell next, matched to your account" />
      <section className="v2-card tight sh-howcard">
        <span className="sh-howlbl">How AI picks work</span>
        <Flow
          label="How AI picks work"
          steps={[
            { icon: "chart", title: "Reads your sales", note: "Last 30 days, your categories" },
            { icon: "flame", title: "Checks TikTok's best-sellers", note: "Malaysia, this week" },
            { icon: "tag", title: "Matches Techwide campaigns", note: "Better rates, free samples" },
            { icon: "video", title: "Splits video and LIVE", note: "By buy rate" },
          ]}
        />
      </section>
      <AiPicks />
    </div>
  );
}
