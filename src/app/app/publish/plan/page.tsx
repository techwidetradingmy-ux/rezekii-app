"use client";

import { Title } from "@/components/ui";
import { NicheBest, ShootToday } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";

/** Today's ideas (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. */
export default function PublishPlan() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Today's Ideas" sub="Made this morning from your videos and sales" />
      <ShootToday bare />
      <NicheBest />
    </div>
  );
}
