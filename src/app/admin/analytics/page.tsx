"use client";

import "@/app/admin.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Columns, Seg, Title } from "@/components/ui";
import { Av, Chips, Funnel, Meta, Search } from "@/components/admin/bits";
import { DAYS14, EVENTS, FUNNEL, TIMELINES } from "@/lib/mock-admin";
import { rm } from "@/lib/mock";

type Range = "Last 7 days" | "Last 30 days" | "Last 90 days";
const SCALE: Record<Range, number> = { "Last 7 days": 0.24, "Last 30 days": 1, "Last 90 days": 2.7 };

/** Platform-wide analytics: funnels, events by day, and one person's activity timeline. Every chart says its range, time zone and source. */
export default function Analytics() {
  const { toast } = useDemo();
  const [range, setRange] = useState<Range>("Last 30 days");
  const [who, setWho] = useState<"Creators" | "Sellers">("Creators");
  const [ev, setEv] = useState("Sign-ups");
  const [q, setQ] = useState("@farah.home");
  const s = SCALE[range];
  const steps = FUNNEL[who].map(([l, v]) => [l, Math.round(v * s)] as [string, number]);
  const series = EVENTS[ev];
  const key = Object.keys(TIMELINES).find((k) => q.trim() && k.toLowerCase().includes(q.trim().toLowerCase()));
  const timeline = key ? TIMELINES[key] : null;

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Analytics" sub="Tracks actions on Rezekii only.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast(`Exported ${range.toLowerCase()} as CSV`)}><Icon name="doc" size={15} /> Export</button>
      </Title>

      <Seg value={range} options={["Last 7 days", "Last 30 days", "Last 90 days"] as const} onChange={setRange} />

      <div className="v2-grid4 ad-stats" key={range}>
        <div className="v2-stat"><small>Raises per week</small><b>{Math.round(330 * Math.min(1, s * 1.2 + 0.2))}</b><em className="up">Creators&apos; north star</em></div>
        <div className="v2-stat"><small>Collabs per week</small><b>{Math.round(28 * Math.min(1, s + 0.3))}</b><em className="up">Sellers&apos; north star</em></div>
        <div className="v2-stat"><small>Commission settled</small><b>{rm(Math.round(61840 * s), 0)}</b><em>Company north star</em></div>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Funnel</h2>
          <Seg value={who} options={["Creators", "Sellers"] as const} onChange={setWho} />
        </div>
        <Funnel key={`${who}-${range}`} steps={steps} tone={who === "Sellers" ? "blue" : undefined} />
        <Meta range={range} source={who === "Creators" ? "Rezekii events, TikTok link and raise status" : "Rezekii events, Seller Center connection, TAP pipeline"} />
      </section>

      <div className="v2-split">
        <section className="v2-card">
          <div className="v2-card-h">
            <h2 className="v2-h2">Events by day</h2>
            <span className="v2-small">Total {series.reduce((a, b) => a + b, 0).toLocaleString("en-MY")} · avg {Math.round(series.reduce((a, b) => a + b, 0) / series.length)} a day</span>
          </div>
          <Chips label="Event" value={ev} onChange={setEv} options={Object.keys(EVENTS).map((k) => [k] as [string])} />
          <Columns key={ev} values={series} labels={DAYS14.map((d, i) => (i % 2 === 1 ? `${d} Oct` : ""))} />
          <Meta range="15–28 Oct (28 Oct so far)" source="Rezekii events" />
        </section>

        <section className="v2-card">
          <h2 className="v2-h2">Activity timeline</h2>
          <Search value={q} onChange={setQ} placeholder="Search a creator or seller" />
          <div className="v2-chips">
            {Object.keys(TIMELINES).map((k) => (
              <button key={k} type="button" className={`v2-chip ${key === k ? "on" : ""}`} style={{ height: 32, fontSize: 13 }} onClick={() => setQ(k)}>{k}</button>
            ))}
          </div>
          {timeline && key ? (
            <>
              <div className="v2-row"><Av name={key} size={32} /><b>{key}</b></div>
              <ul className="ad-tl">
                {timeline.map((e, i) => (
                  <li key={i} className={e.tone}><small>{e.when}</small>{e.what}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="v2-small" style={{ margin: 0 }}>No one found.</p>
          )}
          <Meta range="Since sign-up" source="Rezekii events (PDPA notice covers this)" />
        </section>
      </div>
    </div>
  );
}
