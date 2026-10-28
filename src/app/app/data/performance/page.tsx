"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { AiMark, Seg, Title } from "@/components/ui";
import { AI_PICKS, product } from "@/lib/mock";
import "@/app/creator1.css";
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
      <Link href="/app/data/ai-picks" className="v2-aicard ai-teaser">
        <AiMark size={44} />
        <span>
          <span className="v2-ailabel">Grow from here · AI picks</span>
          <b>{AI_PICKS.length} products matched to your sales</b>
          <small>{AI_PICKS.filter((p) => p.fit === "video").length} best for video · {AI_PICKS.filter((p) => p.fit === "live").length} best for LIVE · add them to your showcase</small>
        </span>
        <span className="sh-thumbs" aria-hidden="true">
          {AI_PICKS.slice(0, 4).map((pk) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={pk.productId} src={product(pk.productId).img} alt="" />
          ))}
        </span>
        <Icon name="arrow" size={18} />
      </Link>
      {by === "By video" ? <VideoList /> : <ProductList />}
    </div>
  );
}
