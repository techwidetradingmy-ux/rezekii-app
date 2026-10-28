"use client";

import { useEffect, useState } from "react";
import { Flow, Seg, Title } from "@/components/ui";
import { VideoList } from "@/components/creator2/perf-videos";
import { ProductList } from "@/components/creator2/perf-products";
import { AiPicks } from "@/components/creator1/ai-picks";
import "@/app/creator1.css";

type View = "By video" | "By product" | "AI picks";
const HASH: Record<string, View> = { "#product": "By product", "#ai": "AI picks" };

/** Performance (owner, 28 Oct 2026): what each video and product earned, and AI picks to grow with, in one place. */
export default function DataPerformance() {
  const [by, setBy] = useState<View>("By video");
  useEffect(() => {
    const v = HASH[window.location.hash];
    if (v) setBy(v);
  }, []);
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Performance" sub="Last 30 days · updated today 09:12">
        <Seg value={by} options={["By video", "By product", "AI picks"] as const} onChange={setBy} />
      </Title>
      {by === "By video" && <VideoList />}
      {by === "By product" && <ProductList />}
      {by === "AI picks" && (
        <>
          <section className="v2-card tight sh-howcard">
            <span className="sh-howlbl">How AI picks work</span>
            <Flow
              label="How AI picks work"
              steps={[
                { icon: "chart", title: "Your sales" },
                { icon: "flame", title: "Top sellers" },
                { icon: "tag", title: "Rezekii campaigns" },
                { icon: "video", title: "Video or LIVE" },
              ]}
            />
          </section>
          <AiPicks />
        </>
      )}
    </div>
  );
}
