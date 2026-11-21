"use client";

import { Icon } from "@/components/icons";
import type { T } from "@/lib/i18n/lang";

/** Shared bits of Convert Links and Product Lookup (owner, 21 Nov 2026). */
export const linesOf = (text: string) => text.split(/\s+/).map((l) => l.trim()).filter(Boolean);

/** POSTs JSON; gives back the answer, or { error } with the server's message (already in her language). */
export async function postJson<R>(url: string, body: unknown): Promise<R | { error: string }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? (d as R) : { error: typeof d.error === "string" ? d.error : "" };
  } catch {
    return { error: "" };
  }
}

export function copyLink(link: string, toast: (m: string) => void, t: T) {
  navigator.clipboard.writeText(link).then(() => toast(t("Link copied"))).catch(() => toast(t("Couldn't copy. Select the link and copy it.")));
}

export function Thumb({ src }: { src: string | null }) {
  return (
    <span className="lt-img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : <Icon name="box" size={20} />}
    </span>
  );
}
