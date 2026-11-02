"use client";

import { useEffect, useRef } from "react";
import { notesChanged } from "./live-notes";

/** Sound for new notifications, on or off on this device (owner, 3 Nov 2026). On until she turns it off in Settings. */
const SOUND_KEY = "rz_sound";
export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Private browsing can refuse: the sound just stays as it was.
  }
}

let audio: AudioContext | null = null;
/** The browser's sound, started from a tap (phones only allow sound that a tap started). */
function wake(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audio ??= new AC();
  if (audio.state !== "running") audio.resume().catch(() => {});
  return audio;
}

/** A short, soft two-note chime, made in the browser (no sound file). */
function chime() {
  const ctx = wake();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, at] of [[880, 0], [1318.5, 0.13]]) {
    const tone = ctx.createOscillator();
    const vol = ctx.createGain();
    tone.type = "sine";
    tone.frequency.value = freq;
    vol.gain.setValueAtTime(0.0001, t0 + at);
    vol.gain.exponentialRampToValueAtTime(0.07, t0 + at + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.5);
    tone.connect(vol).connect(ctx.destination);
    tone.start(t0 + at);
    tone.stop(t0 + at + 0.55);
  }
}

/**
 * Plays the chime when the bell's number goes up while Rezekii is open: never on first load, only once she has tapped or clicked
 * the page (browsers block sound before that), and not when Sound is off on this device. A phone notification arriving while
 * Rezekii is open makes the bell count again at once.
 */
export function useNoteChime(unread: number | null): void {
  const last = useRef<number | null>(null);
  const tapped = useRef(false);
  useEffect(() => {
    const tap = () => {
      tapped.current = true;
      if (soundOn()) wake();
    };
    const pushed = (e: MessageEvent) => { if ((e.data as { type?: string } | null)?.type === "rz-push") notesChanged(); };
    window.addEventListener("pointerdown", tap, { capture: true, passive: true });
    window.addEventListener("keydown", tap, { capture: true });
    navigator.serviceWorker?.addEventListener("message", pushed);
    return () => {
      window.removeEventListener("pointerdown", tap, { capture: true });
      window.removeEventListener("keydown", tap, { capture: true });
      navigator.serviceWorker?.removeEventListener("message", pushed);
    };
  }, []);
  useEffect(() => {
    if (unread === null) return;
    const before = last.current;
    last.current = unread;
    if (before !== null && unread > before && tapped.current && soundOn()) chime();
  }, [unread]);
}
