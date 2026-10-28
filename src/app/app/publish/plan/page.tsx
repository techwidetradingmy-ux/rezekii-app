"use client";

import { Title } from "@/components/ui";
import { ShootToday } from "@/components/creator1/shoot-today";
import "@/app/creator1.css";

/** What to film (owner, 28 Oct 2026): today's plan sits under Publish, next to New post. */
export default function PublishPlan() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="What to film today" sub="Worked out this morning from your videos, sales, ratings and the marketplace" />
      <ShootToday bare />
    </div>
  );
}
