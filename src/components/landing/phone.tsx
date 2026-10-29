"use client";

import { useEffect, useRef, useState } from "react";
import { useOnScreen, useReducedMotion } from "./hooks";

/** The Rezekii app icon, as it shows on a phone. */
export function AppIcon({ size = 34 }: { size?: number }) {
  return (
    <span className="lp-appicon" style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/master-logo-transparent.png" alt="" width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} />
    </span>
  );
}

/** Signal, Wi-Fi and battery, drawn so they follow the screen's text colour. */
function StatusBar({ time = true }: { time?: boolean }) {
  return (
    <div className="lp-status" aria-hidden="true">
      <b>{time ? "9:41" : ""}</b>
      <span>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2.2 0 4.2.9 5.7 2.3l1.1-1.1A9.6 9.6 0 0 0 7.5.7 9.6 9.6 0 0 0 .7 3.4l1.1 1.1a8.1 8.1 0 0 1 5.7-2.3zm0 3c1.4 0 2.6.5 3.6 1.4l1.1-1.1a6.6 6.6 0 0 0-9.4 0l1.1 1.1c1-.9 2.2-1.4 3.6-1.4zm0 3c-.6 0-1.1.2-1.5.6L7.5 10.3 9 8.8a2.1 2.1 0 0 0-1.5-.6z" /></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="22.5" y="4" width="1.8" height="4" rx="0.9" opacity="0.5" /></svg>
      </span>
    </div>
  );
}

/**
 * An iPhone drawn in CSS: titanium edge, Dynamic Island, status bar, home bar. `lock` gives the dark lock-screen look; app
 * screens follow the site's light or dark tokens.
 */
export function Phone({ children, lock = false, className = "", label }: { children: React.ReactNode; lock?: boolean; className?: string; label?: string }) {
  return (
    <figure className={`lp-phone ${className}`} role="img" aria-label={label}>
      <div className={`lp-screen ${lock ? "lock" : ""}`}>
        <span className="lp-island" aria-hidden="true" />
        <StatusBar time={!lock} />
        {children}
        <span className="lp-homebar" aria-hidden="true" />
      </div>
    </figure>
  );
}

export type Note = { title: string; line: string; when?: string };

/** One iOS-style notification from Rezekii. */
export function Banner({ note, className = "", style }: { note: Note; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`lp-note ${className}`} style={style}>
      <AppIcon size={34} />
      <span className="lp-note-t">
        <span className="lp-note-h"><b>Rezekii AI</b><small>{note.when ?? "now"}</small></span>
        <strong>{note.title}</strong>
        <em>{note.line}</em>
      </span>
    </div>
  );
}

/** Phones and tablets (owner, 29 Oct 2026, option A): no phone frame in the hero, just the first two notifications. */
export function HeroAlerts({ notes }: { notes: Note[] }) {
  return (
    <div className="lp-hero-alerts" aria-hidden="true">
      {notes.map((note, i) => (
        <Banner key={note.title} note={{ ...note, when: i === 0 ? "now" : `${i * 2 + 1}m ago` }} style={{ "--i": i } as React.CSSProperties} />
      ))}
    </div>
  );
}

const STEP = 76;

/**
 * Lock screen where Rezekii's notifications drop in one by one, newest on top, then clear and start again. Runs only while on
 * screen; with reduced motion all of them simply show.
 */
export function LockScreen({ notes, label, date = "Thursday, 29 October" }: { notes: Note[]; label: string; date?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useOnScreen(ref);
  const still = useReducedMotion();
  // 1…N notifications showing, then two beats to read them, then 0 clears the screen.
  const [n, setN] = useState(1);
  useEffect(() => {
    if (still) return setN(notes.length);
    if (!on) return;
    const t = window.setInterval(() => setN((k) => (k >= notes.length + 2 ? 0 : k + 1)), 1750);
    return () => window.clearInterval(t);
  }, [on, still, notes.length]);
  const shown = Math.min(n, notes.length);
  return (
    <div ref={ref} className="lp-lockwrap lp-live" data-on={on ? "" : undefined}>
      <Phone lock label={label} className="lp-hero-phone">
        <i className="lp-aiscan" aria-hidden="true" />
        <div className="lp-clock" aria-hidden="true">
          <small>{date}</small>
          <b>9:41</b>
        </div>
        <div className="lp-notes" aria-hidden="true">
          {notes.map((note, i) => {
            const pos = shown - 1 - i;
            const vis = i < shown;
            return (
              <Banner
                key={note.title}
                note={{ ...note, when: pos === 0 ? "now" : `${pos * 2 + 1}m ago` }}
                className={vis ? "in" : ""}
                style={vis ? { transform: `translateY(${pos * STEP}px) scale(${pos > 2 ? 0.96 : 1})`, opacity: pos > 3 ? 0.7 : 1 } : undefined}
              />
            );
          })}
        </div>
        <div className="lp-lockbtns" aria-hidden="true">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l-1 6H9zM9 8h6v13H9zM12 12v3" /></svg></span>
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg></span>
        </div>
      </Phone>
    </div>
  );
}
