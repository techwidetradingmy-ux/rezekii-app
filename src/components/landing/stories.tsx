"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Portal } from "@/components/ui";
import { Av, v } from "./bits";

/**
 * Testimonials (owner, 29 Oct 2026: sample ones for now, real ones later). Real ones bring `photo` (profile picture) and
 * `screenshot` (their results screen) and set `sample: false`. Until then each card has illustrated initials, a results screen
 * drawn from the app's own UI with sample numbers, and a visible Sample tag. Never a realistic face or fake real screenshot.
 */
export type Shot =
  | { kind: "earn"; title: string; amount: string; period: string; bars: number[] }
  | { kind: "creators"; title: string; rows: [string, number][] }
  | { kind: "samples"; title: string; rows: [string, number][] };

export type Story = {
  name: string;
  handle: string;
  state?: string;
  level?: "Bronze" | "Silver" | "Gold";
  photo?: string;
  screenshot?: string;
  shot?: Shot;
  result: string;
  period: string;
  quote: string;
  sample: boolean;
};

export const CREATOR_STORIES: Story[] = [
  {
    name: "Rosnah Ismail", handle: "@kak.ros.kitchen", state: "Johor", level: "Gold", sample: true,
    result: "+RM 1,180", period: "commission, last 30 days", quote: "The first scan found 12 better rates. I added them all before lunch.",
    shot: { kind: "earn", title: "Commission", amount: "RM 1,180.40", period: "Last 30 days", bars: [30, 42, 38, 55, 61, 58, 74, 80] },
  },
  {
    name: "Tan Mei Ling", handle: "@mei.ling.deals", state: "Kuala Lumpur", level: "Silver", sample: true,
    result: "+RM 640", period: "from Reels and Threads, 30 days", quote: "I upload once now, and my Reels started selling too.",
    shot: { kind: "earn", title: "Other Platforms", amount: "RM 640.10", period: "Last 30 days", bars: [12, 18, 26, 30, 41, 47, 52, 66] },
  },
  {
    name: "Hafiz Roslan", handle: "@hafiz.tech", state: "Selangor", level: "Bronze", sample: true,
    result: "RM 0", period: "spent on samples", quote: "I was new. Free samples meant I didn't have to buy stock to review it.",
    shot: { kind: "samples", title: "My Samples", rows: [["4-in-1 USB-C cable", 3], ["Phone stand", 2], ["Chopper blender", 1]] },
  },
  {
    name: "Nurul Aina", handle: "@nurul.beauty", state: "Kuala Lumpur", level: "Silver", sample: true,
    result: "8–10 pm", period: "her best time to post", quote: "Posting at my best time made my evenings count.",
    shot: { kind: "earn", title: "Best Time to Post", amount: "8–10 pm", period: "From your own posts", bars: [10, 16, 28, 22, 40, 92, 64, 20] },
  },
];

export const SELLER_STORIES: Story[] = [
  {
    name: "Rumah Rapi MY", handle: "Aida, owner", state: "Home storage", sample: true,
    result: "Every sample", period: "came back with a video", quote: "Now every sample comes back with a video, most with two or three.",
    shot: { kind: "samples", title: "Where Samples Went", rows: [["@farah.home", 3], ["@siti.deco", 2], ["@kak.ros.kitchen", 3]] },
  },
  {
    name: "Bayu Sports Gear", handle: "Kelvin, founder", state: "Sports", sample: true,
    result: "31 creators", period: "selling in 6 weeks", quote: "31 creators have sold for us and I haven't sent a single DM.",
    shot: { kind: "creators", title: "Results per Creator", rows: [["@ahmad.fitlife", 92], ["@danial.vlogs", 70], ["@aisyah.glow", 54], ["@hafiz.tech", 31]] },
  },
  {
    name: "Lembut Baby Co.", handle: "Siti, marketing", state: "Mum & baby", sample: true,
    result: "RM 0", period: "before the first sale", quote: "What sold me was paying nothing until something sells.",
    shot: { kind: "earn", title: "Sales from Creators", amount: "RM 4,212.00", period: "Last 30 days", bars: [8, 14, 22, 30, 36, 48, 57, 70] },
  },
];

const LEVEL_BADGE = { Gold: "badge-amber", Silver: "badge-blue", Bronze: "badge-gray" } as const;

/** The results "screenshot", drawn from the app's own UI (sample numbers). */
function ShotUI({ shot }: { shot: Shot }) {
  return (
    <div className="lp-shotui" aria-hidden="true">
      <b className="lp-shotui-h">{shot.title}</b>
      {shot.kind === "earn" && (
        <>
          <span className="lp-shotui-amt">{shot.amount}<small>{shot.period}</small></span>
          <span className="lp-shotui-bars">{shot.bars.map((h, i) => <i key={i} style={v({ h: `${h}%`, i })} />)}</span>
        </>
      )}
      {shot.kind === "creators" && (
        <ul className="lp-shotui-rows">
          {shot.rows.map(([h, w], i) => (
            <li key={h} style={v({ i })}><span>{h}</span><span className="lp-bar"><i style={v({ w: `${w}%` })} /></span></li>
          ))}
        </ul>
      )}
      {shot.kind === "samples" && (
        <ul className="lp-shotui-rows">
          {shot.rows.map(([h, n], i) => (
            <li key={h} style={v({ i })}><span>{h}</span><span className="lp-pips">{Array.from({ length: n }, (_, k) => <i key={k} style={v({ i: k })} />)}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoryCard({ s }: { s: Story }) {
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [big]);
  return (
    <article className="lp-story">
      <header>
        {s.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="lp-story-photo" src={s.photo} alt="" loading="lazy" />
        ) : (
          <Av name={s.name} size={42} />
        )}
        <span>
          <b>{s.name}</b>
          <small>{s.handle}{s.state ? ` · ${s.state}` : ""}</small>
        </span>
        {s.level && <span className={`badge ${LEVEL_BADGE[s.level]}`}>{s.level}</span>}
        {s.sample && <span className="badge badge-gray">Sample</span>}
      </header>
      <div className="lp-story-mid">
        {s.screenshot ? (
          <button type="button" className="lp-shotf" onClick={() => setBig(true)} aria-label={`View ${s.name}'s results screenshot larger`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.screenshot} alt={`${s.name}'s results screenshot`} loading="lazy" />
          </button>
        ) : s.shot ? (
          <span className="lp-shotf"><ShotUI shot={s.shot} /></span>
        ) : null}
        <div className="lp-story-res">
          <b>{s.result}</b>
          <span>{s.period}</span>
        </div>
      </div>
      <blockquote>&ldquo;{s.quote}&rdquo;</blockquote>
      {big && s.screenshot && (
        <Portal>
          <div className="lp-shot-big" role="dialog" aria-modal="true" aria-label={`${s.name}'s results screenshot`} onClick={() => setBig(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.screenshot} alt={`${s.name}'s results screenshot`} />
            <button type="button" className="lp-ghost" onClick={() => setBig(false)}>Close</button>
          </div>
        </Portal>
      )}
    </article>
  );
}
