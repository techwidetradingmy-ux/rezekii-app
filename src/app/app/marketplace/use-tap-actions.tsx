"use client";

import { useEffect, useState } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";

export type Flow = "idle" | "loading" | "done";
type Toast = { text: string; ok: boolean; n: number };

/**
 * The card and panel actions, shared by the Marketplace and the product page (as in the mockup).
 * Showcase: Techwide makes a TAP link and TikTok Shop opens on the product, where the creator taps Add to showcase.
 * Free sample: goes to Techwide, who applies for it in TikTok Shop; it then shows in My TAP products.
 */
export function useTap(requestedIds: string[]) {
  const [add, setAdd] = useState<Record<string, Flow>>({});
  const [sample, setSample] = useState<Record<string, Flow>>(() => Object.fromEntries(requestedIds.map((id) => [id, "done" as Flow])));
  const [toast, setToast] = useState<Toast | null>(null);
  const flash = (text: string, ok = true) => setToast({ text, ok, n: Date.now() });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  async function addToShowcase(id: string) {
    if ((add[id] ?? "idle") !== "idle") return;
    // Opened inside the click so the browser allows it; pointed at the link once TikTok returns it.
    const tab = window.open("", "_blank");
    setAdd((a) => ({ ...a, [id]: "loading" }));
    try {
      const r = await fetch("/api/tap/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id }) });
      const d = (await r.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!r.ok || !d.link) throw new Error(d.error || "TikTok could not make the link. Please try again.");
      if (tab) tab.location.href = d.link;
      else window.location.href = d.link;
      setAdd((a) => ({ ...a, [id]: "done" }));
      flash("TikTok Shop opened. Tap Add to showcase there.");
    } catch (err) {
      tab?.close();
      setAdd((a) => ({ ...a, [id]: "idle" }));
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }

  async function requestSample(p: TapProduct) {
    if (!p.samples || (sample[p.id] ?? "idle") !== "idle") return;
    setSample((s) => ({ ...s, [p.id]: "loading" }));
    try {
      const r = await fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: p.id }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      // 409 = already requested earlier (for example in another tab): show it as requested.
      if (!r.ok && r.status !== 409) throw new Error(d.error || "Could not send the request. Please try again.");
      setSample((s) => ({ ...s, [p.id]: "done" }));
      flash("Sample requested. It is now in My TAP products.");
    } catch (err) {
      setSample((s) => ({ ...s, [p.id]: "idle" }));
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }

  return {
    addState: (id: string): Flow => add[id] ?? "idle",
    sampleState: (p: TapProduct): Flow | "none" => (!p.samples ? "none" : (sample[p.id] ?? "idle")),
    addToShowcase,
    requestSample,
    toast,
  };
}

/** The mockup's bottom toast. */
export function Hud({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
    <div key={toast.n} className="nv-hud" role="status">
      {toast.ok ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c073" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="nv-check" d="m5 12 5 5 9-10" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8a80" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 7v6M12 17h.01" /></svg>
      )}
      {toast.text}
    </div>
  );
}
