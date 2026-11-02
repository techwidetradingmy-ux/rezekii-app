"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { AiMark } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { AiText } from "./ai-text";
import { useMedia, useOnScreen, useReducedMotion } from "./hooks";
import { Banner, Phone, type Note } from "./phone";
import { AutoSlider } from "./slider";

/** One job in "A Day With Rezekii": when, the problem, the fix, the notification that starts it and its app screen (words already translated). */
export type DayStep = { id: string; time: string; title: string; problem: string; fix: string; ai?: boolean; note: Note; screen: React.ReactNode };

/** The notification drops in from the Dynamic Island, then the app screen opens and does the job. */
function StepScreen({ step, live }: { step: DayStep; live: boolean }) {
  return (
    <div className="lp-scr lp-live" data-on={live ? "" : undefined}>
      <Banner note={step.note} className="lp-scr-note" />
      <div className="lp-scr-app">{step.screen}</div>
    </div>
  );
}

function StepText({ s }: { s: DayStep }) {
  return (
    <>
      <span className="lp-jr-time">{s.time}</span>
      <h3>{s.ai && <AiMark size={26} />}{s.title}</h3>
      <p className="lp-jr-prob"><span className="v2-x"><Icon name="x" size={11} width={3} /></span>{s.problem}</p>
      <p className="lp-jr-fix"><span className="v2-ok"><Icon name="check" size={11} width={3.2} /></span><span><AiText text={s.fix} /></span></p>
    </>
  );
}

/** Desktop: the phone stays pinned while the steps scroll past; the step in the middle of the screen drives the phone. */
function Pinned({ steps, label }: { steps: DayStep[]; label: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const on = useOnScreen(pin, 0.3);
  const still = useReducedMotion();
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-44% 0px -46% 0px" });
    [...el.children].forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [steps.length]);
  const go = (i: number) => (list.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  const s = steps[active];
  return (
    <div className="lp-jr">
      <ol ref={list} className="lp-jr-list" aria-label={label}>
        {steps.map((x, i) => (
          <li key={x.id} data-i={i} className={`lp-jr-step ${i === active ? "on" : ""}`}>
            <StepText s={x} />
          </li>
        ))}
      </ol>
      <div className="lp-jr-pin" ref={pin}>
        <Phone label={t("Example Rezekii screen: {title}", { title: s.title })}>
          <StepScreen key={s.id} step={s} live={on} />
        </Phone>
        <div className="lp-jr-ticks">
          {steps.map((x, i) => (
            <button key={x.id} type="button" className={i === active ? "on" : ""} aria-label={`${x.time} ${x.title}`} aria-current={i === active || undefined} onClick={() => go(i)}>
              {x.time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Phones: one step per slide, moving on by itself; touching pauses it. Only the slide on screen plays. */
function Slides({ steps, label }: { steps: DayStep[]; label: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const on = useOnScreen(wrap, 0.3);
  return (
    <div ref={wrap}>
      <AutoSlider label={label} every={7000} className="full lp-jr-slider" onIndex={setActive}>
        {steps.map((x, i) => (
          <article key={x.id} className="lp-jr-slide">
            <div className="lp-jr-text"><StepText s={x} /></div>
            <Phone className="sm" label={t("Example Rezekii screen: {title}", { title: x.title })}>
              <StepScreen key={i === active ? `on-${x.id}` : x.id} step={x} live={on && i === active} />
            </Phone>
          </article>
        ))}
      </AutoSlider>
    </div>
  );
}

/** "A Day With Rezekii" / "A Week With Rezekii": the main walk-through on both landing pages. */
export function Journey({ steps, label }: { steps: DayStep[]; label: string }) {
  const wide = useMedia("(min-width: 960px)");
  return wide ? <Pinned steps={steps} label={label} /> : <Slides steps={steps} label={label} />;
}
