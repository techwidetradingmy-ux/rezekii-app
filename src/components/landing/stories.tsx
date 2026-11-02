"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Portal } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import { Av, v } from "./bits";

/* The sample stories' words are in English here (tx) and shown in her language by the cards (owner, 3 Nov 2026). */

/**
 * Testimonials (owner, 29 Oct 2026: sample ones for now, real ones later). Real ones bring `photo` (profile picture) and
 * `screenshot` (their results screen) and set `sample: false`. Until then each card has illustrated initials, a results screen
 * drawn from the app's own UI with sample numbers, and a visible Sample tag. Never a realistic face or fake real screenshot.
 */
export type Shot =
  | { kind: "earn"; title: string; amount: string; period: string; bars: number[] }
  | { kind: "creators"; title: string; rows: [string, number][] }
  | { kind: "samples"; title: string; rows: [string, number][] }
  /** TikTok Shop commission before and after, same products (owner, 29 Oct 2026). */
  | { kind: "payout"; title: string; before: string; after: string; period: string };

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
    result: "+RM 1,180", period: tx("commission, last 30 days"), quote: tx("The first scan found 12 better rates. I added them all before lunch."),
    shot: { kind: "earn", title: tx("Commission"), amount: "RM 1,180.40", period: tx("Last 30 days"), bars: [30, 42, 38, 55, 61, 58, 74, 80] },
  },
  {
    name: "Tan Mei Ling", handle: "@mei.ling.deals", state: "Kuala Lumpur", level: "Silver", sample: true,
    // 9% to 10% on the same sales is about 11% more: modest on purpose.
    result: "+RM 161", period: tx("more TikTok Shop commission, 30 days"), quote: tx("Same products, better rates. My TikTok Shop commission went up."),
    shot: { kind: "payout", title: tx("TikTok Shop Commission"), before: "RM 1,452", after: "RM 1,613", period: tx("Last 30 days") },
  },
  {
    name: "Hafiz Roslan", handle: "@hafiz.tech", state: "Selangor", level: "Bronze", sample: true,
    result: tx("Week 1"), period: tx("her first free samples"), quote: tx("I was new. Here the samples were open to me, no big follower count needed."),
    shot: { kind: "samples", title: tx("My Samples"), rows: [["4-in-1 USB-C cable", 3], ["Phone stand", 2], ["Chopper blender", 1]] },
  },
  {
    name: "Nurul Aina", handle: "@nurul.beauty", state: "Kuala Lumpur", level: "Silver", sample: true,
    result: tx("5.2K views"), period: tx("posted in her golden time, 8–10 pm"), quote: tx("Finally, my videos don't stay under 100 views."),
    shot: { kind: "earn", title: tx("Viral Time Frame"), amount: tx("8–10 pm"), period: tx("From your own posts"), bars: [10, 16, 28, 22, 40, 92, 64, 20] },
  },
];

export const SELLER_STORIES: Story[] = [
  {
    name: "Rumah Rapi MY", handle: tx("Aida, owner"), state: tx("Home storage"), sample: true,
    result: tx("Every sample"), period: tx("came back with a video"), quote: tx("Now every sample comes back with a video, most with two or three."),
    shot: { kind: "samples", title: tx("Where Samples Went"), rows: [["@farah.home", 3], ["@siti.deco", 2], ["@kak.ros.kitchen", 3]] },
  },
  {
    name: "Bayu Sports Gear", handle: tx("Kelvin, founder"), state: tx("Sports"), sample: true,
    result: tx("31 creators"), period: tx("selling in 6 weeks"), quote: tx("31 creators have sold for us and I haven't sent a single DM."),
    shot: { kind: "creators", title: tx("Results per Creator"), rows: [["@ahmad.fitlife", 92], ["@danial.vlogs", 70], ["@aisyah.glow", 54], ["@hafiz.tech", 31]] },
  },
  {
    name: "Lembut Baby Co.", handle: tx("Siti, marketing"), state: tx("Mum & baby"), sample: true,
    result: "RM 0", period: tx("before the first sale"), quote: tx("What sold me was paying nothing until something sells."),
    shot: { kind: "earn", title: tx("Sales from Creators"), amount: "RM 4,212.00", period: tx("Last 30 days"), bars: [8, 14, 22, 30, 36, 48, 57, 70] },
  },
];

const LEVEL_BADGE = { Gold: "badge-amber", Silver: "badge-blue", Bronze: "badge-gray" } as const;

/** The results "screenshot", drawn from the app's own UI (sample numbers). */
function ShotUI({ shot }: { shot: Shot }) {
  const t = useT();
  return (
    <div className="lp-shotui" aria-hidden="true">
      <b className="lp-shotui-h">{t(shot.title)}</b>
      {shot.kind === "earn" && (
        <>
          <span className="lp-shotui-amt">{t(shot.amount)}<small>{t(shot.period)}</small></span>
          <span className="lp-shotui-bars">{shot.bars.map((h, i) => <i key={i} style={v({ h: `${h}%`, i })} />)}</span>
        </>
      )}
      {shot.kind === "payout" && (
        <span className="lp-shotui-pay">
          <span><small>{t("Before")}</small><s>{shot.before}</s></span>
          <Icon name="arrow" size={14} width={2.6} />
          <span className="now"><small>{t("With Rezekii")}</small><b>{shot.after}</b></span>
          <small>{t(shot.period)}</small>
        </span>
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
  const t = useT();
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
          <small>{t(s.handle)}{s.state ? ` · ${t(s.state)}` : ""}</small>
        </span>
        {s.level && <span className={`badge ${LEVEL_BADGE[s.level]}`}>{t(s.level)}</span>}
        {s.sample && <span className="badge badge-gray">{t("Sample")}</span>}
      </header>
      <div className="lp-story-mid">
        {s.screenshot ? (
          <button type="button" className="lp-shotf" onClick={() => setBig(true)} aria-label={t("View {name}'s results screenshot larger", { name: s.name })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.screenshot} alt={t("{name}'s results screenshot", { name: s.name })} loading="lazy" />
          </button>
        ) : s.shot ? (
          <span className="lp-shotf"><ShotUI shot={s.shot} /></span>
        ) : null}
        <div className="lp-story-res">
          <b>{t(s.result)}</b>
          <span>{t(s.period)}</span>
        </div>
      </div>
      <blockquote>&ldquo;{t(s.quote)}&rdquo;</blockquote>
      {big && s.screenshot && (
        <Portal>
          <div className="lp-shot-big" role="dialog" aria-modal="true" aria-label={t("{name}'s results screenshot", { name: s.name })} onClick={() => setBig(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.screenshot} alt={t("{name}'s results screenshot", { name: s.name })} />
            <button type="button" className="lp-ghost" onClick={() => setBig(false)}>{t("Close")}</button>
          </div>
        </Portal>
      )}
    </article>
  );
}
