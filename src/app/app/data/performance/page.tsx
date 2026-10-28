"use client";

import { useEffect, useState } from "react";
import { Seg, Title } from "@/components/ui";
import { VideoList } from "@/components/creator2/perf-videos";
import { ProductList } from "@/components/creator2/perf-products";
import { LiveList } from "@/components/creator2/perf-lives";
import "@/app/creator1.css";

type View = "By video" | "By LIVE" | "By product";
const HASH: Record<string, View> = { "#product": "By product", "#live": "By LIVE" };

/** Performance: what each video, LIVE and product earned. AI Picks has its own page (owner, 28 Oct 2026). */
export default function DataPerformance() {
  const [by, setBy] = useState<View>("By video");
  useEffect(() => {
    // Old links to the AI picks tab go to the AI Picks page now.
    if (window.location.hash === "#ai") return window.location.replace("/app/data/ai-picks");
    const v = HASH[window.location.hash];
    if (v) setBy(v);
  }, []);
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Performance" sub="Last 30 days · updated today 09:12">
        <Seg value={by} options={["By video", "By LIVE", "By product"] as const} onChange={setBy} />
      </Title>
      {by === "By video" && <VideoList />}
      {by === "By LIVE" && <LiveList />}
      {by === "By product" && <ProductList />}
    </div>
  );
}
