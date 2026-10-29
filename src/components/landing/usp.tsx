"use client";

import { useRef } from "react";
import { Icon } from "@/components/icons";
import { useLiveChildren } from "./hooks";
import { AiText } from "./ai-text";
import { AutoSlider } from "./slider";
import { StoryCard, type Story } from "./stories";

/** `live`: the demo has its own button (so it isn't hidden from screen readers). */
export type Usp = { title: string; line: string; tint: string; demo: React.ReactNode; live?: boolean };

/**
 * "What You Get" banner rail (owner, 29 Oct 2026): one bold banner per benefit, each with a small looping demo of the benefit
 * happening. Phones: one per screen, moving on every 4 seconds; desktop: three at a time. A banner only plays while visible.
 */
export function UspRail({ items, label }: { items: Usp[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLiveChildren(ref, ".lp-usp", 0.55);
  return (
    <div ref={ref}>
      <AutoSlider label={label} every={4000} className="three">
        {items.map((u) => (
          <article key={u.title} className="lp-usp" style={{ "--tint": u.tint } as React.CSSProperties}>
            <div className="lp-usp-demo" aria-hidden={u.live ? undefined : true}>{u.demo}</div>
            <h3>{u.title}</h3>
            <p><AiText text={u.line} /></p>
          </article>
        ))}
      </AutoSlider>
    </div>
  );
}

export type See = { title: string; line: string; screen: React.ReactNode };

/**
 * "What You'll See" (owner, 29 Oct 2026): real app screens in a phone frame, then the testimonials, in one slider. A screen
 * plays while visible; a tap plays it again.
 */
export function SeeRail({ items, stories = [], label }: { items: See[]; stories?: Story[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLiveChildren(ref, ".lp-see-scr, .lp-story", 0.5);
  const replay = (frame: HTMLElement) => {
    const el = frame.querySelector<HTMLElement>(".lp-see-scr");
    if (!el) return;
    el.removeAttribute("data-on");
    void el.offsetWidth;
    el.setAttribute("data-on", "");
  };
  return (
    <div ref={ref}>
      <AutoSlider label={label} every={5500} className="three">
        {items.map((x) => (
          <article key={x.title} className="lp-see">
            <div
              className="lp-see-frame"
              role="button"
              tabIndex={0}
              aria-label={`Play again: ${x.title}`}
              onClick={(e) => replay(e.currentTarget)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); replay(e.currentTarget); } }}
            >
              <div className="lp-phone sm2">
                <div className="lp-screen">
                  <span className="lp-island" />
                  <div className="lp-scr lp-live lp-see-scr"><div className="lp-scr-app">{x.screen}</div></div>
                  <span className="lp-homebar" />
                </div>
              </div>
            </div>
            <h3>{x.title}</h3>
            <p><AiText text={x.line} /></p>
          </article>
        ))}
        {stories.map((s) => <StoryCard key={s.handle} s={s} />)}
      </AutoSlider>
      {stories.some((s) => s.sample) && <p className="hm-fine lp-note-line"><Icon name="info" size={13} /> Screens use sample data. Sample testimonials · preview only.</p>}
    </div>
  );
}
