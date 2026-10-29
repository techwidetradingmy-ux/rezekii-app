"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Stat, Title } from "@/components/ui";
import { Ava, Pips, Source } from "@/components/seller/seller-ui";
import { product } from "@/lib/mock";
import { DESTINATIONS, SAMPLE_SUMMARY, type Dest } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";

const FILTERS = ["All", "Delivered", "On time", "Overdue"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Every sample, where it went and what the creator posted. The lights come on one by one.
 * 1 sample = at least 1 video by the due date; most creators post more (owner, 29 Oct 2026). Only 0 videos past due is overdue.
 */
export default function SamplesWent() {
  const { toast } = useDemo();
  const [filter, setFilter] = useState<Filter>("All");
  const s = SAMPLE_SUMMARY;
  const dots = [...Array(s.delivered).fill("d"), ...Array(s.onTime).fill("t"), ...Array(s.overdue).fill("o")] as string[];
  const shown = DESTINATIONS.filter((d) => filter === "All" || d.state === filter);
  const label = (d: Dest) => (d.state === "Delivered" ? "Delivered" : d.state === "On time" ? `Due ${d.due}` : `Overdue ${d.late} day${d.late === 1 ? "" : "s"}`);
  const vids = (n: number) => (n ? `${n} video${n === 1 ? "" : "s"}` : "No video yet");

  return (
    <div className="v2-stack v2-in">
      <Title title="Where Samples Went" sub={<Source />} />

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{s.sent} samples sent</h2>
          <span className="v2-small">1 dot = 1 sample</span>
        </div>
        <div className="sl-dots" aria-hidden="true">
          {dots.map((t, i) => <i key={i} className={t} style={{ animationDelay: `${120 + i * 35}ms` }} />)}
        </div>
        <div className="sl-legend">
          <span><i style={{ background: "#00b86c" }} /> Delivered, 1 video or more</span>
          <span><i style={{ background: "#9be8c4" }} /> No video yet, not due</span>
          <span><i style={{ background: "#e14b3b" }} /> No video by the due date</span>
        </div>
      </section>

      <section className="v2-grid4">
        <Stat label="Delivered" value={<Count value={s.delivered} />} note={`${Math.round((s.delivered / s.sent) * 100)}% of samples`} tone="up" />
        <Stat label="Posting, on time" value={<Count value={s.onTime} />} />
        <Stat label="Overdue" value={<Count value={s.overdue} />} note="All reminded" tone="down" />
        <Stat label="Videos posted" value={<Count value={s.videos} />} note={`${(s.videos / s.delivered).toFixed(1)} per sample + ${s.lives} LIVEs`} />
      </section>

      <div className="sl-chipline" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f} <small>{f === "All" ? DESTINATIONS.length : DESTINATIONS.filter((d) => d.state === f).length}</small>
          </button>
        ))}
      </div>

      <section className="v2-card">
        <div>
          {shown.map((d) => {
            const p = product(d.item);
            return (
              <div key={d.id} className="sl-dest">
                <Ava name={d.handle} lg />
                <span>
                  <b>{d.handle} <span className="v2-small" style={{ fontWeight: 600 }}>· {d.activity}</span></b>
                  <small><Link href={sellerProductHref(d.item)} className="pv-open">{p.name}</Link> · sent {d.sentOn}</small>
                  <span className="v2-row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <Pips n={d.videos} /> {vids(d.videos)} <span className="v2-small" style={{ fontWeight: 600 }}>(1 promised)</span>
                    {d.live && <span className="badge badge-blue">+ LIVE</span>}
                  </span>
                  {d.reminded && <small style={{ color: "var(--red)", fontWeight: 600 }}>{d.reminded} · samples paused</small>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${d.state === "Overdue" ? "badge-red" : d.state === "On time" ? "badge-amber" : ""}`}>{label(d)}</span>
                  {d.videos > 0 ? (
                    <button type="button" className="v2-link" style={{ fontSize: 13.5 }} onClick={() => toast(`Opening ${d.handle}'s videos on TikTok`)}>Watch videos</button>
                  ) : d.state === "Overdue" ? (
                    <button type="button" className="v2-link" style={{ fontSize: 13.5 }} onClick={() => toast("We'll follow up within 1 working day")}>Ask our team</button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>Latest 12 of {s.sent}</p>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="shield" size={16} /> Techwide approves every sample. 1 sample = at least 1 video by the due date; creators with none get frozen or banned. Sent samples can&apos;t be taken back.
      </p>
    </div>
  );
}
