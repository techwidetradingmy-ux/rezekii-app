"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { ShareSheet } from "@/components/ui";
import type { Platform } from "@/lib/mock-creator2";

/** Simple platform marks for the publish screens (drawn, not the official artwork). */
export function PlatformIcon({ name, size = 40 }: { name: Platform; size?: number }) {
  const g = Math.round(size * 0.56);
  return (
    <span className={`cr2-pi cr2-pi-${name.toLowerCase()}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }} aria-hidden="true">
      <svg width={g} height={g} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
        {name === "TikTok" && <path d="M14 3.5v11a3.6 3.6 0 1 1-3.6-3.6M14 3.5c.4 2.6 2.3 4.4 5 4.6" />}
        {name === "Instagram" && (
          <>
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <circle cx="12" cy="12" r="3.9" />
            <circle cx="17.2" cy="6.8" r="0.6" fill="#ffffff" />
          </>
        )}
        {name === "Facebook" && <path d="M14.6 8H16.5V4.8h-2.3a4 4 0 0 0-4 4v2.3H8.2v3.1h2v6.6h3.2v-6.6h2.3l.5-3.1h-2.8V9a1 1 0 0 1 1.2-1z" fill="#ffffff" stroke="none" />}
        {name === "Threads" && (
          <text x="12" y="17.2" textAnchor="middle" fontSize="16.5" fontWeight="800" fill="#ffffff" stroke="none" fontFamily="inherit">@</text>
        )}
      </svg>
    </span>
  );
}

/** "Share" button for the top right of every rewards screen: opens the ready-made share card. */
export function ShareButton({ big, label, lines }: { big: string; label: string; lines: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-outline cr2-sharebtn" onClick={() => setOpen(true)}>
        <Icon name="share" size={18} /> Share
      </button>
      {open && <ShareSheet onClose={() => setOpen(false)} big={big} label={label} lines={lines} />}
    </>
  );
}

/** The Highly active honour badge: grey until earned; `lit` plays the light-up. */
export function Honour({ state, size = 120 }: { state: "off" | "on" | "lit"; size?: number }) {
  return (
    <span className={`cr2-honour ${state}`} style={{ ["--s" as string]: `${size}px` }} aria-label={state === "off" ? "Highly active badge, not earned yet" : "Highly active badge"}>
      <span className="cr2-rays" />
      <span className="halo" />
      <span className="ripple" />
      <span className="ripple" />
      <span className="disc">
        <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="#ffffff" stroke="#8a5600" strokeWidth={1.3} strokeLinejoin="round" aria-hidden="true">
          <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
        </svg>
      </span>
    </span>
  );
}

/** Small status dot with an icon (ok / warn / bad / scheduled). */
export function Dot({ kind }: { kind: "ok" | "warn" | "bad" | "sched" }) {
  return (
    <span className={`cr2-dot ${kind}`} aria-hidden="true">
      <Icon name={kind === "ok" ? "check" : kind === "sched" ? "cal" : kind === "bad" ? "x" : "alert"} size={13} width={2.8} />
    </span>
  );
}
