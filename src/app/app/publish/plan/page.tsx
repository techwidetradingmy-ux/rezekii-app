"use client";

import { AiHead, Seg, Tip, Title } from "@/components/ui";
import { NicheBest, ViewSwitch, useIdeasView } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";
import { useDemo } from "@/components/demo";

type Tab = "Marketplace" | "Showcase";

/**
 * Today's ideas (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. One card with two tabs named after where
 * the products come from (owner, 29 Oct 2026): Marketplace and Showcase, both best-selling first. One cards/list switch for both.
 */
export default function PublishPlan() {
  const [view, setView] = useIdeasView();
  const [tab, setTab] = useKept<Tab>("ideas-tab", "Marketplace");
  const { live } = useDemo();
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title ai title="Today's Ideas" sub={live ? "What's selling most on TikTok Shop right now, ready for you to film today. Ride the wave while it's hot." : "Made this morning from your videos and sales"}>
        <ViewSwitch view={view} onChange={setView} />
      </Title>
      <section className="v2-card v2-aicard td-one">
        <AiHead title="Best Sellers for You" sub={live ? "Ranked by sales across TikTok · updates when TikTok publishes" : "Best-selling first, updated daily"} tip={<Tip label="How these lists are made" text={live ? "Marketplace: the products that sold the most (GMV) on TikTok Shop on the newest day TikTok has published, in every category, mixed with Rezekii campaign products. Only products you can add are shown, and none already in your showcase. Rezekii campaign products can also get a free sample. Showcase: products already in your showcase, ranked by their sales across the whole of TikTok, so you can film the ones selling now. 10 a day; Gold creators see 30." : "Marketplace: TikTok Shop products in your top categories that aren't in your showcase yet, rated 4★ and up. Showcase: products already in your showcase. Both are ranked by units sold this week; the line shows sales for each of the last 7 days."} />} />
        <Seg value={tab} options={["Marketplace", "Showcase"] as const} onChange={setTab} />
        <NicheBest key={tab} view={view} inFrame source={tab === "Showcase" ? "showcase" : "market"} />
      </section>
    </div>
  );
}
