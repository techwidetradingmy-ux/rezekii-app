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
import { LiveSamples } from "@/components/seller/live-samples";
import { sellerProductHref } from "@/lib/product-pages";
import { labelCase } from "@/lib/label-case";
import { useT } from "@/lib/i18n/client";

const FILTERS = ["All", "Delivered", "On time", "Overdue"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * Every sample, where it went and what the creator posted. The lights come on one by one.
 * 1 sample = at least 1 video by the due date; most creators post more (owner, 29 Oct 2026). Only 0 videos past due is overdue.
 */
export default function SamplesWent() {
  const t = useT();
  const { toast, live } = useDemo();
  const [filter, setFilter] = useState<Filter>("All");
  if (live) return <LiveSamples />;
  const s = SAMPLE_SUMMARY;
  const dots = [...Array(s.delivered).fill("d"), ...Array(s.onTime).fill("t"), ...Array(s.overdue).fill("o")] as string[];
  const shown = DESTINATIONS.filter((d) => filter === "All" || d.state === filter);
  const label = (d: Dest) => (d.state === "Delivered" ? t("Delivered") : d.state === "On time" ? t("Due {date}", { date: d.due ?? "" }) : d.late === 1 ? t("Overdue {n} Day", { n: 1 }) : t("Overdue {n} Days", { n: d.late ?? 0 }));
  const vids = (n: number) => (!n ? t("No video yet") : n === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n }));

  return (
    <div className="v2-stack v2-in">
      <Title title={t("Where Samples Went")} sub={<Source />} />

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{t("{n} samples sent", { n: s.sent })}</h2>
          <span className="v2-small">{t("1 dot = 1 sample")}</span>
        </div>
        <div className="sl-dots" aria-hidden="true">
          {dots.map((tone, i) => <i key={i} className={tone} style={{ animationDelay: `${120 + i * 35}ms` }} />)}
        </div>
        <div className="sl-legend">
          <span><i style={{ background: "#00b86c" }} /> {t("Delivered, 1 video or more")}</span>
          <span><i style={{ background: "#9be8c4" }} /> {t("No video yet, not due")}</span>
          <span><i style={{ background: "#e14b3b" }} /> {t("No video by the due date")}</span>
        </div>
      </section>

      <section className="v2-grid4">
        <Stat label={t("Delivered")} value={<Count value={s.delivered} />} note={t("{n}% of samples", { n: Math.round((s.delivered / s.sent) * 100) })} tone="up" />
        <Stat label={t("Posting, on Time")} value={<Count value={s.onTime} />} />
        <Stat label={t("Overdue")} value={<Count value={s.overdue} />} note={t("All reminded")} tone="down" />
        <Stat label={t("Videos Posted")} value={<Count value={s.videos} />} note={t("{n} per sample + {lives} LIVEs", { n: (s.videos / s.delivered).toFixed(1), lives: s.lives })} />
      </section>

      <div className="sl-chipline" role="group" aria-label={t("Filter")}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {t(labelCase(f))} <small>{f === "All" ? DESTINATIONS.length : DESTINATIONS.filter((d) => d.state === f).length}</small>
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
                  <b>{d.handle} <span className="v2-small" style={{ fontWeight: 600 }}>· {t(d.activity)}</span></b>
                  <small><Link href={sellerProductHref(d.item)} className="pv-open">{p.name}</Link> · {t("sent {date}", { date: d.sentOn })}</small>
                  <span className="v2-row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <Pips n={d.videos} /> {vids(d.videos)} <span className="v2-small" style={{ fontWeight: 600 }}>{t("(1 promised)")}</span>
                    {d.live && <span className="badge badge-blue">+ LIVE</span>}
                  </span>
                  {d.reminded && <small style={{ color: "var(--red)", fontWeight: 600 }}>{t(d.reminded)} · {t("samples paused")}</small>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${d.state === "Overdue" ? "badge-red" : d.state === "On time" ? "badge-amber" : ""}`}>{label(d)}</span>
                  {d.videos > 0 ? (
                    <button type="button" className="v2-link" style={{ fontSize: 13.5 }} onClick={() => toast(t("Opening {handle}'s videos on TikTok", { handle: d.handle }))}>{t("Watch Videos")}</button>
                  ) : d.state === "Overdue" ? (
                    <button type="button" className="v2-link" style={{ fontSize: 13.5 }} onClick={() => toast(t("We'll follow up within 1 working day"))}>{t("Ask Our Team")}</button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>{t("Latest {n} of {total}", { n: 12, total: s.sent })}</p>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="shield" size={16} /> {t("Techwide approves every sample. 1 sample = at least 1 video by the due date; creators with none get frozen or banned. Sent samples can't be taken back.")}
      </p>
    </div>
  );
}
