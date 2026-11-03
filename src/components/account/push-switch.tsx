"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import { setSoundOn, soundOn } from "@/lib/note-chime";

/** This device's Phone Notifications: on, off, blocked in the browser, not possible in this browser, or iPhone/iPad outside the Home Screen. */
type State = "on" | "off" | "blocked" | "unsupported" | "ios";
const STATUS: Record<State, string> = {
  on: tx("On for this device"),
  off: tx("Off for this device"),
  blocked: tx("Blocked. Allow it in your browser settings."),
  unsupported: tx("Not supported on this browser."),
  ios: tx("Works on iOS 16.4 or later once Rezekii is on your Home Screen (Share → Add to Home Screen)."),
};
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** The public signing key as bytes, for the browser's push subscription. */
function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Which account this device's Phone Notifications were last saved for. */
const PUSH_OWNER = "rz_push_owner";
const setOwner = (id: string | null | undefined) => { try { if (id) localStorage.setItem(PUSH_OWNER, id); else localStorage.removeItem(PUSH_OWNER); } catch {} };

/**
 * Phone Notifications follow the account in use on this device (owner, 4 Nov 2026): after switching accounts, a device
 * that has them on moves them to the account now in use, once.
 */
export function useFollowPush(side: "creator" | "seller" | null, userId: string | undefined) {
  useEffect(() => {
    if (!side || !userId || typeof Notification === "undefined" || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
    let owner: string | null = null;
    try { owner = localStorage.getItem(PUSH_OWNER); } catch {}
    if (owner === userId) return;
    navigator.serviceWorker.getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) return;
        const r = await fetch("/api/v2/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side, subscription: sub.toJSON() }) });
        if (r.ok) setOwner(userId);
      })
      .catch(() => {});
  }, [side, userId]);
}

async function detect(): Promise<State> {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const home = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  if (ios && !home) return "ios";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !KEY) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const sub = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/**
 * Phone Notifications and Sound in Settings (owner, 3 Nov 2026), for this device. Turning notifications on asks the browser,
 * starts the service worker (public/sw.js) and saves the device; Sound is the in-app chime, kept on this device only.
 */
export function PushSwitch({ side }: { side: "creator" | "seller" }) {
  const { live, toast, me } = useDemo();
  const t = useT();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState<boolean | null>(null);
  useEffect(() => {
    if (!live) return;
    setSound(soundOn());
    detect().then(setState, () => setState("unsupported"));
  }, [live]);
  if (!live) return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      // Asked first, straight from the tap: iPhone only asks from a tap.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, no) => setTimeout(() => no(new Error("timeout")), 15_000))]);
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const r = await fetch("/api/v2/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side, subscription: sub.toJSON() }) });
      if (!r.ok) {
        await sub.unsubscribe().catch(() => false);
        throw new Error("not saved");
      }
      setOwner(me?.id);
      setState("on");
    } catch {
      toast(t("Couldn't turn on phone notifications. Please try again."));
      setState(await detect().catch(() => "unsupported" as const));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const r = await fetch("/api/v2/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        if (!r.ok) throw new Error("not saved");
        await sub.unsubscribe();
      }
      await reg?.unregister();
      setOwner(null);
      setState("off");
    } catch {
      toast(t("Couldn't turn off phone notifications. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const row = side === "seller" ? "sl-set np-switchrow" : "cr2-cell np-switchrow";
  const can = state === "on" || state === "off";
  const rows = (
    <>
      <div className={row}>
        <span style={{ flex: 1 }}>
          <b>{side === "seller" ? t("Notifications") : t("Phone Notifications")}</b>
          {state && <small>{t(STATUS[state])}</small>}
        </span>
        {state !== "ios" && state !== "unsupported" && (
          <button
            type="button"
            role="switch"
            aria-checked={state === "on"}
            aria-label={t("Phone Notifications")}
            className={`np-switch ${state === "on" ? "on" : ""}`}
            style={state === "blocked" ? { opacity: 0.45 } : undefined}
            disabled={busy || !can}
            onClick={() => void (state === "on" ? turnOff() : turnOn())}
          >
            <span />
          </button>
        )}
      </div>
      <div className={row}>
        <span style={{ flex: 1 }}>
          <b>{t("Sound")}</b>
          <small>{t("A soft chime for new notifications")}</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={sound === true}
          aria-label={t("Sound")}
          className={`np-switch ${sound ? "on" : ""}`}
          disabled={sound === null}
          onClick={() => { setSoundOn(!sound); setSound(!sound); }}
        >
          <span />
        </button>
      </div>
    </>
  );
  return side === "seller" ? (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Phone Notifications")}</h2>
      <div>{rows}</div>
    </section>
  ) : (
    <div className="cr2-cells">{rows}</div>
  );
}
