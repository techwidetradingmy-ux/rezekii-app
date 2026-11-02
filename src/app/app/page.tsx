"use client";

import { useEffect, useState } from "react";
import { useWho } from "@/components/demo";
import { ScanHub } from "@/components/creator1/scan-hub";
import { CoverageCard } from "@/components/creator1/showcase-coverage";
import { useT } from "@/lib/i18n/client";
import "@/app/creator1.css";

/** Creator home (owner, 28 Oct 2026): the showcase scanner only. Today's ideas is under Publish, AI picks under Analytics. */
export default function CreatorHome() {
  const t = useT();
  const you = useWho();
  // By the time of day on her phone (owner, 31 Oct 2026), not always morning.
  const [hi, setHi] = useState<"morning" | "afternoon" | "evening">("morning");
  useEffect(() => { const h = new Date().getHours(); setHi(h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"); }, []);
  const name = you.first;
  return (
    <div className="v2-stack v2-in home-desk" style={{ gap: 22 }}>
      <div className="home-hi">
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>
          {hi === "morning" ? t("Good morning, {name}", { name }) : hi === "afternoon" ? t("Good afternoon, {name}", { name }) : t("Good evening, {name}", { name })}
        </h1>
      </div>
      <ScanHub />
      <CoverageCard />
    </div>
  );
}
