"use client";

import { ScanHub } from "@/components/creator1/scan-hub";
import { CREATOR } from "@/lib/mock";
import "@/app/creator1.css";

/** Creator home (owner, 28 Oct 2026): the showcase scanner only. Today's ideas is under Publish, AI picks under Analytics. */
export default function CreatorHome() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>Good morning, {CREATOR.first}</h1>
        <p className="v2-muted" style={{ margin: "4px 0 0" }}>{CREATOR.activatedThisMonth} better rates active this month.</p>
      </div>
      <ScanHub />
    </div>
  );
}
