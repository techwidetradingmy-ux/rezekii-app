"use client";

import { Title } from "@/components/ui";
import { NicheBest, ShootToday, ViewSwitch, useIdeasView } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";

/**
 * Today's ideas (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. Best sellers come first, and one
 * cards/list switch at the top sets both sections (owner, 29 Oct 2026).
 */
export default function PublishPlan() {
  const [view, setView] = useIdeasView();
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Today's Ideas" sub="Made this morning from your videos and sales">
        <ViewSwitch view={view} onChange={setView} />
      </Title>
      <NicheBest view={view} />
      <ShootToday bare view={view} />
    </div>
  );
}
