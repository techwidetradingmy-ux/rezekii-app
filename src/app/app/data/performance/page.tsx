"use client";

import { useEffect, useState } from "react";
import { Seg, Title } from "@/components/ui";
import { VideoList } from "@/components/creator2/perf-videos";
import { ProductList } from "@/components/creator2/perf-products";

/** Performance (owner, 28 Oct 2026): the old Videos and Products pages in one, switched by video or by product. */
export default function DataPerformance() {
  const [by, setBy] = useState<"By video" | "By product">("By video");
  useEffect(() => {
    if (window.location.hash === "#product") setBy("By product");
  }, []);
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Performance" sub="What each video and product sold and earned in the last 30 days · updated today 09:12">
        <Seg value={by} options={["By video", "By product"] as const} onChange={setBy} />
      </Title>
      {by === "By video" ? <VideoList /> : <ProductList />}
    </div>
  );
}
