"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/icons";
import { ShareSheet, type InviteInfo, type MomentKind } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logos";
import { CANCEL_MIN_ITEMS } from "@/lib/cancel";
import { useT } from "@/lib/i18n/client";
import type { Platform } from "@/lib/mock-creator2";

/** Platform logos for the publish screens and account: the real logos (owner, 30 Oct 2026). */
export function PlatformIcon({ name, size = 40 }: { name: Platform; size?: number }) {
  return <BrandLogo name={name} size={size} className="cr2-pi" />;
}

/** "Share" button for the top right of every rewards screen: opens the ready-made share card. */
export function ShareButton({ big, label, lines, moment, primary, invite }: { big: string; label: string; lines: string[]; moment?: MomentKind; primary?: string; invite?: InviteInfo }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={primary ? "np-btn rf-share" : "btn-outline cr2-sharebtn"} onClick={() => setOpen(true)}>
        <Icon name="share" size={18} /> {primary ?? t("Share")}
      </button>
      {open && <ShareSheet onClose={() => setOpen(false)} big={big} label={label} lines={lines} moment={moment} invite={invite} />}
    </>
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

/**
 * A switch's or sort's options in her language (owner, 3 Nov 2026). The code keeps the English names, which are what's saved
 * and compared; the buttons show `labels`, `label(k)` is the one picked, and `pick(label)` turns a tapped label back into its name.
 */
export function useOptions<K extends string>(options: readonly K[]) {
  const t = useT();
  const labels = options.map((o) => t(o));
  return { labels, label: (k: K) => t(k), pick: (l: string): K => options[labels.indexOf(l)] ?? options[0] };
}

/**
 * A translated line with parts that aren't plain text: **bold** text, and React parts (a link, a counting number) in the
 * {placeholders} that t() left unfilled.
 */
export function rich(text: string, parts: Record<string, React.ReactNode> = {}): React.ReactNode {
  const fill = (s: string, k: string) => s.split(/\{(\w+)\}/g).map((p, i) => (i % 2 ? <Fragment key={`${k}${i}`}>{p in parts ? parts[p] : `{${p}}`}</Fragment> : p));
  return text.split("**").map((s, i) => (i % 2 ? <b key={i}>{fill(s, `b${i}`)}</b> : <Fragment key={i}>{fill(s, `t${i}`)}</Fragment>));
}

/** A cancel rate as text in her language: the percent from 5 items sold, below that the counts ("2 of 2"), as lib/cancel does. */
export function useCancelText() {
  const t = useT();
  return (pct: number, items?: number, bad?: number) => (items !== undefined && items < CANCEL_MIN_ITEMS ? t("{bad} of {items}", { bad: bad ?? 0, items }) : `${pct}%`);
}
