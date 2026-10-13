"use client";

import { useState } from "react";

/**
 * The two Marketplace actions, shared by the card and the product view.
 * Add to showcase: Techwide makes a TAP link and TikTok Shop opens on the product, where the creator adds it to their showcase.
 * Request free sample: goes to Techwide's queue; Techwide applies for it in TikTok Shop.
 */
export function useTapActions(onRequested?: (productId: string) => void) {
  const [busy, setBusy] = useState<"" | "link" | "sample">("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function addToShowcase(productId: string) {
    if (busy) return;
    // Open the tab now (inside the click) so the browser doesn't block it, then point it at the link.
    const tab = window.open("", "_blank");
    setBusy("link");
    setMessage(null);
    try {
      const r = await fetch("/api/tap/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      const d = (await r.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!r.ok || !d.link) throw new Error(d.error || "TikTok could not make the link right now. Please try again.");
      if (tab) tab.location.href = d.link;
      else window.location.href = d.link;
      setMessage({ kind: "ok", text: "TikTok Shop opened on this product. Tap Add to showcase there." });
    } catch (err) {
      tab?.close();
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy("");
    }
  }

  async function requestSample(productId: string) {
    if (busy) return;
    setBusy("sample");
    setMessage(null);
    try {
      const r = await fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error || "Could not send the request. Please try again.");
      onRequested?.(productId);
      setMessage({ kind: "ok", text: "Sample requested. Techwide applies for it in TikTok Shop; follow it in My samples." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy("");
    }
  }

  return { busy, message, setMessage, addToShowcase, requestSample };
}
