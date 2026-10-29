"use client";

import { Seg, Title } from "@/components/ui";
import { NicheBest, ShootToday, ViewSwitch, useIdeasView } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";
import { useKept } from "@/lib/keep";

type Tab = "Best Sellers" | "To Film Today";

/**
 * Today's ideas (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. One card with two tabs, Best Sellers
 * first (owner, 29 Oct 2026, option A), and one cards/list switch at the top for both.
 */
export default function PublishPlan() {
  const [view, setView] = useIdeasView();
  const [tab, setTab] = useKept<Tab>("ideas-tab", "Best Sellers");
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Today's Ideas" sub="Made this morning from your videos and sales">
        <ViewSwitch view={view} onChange={setView} />
      </Title>
      <section className="v2-card td-one">
        <Seg value={tab} options={["Best Sellers", "To Film Today"] as const} onChange={setTab} />
        {tab === "Best Sellers" ? <NicheBest view={view} inFrame /> : <ShootToday bare inFrame view={view} />}
      </section>
    </div>
  );
}
