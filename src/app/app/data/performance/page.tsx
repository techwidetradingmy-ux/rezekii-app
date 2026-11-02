"use client";

import { useEffect, useState } from "react";
import { Updated } from "@/components/data-note";
import { spanOf, useLivePerf } from "@/lib/live-perf";
import { Seg, Title } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { CalendarPicker, between, dayName } from "@/components/calendar-picker";
import { VideoList } from "@/components/creator2/perf-videos";
import { ProductList } from "@/components/creator2/perf-products";
import { LiveList } from "@/components/creator2/perf-lives";
import { loadAnalytics } from "@/lib/live";
import { useSharedRange } from "@/lib/range";
import { RANGES, type RangeKey } from "@/lib/mock-creator2";
import "@/app/creator1.css";

type View = "By Video" | "By LIVE" | "By Product";
const HASH: Record<string, View> = { "#product": "By Product", "#live": "By LIVE" };
const PRESETS: [string, string][] = RANGES.map((r) => [r, r === "Lifetime" ? "Lifetime" : `Last ${r}`]);
const DAYS: Record<RangeKey, number> = { "3 days": 3, "7 days": 7, "14 days": 14, "30 days": 30, "90 days": 90, Lifetime: 9999 };

/**
 * Performance: what each video, LIVE and product earned. AI Picks has its own page (owner, 28 Oct 2026). The calendar picks any
 * days (owner, 1 Nov 2026), the same ones Analytics shows, and the lists load again for them.
 */
export default function DataPerformance() {
  const [by, setBy] = useState<View>("By Video");
  const { live } = useDemo();
  const perf = useLivePerf(true);
  const [range, setRange] = useSharedRange();
  const [from, to] = spanOf(range);
  // Her first order bounds the calendar, as on Analytics.
  const [first, setFirst] = useState<string | null>(null);
  useEffect(() => {
    if (live) loadAnalytics().then((a) => setFirst(a?.first ? new Date(Date.parse(a.first) + 8 * 3_600_000).toISOString().slice(0, 10) : null));
  }, [live]);
  useEffect(() => {
    // Old links to the AI picks tab go to the AI Picks page now.
    if (window.location.hash === "#ai") return window.location.replace("/app/data/ai-picks");
    const v = HASH[window.location.hash];
    if (v) setBy(v);
  }, []);
  const today = to;
  const label = range.custom ? `${dayName(from)} – ${dayName(to)}` : PRESETS.find(([k]) => k === range.preset)![1];
  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Performance" sub={live ? `${label}, from your TikTok Shop orders` : `${label} · updated today 09:12`}>
        <CalendarPicker
          compact
          label={label}
          sub={`${dayName(from)} – ${dayName(to)} · ${between(from, to)} days`}
          today={range.custom ? new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10) : today}
          first={first ?? "2024-01-01"}
          from={from}
          to={to}
          onRange={(a, b) => {
            const n = between(a, b);
            setRange({ preset: RANGES.reduce((best, r) => (Math.abs(DAYS[r] - n) < Math.abs(DAYS[best] - n) ? r : best), RANGES[0]), custom: [a, b] });
          }}
          presets={PRESETS}
          preset={range.custom ? null : range.preset}
          onPreset={(k) => setRange({ preset: k as RangeKey, custom: null })}
        />
      </Title>
      <Seg value={by} options={["By Video", "By LIVE", "By Product"] as const} onChange={setBy} />
      {live && <Updated at={perf && typeof perf === "object" ? perf.updated : null} />}
      {by === "By Video" && <VideoList />}
      {by === "By LIVE" && <LiveList />}
      {by === "By Product" && <ProductList />}
    </div>
  );
}
