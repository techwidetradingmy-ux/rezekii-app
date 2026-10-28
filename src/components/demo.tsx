"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Role = "creator" | "seller";
/** Who agreed to what and when, kept as evidence (the real one also stores IP, device and TikTok's grant id). */
export type Consent = { role: Role; at: string; terms: string; privacy: string; unlinkedAt?: string };

/**
 * Preview-only switches, remembered on this device: whether TikTok Shop is linked (to show the blurred state), the consent
 * given before linking, and a small toast. Linking without a consent on record asks for it first. Nothing is sent anywhere.
 */
type Demo = {
  linked: boolean;
  setLinked: (on: boolean) => void;
  toast: (text: string) => void;
  consent: Consent | null;
  recordConsent: (role: Role) => void;
  asking: Role | null;
  agree: () => void;
  cancelLink: () => void;
};
const Ctx = createContext<Demo>({ linked: true, setLinked: () => {}, toast: () => {}, consent: null, recordConsent: () => {}, asking: null, agree: () => {}, cancelLink: () => {} });

const now = () => new Date().toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
/** Aisyah agreed when she linked during sign-up. */
const FIRST: Consent = { role: "creator", at: "3 Mar 2026, 10:24 pm", terms: "1.0", privacy: "1.0" };

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [linked, setLinkedState] = useState(true);
  const [consent, setConsent] = useState<Consent | null>(FIRST);
  const [asking, setAsking] = useState<Role | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("rz2_linked") === "0") setLinkedState(false);
      const saved = localStorage.getItem("rz2_consent");
      if (saved) setConsent(saved === "none" ? null : (JSON.parse(saved) as Consent));
    } catch {}
  }, []);

  const save = (c: Consent | null) => {
    setConsent(c);
    try {
      localStorage.setItem("rz2_consent", c ? JSON.stringify(c) : "none");
    } catch {}
  };
  const store = (on: boolean) => {
    setLinkedState(on);
    try {
      localStorage.setItem("rz2_linked", on ? "1" : "0");
    } catch {}
  };

  const toast = useCallback((text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg((m) => (m === text ? null : m)), 2600);
  }, []);
  const recordConsent = (role: Role) => save({ role, at: now(), terms: "1.0", privacy: "1.0" });

  // Linking needs a live consent; unlinking withdraws it, so linking again asks again.
  const setLinked = (on: boolean) => {
    if (on && (!consent || consent.unlinkedAt)) return setAsking("creator");
    if (!on && consent && !consent.unlinkedAt) save({ ...consent, unlinkedAt: now() });
    store(on);
  };
  const agree = () => {
    recordConsent(asking ?? "creator");
    setAsking(null);
    store(true);
    toast("TikTok Shop linked. Your consent is saved in My account.");
  };

  return (
    <Ctx.Provider value={{ linked, setLinked, toast, consent, recordConsent, asking, agree, cancelLink: () => setAsking(null) }}>
      {children}
      {msg && (
        <div role="status" className="v2-toast">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useDemo = () => useContext(Ctx);
