"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Preview-only switches, remembered on this device: whether TikTok Shop is linked (to show the blurred state) and a
 * small toast. Nothing is sent anywhere.
 */
type Demo = { linked: boolean; setLinked: (on: boolean) => void; toast: (text: string) => void };
const Ctx = createContext<Demo>({ linked: true, setLinked: () => {}, toast: () => {} });

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [linked, setLinkedState] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("rz2_linked") === "0") setLinkedState(false);
    } catch {}
  }, []);
  const setLinked = useCallback((on: boolean) => {
    setLinkedState(on);
    try {
      localStorage.setItem("rz2_linked", on ? "1" : "0");
    } catch {}
  }, []);
  const toast = useCallback((text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg((m) => (m === text ? null : m)), 2600);
  }, []);
  return (
    <Ctx.Provider value={{ linked, setLinked, toast }}>
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
