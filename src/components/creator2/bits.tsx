"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { ShareSheet, type InviteInfo, type MomentKind } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logos";
import type { Platform } from "@/lib/mock-creator2";

/** Platform logos for the publish screens and account: the real logos (owner, 30 Oct 2026). */
export function PlatformIcon({ name, size = 40 }: { name: Platform; size?: number }) {
  return <BrandLogo name={name} size={size} className="cr2-pi" />;
}

/** "Share" button for the top right of every rewards screen: opens the ready-made share card. */
export function ShareButton({ big, label, lines, moment, primary, invite }: { big: string; label: string; lines: string[]; moment?: MomentKind; primary?: string; invite?: InviteInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={primary ? "np-btn rf-share" : "btn-outline cr2-sharebtn"} onClick={() => setOpen(true)}>
        <Icon name="share" size={18} /> {primary ?? "Share"}
      </button>
      {open && <ShareSheet onClose={() => setOpen(false)} big={big} label={label} lines={lines} moment={moment} invite={invite} />}
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
