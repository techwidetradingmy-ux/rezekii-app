"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { TapProduct } from "@/modules/tap/catalog.ts";

export type Flow = "idle" | "loading" | "done";
/** TikTok's live sample answer for the signed-in creator, once a product is opened (owner, 16 Oct 2026). */
type Live = "checking" | "available" | "none" | "requested" | "limit";
/** What the sample button shows: the request flow, or TikTok's live answer. */
export type SampleUi = Flow | "none" | "checking" | "limit";
type Toast = { text: string; ok: boolean; n: number };

/** The mockup's short message at the bottom of the screen: `flash(text)` shows it for 1.8 seconds. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const flash = (text: string, ok = true) => setToast({ text, ok, n: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, flash };
}

/**
 * The card and panel actions, shared by the Marketplace and the product page (as in the mockup).
 * Showcase: Techwide makes a TAP link; with the creator's TikTok Shop linked and approved it goes straight into their showcase,
 * otherwise TikTok Shop opens on the product, where the creator taps Add to showcase.
 * Free sample: TikTok's own sample request page through Techwide's TAP campaign (its sample budget). On a phone the TikTok app
 * opens straight away; on a computer a QR code opens it on the creator's phone. It then shows in My TAP products.
 */
export function useTap(requestedIds: string[]) {
  const [add, setAdd] = useState<Record<string, Flow>>({});
  const [sample, setSample] = useState<Record<string, Flow>>(() => Object.fromEntries(requestedIds.map((id) => [id, "done" as Flow])));
  const { toast, flash } = useToast();
  const [qr, setQr] = useState<{ url: string; name: string } | null>(null);
  // Approved creators with TikTok Shop linked get products added straight to their showcase.
  const [linked, setLinked] = useState(false);
  const [live, setLive] = useState<Record<string, Live>>({});
  const asked = useRef(new Set<string>());
  useEffect(() => {
    fetch("/api/tap/showcase", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { linked?: boolean }) => setLinked(!!d.linked))
      .catch(() => {});
  }, []);

  async function addToShowcase(id: string) {
    if ((add[id] ?? "idle") !== "idle") return;
    // Without a linked TikTok Shop the TAP link opens in a new tab: opened inside the click so the browser allows it.
    const tab = linked ? null : window.open("", "_blank");
    setAdd((a) => ({ ...a, [id]: "loading" }));
    try {
      const r = await fetch("/api/tap/showcase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id }) });
      const d = (await r.json().catch(() => ({}))) as { added?: boolean; link?: string; error?: string };
      if (d.added) {
        setAdd((a) => ({ ...a, [id]: "done" }));
        flash("Added to your TikTok Shop showcase");
        return;
      }
      if (!d.link) throw new Error(d.error || "TikTok could not make the link. Please try again.");
      if (tab) tab.location.href = d.link;
      else if (!window.open(d.link, "_blank")) window.location.href = d.link;
      setAdd((a) => ({ ...a, [id]: "done" }));
      flash(d.error ? `${d.error} TikTok Shop opened instead.` : "TikTok Shop opened. Tap Add to showcase there.");
    } catch (err) {
      tab?.close();
      setAdd((a) => ({ ...a, [id]: "idle" }));
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }

  /**
   * Opening a product asks TikTok whether this creator can really get a free sample of it through Techwide's campaign, so the
   * button never offers one TikTok won't give (the catalogue flag is from last night's check). Once per product per visit.
   */
  const checkSample = useCallback((id: string) => {
    if (!linked || asked.current.has(id)) return;
    asked.current.add(id);
    setLive((l) => ({ ...l, [id]: "checking" }));
    fetch(`/api/tap/samples?product=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { state?: Live | null }) => setLive((l) => { const n = { ...l }; if (d.state) n[id] = d.state; else delete n[id]; return n; }))
      .catch(() => setLive((l) => { const n = { ...l }; delete n[id]; return n; }));
  }, [linked]);

  function sampleState(p: TapProduct): SampleUi {
    const s = sample[p.id];
    if (s && s !== "idle") return s;
    const l = live[p.id];
    if (l === "requested") return "done";
    if (l === "available") return "idle";
    if (l === "none" || l === "limit" || l === "checking") return l;
    return p.samples ? "idle" : "none";
  }

  async function requestSample(p: TapProduct) {
    if (sampleState(p) !== "idle") return;
    setSample((s) => ({ ...s, [p.id]: "loading" }));
    try {
      const r = await fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: p.id }) });
      const d = (await r.json().catch(() => ({}))) as { error?: string; deeplink?: string; phoneUrl?: string; addedToShowcase?: boolean };
      if (!r.ok || !d.deeplink || !d.phoneUrl) throw new Error(d.error || "TikTok didn't open the sample request. Please try again.");
      setSample((s) => ({ ...s, [p.id]: "done" }));
      if (d.addedToShowcase) setAdd((a) => ({ ...a, [p.id]: "done" }));
      // A phone has the TikTok app: go straight to TikTok's sample request page. A computer gets a QR code for the phone.
      if (window.matchMedia("(pointer: coarse)").matches) window.location.href = d.deeplink;
      else setQr({ url: d.phoneUrl, name: p.name });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setSample((s) => ({ ...s, [p.id]: "idle" }));
      // TikTok said no while asking: show that on the button too.
      if (/doesn't offer|out of stock|no free samples/i.test(text)) setLive((l) => ({ ...l, [p.id]: "none" }));
      else if (/already requested/i.test(text)) setLive((l) => ({ ...l, [p.id]: "requested" }));
      else if (/limit/i.test(text)) setLive((l) => ({ ...l, [p.id]: "limit" }));
      flash(text, false);
    }
  }

  return {
    addState: (id: string): Flow => add[id] ?? "idle",
    sampleState,
    checkSample,
    addToShowcase,
    requestSample,
    toast,
    linked,
    qr,
    closeQr: () => setQr(null),
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

/** Request sample on a computer: scan with the phone to finish in the TikTok app (TikTok's sample page is app-only). */
export function SampleSheet({ qr, onClose }: { qr: { url: string; name: string } | null; onClose: () => void }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!qr) return;
    let live = true;
    QRCode.toString(qr.url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(""));
    return () => {
      live = false;
    };
  }, [qr]);
  if (!qr) return null;
  return (
    <>
      <button type="button" aria-label="Close" className="nv-dim" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="mkqrt" className="nv-qr">
        <h3 id="mkqrt" style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>Finish on your phone</h3>
        <p style={{ margin: 0, fontSize: 15, color: "var(--body)", lineHeight: 1.5 }}>
          TikTok&apos;s sample request opens in the TikTok app. Scan this with your phone&apos;s camera, then tap Submit in TikTok for <strong>{qr.name}</strong>.
        </p>
        <div className="nv-qr-code" aria-label="QR code that opens the sample request on your phone" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>The request uses Techwide&apos;s campaign sample budget. Its status shows in My Samples.</p>
        <button type="button" className="nv-btn2 nv-press" onClick={onClose}>Done</button>
      </div>
    </>
  );
}
