"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Portal } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { useT } from "@/lib/i18n/client";
import { FIRST_STEPS, GUIDE_HREF, HOW_TOS, TOUR, type GuideSide } from "@/lib/guide";

/** Saves that she finished or skipped the tour, or closed Getting Started, for every device. */
const mark = (side: GuideSide, what: "tour" | "list") =>
  fetch("/api/v2/guide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side, mark: what }) }).catch(() => null);

type Steps = { id: string; done: boolean }[];
const loadSteps = (side: GuideSide): Promise<{ steps: Steps; closed: boolean } | null> =>
  fetch(`/api/v2/guide?side=${side}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

/**
 * Welcome Tour (owner, 4 Nov 2026): one card per tab, shown once per account; Skip or Start ends it. Start opens her first
 * step that isn't done yet. Replay from the Guide page shows it again without saving anything.
 */
export function WelcomeTour({ side, onClose, replay = false }: { side: GuideSide; onClose: () => void; replay?: boolean }) {
  const t = useT();
  const cards = TOUR[side];
  const [i, setI] = useState(0);
  const [going, setGoing] = useState(false);
  const card = cards[i];
  const last = i === cards.length - 1;
  const end = () => {
    if (!replay) void mark(side, "tour");
    onClose();
  };
  const start = async () => {
    if (going) return;
    setGoing(true);
    if (!replay) await mark(side, "tour");
    const d = await loadSteps(side);
    const next = FIRST_STEPS[side].find((s) => d?.steps.some((x) => x.id === s.id && !x.done));
    if (next) window.location.href = next.href;
    else onClose();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") end(); if (e.key === "ArrowRight" && !last) setI(i + 1); if (e.key === "ArrowLeft" && i > 0) setI(i - 1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <Portal>
      <div className="wt-back" />
      <div className="wt-card" role="dialog" aria-modal="true" aria-label={t("Welcome to Rezekii")}>
        <button type="button" className="wt-skip" onClick={end}>{t("Skip")}</button>
        <p className="wt-kicker">{t("Welcome to Rezekii")}</p>
        <span className={`wt-icon ${card.tone}`}><Icon name={card.icon} size={34} /></span>
        <h2>{t(card.title)}</h2>
        <p className="wt-line">{t(card.line)}</p>
        <div className="wt-dots" aria-label={t("{n} of {total}", { n: i + 1, total: cards.length })}>
          {cards.map((c, n) => <button key={c.title} type="button" className={n === i ? "on" : undefined} aria-label={t(c.title)} onClick={() => setI(n)} />)}
        </div>
        <div className="wt-acts">
          {i > 0 && <button type="button" className="btn-outline" onClick={() => setI(i - 1)}>{t("Back")}</button>}
          {last
            ? <button type="button" className="np-btn" disabled={going} onClick={() => void start()}>{going ? t("Opening…") : t("Start")} <Icon name="arrow" size={18} /></button>
            : <button type="button" className="np-btn" onClick={() => setI(i + 1)}>{t("Continue")} <Icon name="arrow" size={18} /></button>}
        </div>
      </div>
    </Portal>
  );
}

/** Shows the Welcome Tour once per account, on the app she opened (not Admin, not while she's waiting for the beta). */
export function TourOnce({ side }: { side: GuideSide }) {
  const { me, live } = useDemo();
  const [closed, setClosed] = useState(false);
  if (!live || !me?.tour || me.tour[side] || closed) return null;
  return <WelcomeTour side={side} onClose={() => setClosed(true)} />;
}

/**
 * Getting Started on Home (owner, 4 Nov 2026): her first steps, each ticked from what Rezekii really sees. It goes away once
 * everything's done, or when she closes it.
 */
export function GettingStarted({ side }: { side: GuideSide }) {
  const t = useT();
  const { live } = useDemo();
  const [steps, setSteps] = useState<Steps | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    if (!live) return;
    loadSteps(side).then((d) => { if (d) { setSteps(d.steps); setHidden(d.closed); } });
  }, [live, side]);
  if (!live || hidden || !steps) return null;
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const close = () => { setHidden(true); void mark(side, "list"); };
  const next = FIRST_STEPS[side].find((s) => steps.some((x) => x.id === s.id && !x.done));
  return (
    <section className="v2-card gs-card" aria-label={t("Getting Started")}>
      <div className="gs-head">
        <span>
          <b>{t("Getting Started")}</b>
          <small>{t("{done} of {total} done", { done, total: steps.length })}</small>
        </span>
        <Link href={GUIDE_HREF[side]} className="v2-link gs-guide">{t("Guide")}</Link>
        <button type="button" className="gs-close" aria-label={t("Close")} onClick={close}><Icon name="x" size={16} /></button>
      </div>
      <div className="gs-bar" aria-hidden="true"><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="gs-list">
        {FIRST_STEPS[side].map((s) => {
          const ok = steps.some((x) => x.id === s.id && x.done);
          return (
            <li key={s.id} className={ok ? "done" : s.id === next?.id ? "next" : undefined}>
              <Link href={s.href}>
                <span className="gs-tick">{ok ? <Icon name="check" size={14} width={2.8} /> : null}</span>
                <span className="gs-title">{t(s.title)}</span>
                {!ok && <Icon name="arrow" size={15} />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The Guide page (owner, 4 Nov 2026): short how-tos with a button straight to the page, and the Welcome Tour again. */
export function GuidePage({ side }: { side: GuideSide }) {
  const t = useT();
  const [tour, setTour] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="v2-stack v2-in gd-page">
      <div className="gd-top">
        <h1>{t("How to Use Rezekii")}</h1>
        <button type="button" className="btn-outline" onClick={() => setTour(true)}><Icon name="refresh" size={16} /> {t("Replay Welcome Tour")}</button>
      </div>
      <div className="gd-list">
        {HOW_TOS[side].map((h, n) => (
          <section key={h.title} className={`v2-card gd-item${open === n ? " open" : ""}`}>
            <button type="button" className="gd-head" aria-expanded={open === n} onClick={() => setOpen(open === n ? null : n)}>
              <span className="gd-ic"><Icon name={h.icon} size={18} /></span>
              <b>{t(h.title)}</b>
              <Icon name="updown" size={16} />
            </button>
            {open === n && (
              <div className="gd-body">
                <ol>{h.steps.map((s) => <li key={s}>{t(s)}</li>)}</ol>
                <Link href={h.href} className="np-btn v2-btn-sm">{t("Open")} <Icon name="arrow" size={16} /></Link>
              </div>
            )}
          </section>
        ))}
      </div>
      {tour && <WelcomeTour side={side} replay onClose={() => setTour(false)} />}
    </div>
  );
}
