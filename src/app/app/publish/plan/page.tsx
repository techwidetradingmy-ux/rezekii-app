"use client";

import { AiHead, Seg, Tip, Title } from "@/components/ui";
import { NicheBest, ViewSwitch, useIdeasView } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";

type Tab = "Marketplace" | "Showcase";

/**
 * Today's ideas (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. One card with two tabs named after where
 * the products come from (owner, 29 Oct 2026): Marketplace and Showcase, both best-selling first. One cards/list switch for both.
 */
export default function PublishPlan() {
  const [view, setView] = useIdeasView();
  const [tab, setTab] = useKept<Tab>("ideas-tab", "Marketplace");
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Today's Ideas" sub="Made this morning from your videos and sales">
        <ViewSwitch view={view} onChange={setView} />
      </Title>
      <section className="v2-card v2-aicard td-one">
        <AiHead title="Best Sellers for You" sub="Best-selling first, updated daily" tip={<Tip label="How these lists are made" text="Marketplace: TikTok Shop products in your top categories that aren't in your showcase yet, rated 4★ and up. Showcase: products already in your showcase. Both are ranked by units sold this week; the line shows sales for each of the last 7 days." />} />
        <Seg value={tab} options={["Marketplace", "Showcase"] as const} onChange={setTab} />
        <NicheBest key={tab} view={view} inFrame source={tab === "Showcase" ? "showcase" : "market"} />
      </section>
    </div>
  );
}
