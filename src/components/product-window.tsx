"use client";

import "@/app/product-window.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "./icons";
import { Portal } from "./ui";

/**
 * Product window (owner, 29 Oct 2026): a product opens in a floating window over the page you were on, so closing it (X, a tap
 * outside, Esc or Back) leaves that page exactly as it was: same scroll, same open sections. A product link opened directly
 * still shows the full page. Each app's @modal slot puts the product page in here.
 */
export function ProductWindow({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    window.addEventListener("keydown", key);
    return () => {
      html.style.overflow = was;
      window.removeEventListener("keydown", key);
    };
  }, [router]);

  return (
    <Portal>
      <div className="pw" role="dialog" aria-modal="true" aria-label="Product">
        <button type="button" className="pw-dim" aria-label="Close" tabIndex={-1} onClick={() => router.back()} />
        <div className="pw-panel" ref={panel} tabIndex={-1}>
          <button type="button" className="pw-x" aria-label="Close" onClick={() => router.back()}><Icon name="x" size={20} width={2.4} /></button>
          {children}
        </div>
      </div>
    </Portal>
  );
}
