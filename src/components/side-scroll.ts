"use client";

import { useEffect, type RefObject } from "react";

/**
 * A sideways row (sub-menu, account tabs) that a mouse can scroll too (owner, 28 Oct 2026: rows felt stuck with no scrollbar).
 * The open item scrolls into view, the wheel scrolls sideways, a mouse drag scrolls it, and `more-right` marks hidden items.
 * Touch scrolling is left to the browser.
 */
export function useSideScroll(ref: RefObject<HTMLElement | null>, key: unknown, active = ".on") {
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    row.querySelector<HTMLElement>(active)?.scrollIntoView({ block: "nearest", inline: "center" });
    const wheel = (e: WheelEvent) => {
      if (row.scrollWidth <= row.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    };
    let startX = 0, startLeft = 0, dragging = false, moved = false;
    const down = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; dragging = true; moved = false; startX = e.clientX; startLeft = row.scrollLeft; };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - startX; if (Math.abs(dx) > 4) moved = true; row.scrollLeft = startLeft - dx; };
    const up = () => { dragging = false; };
    const click = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const edges = () => row.classList.toggle("more-right", row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
    edges();
    row.addEventListener("wheel", wheel, { passive: false });
    row.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    row.addEventListener("click", click, true);
    row.addEventListener("scroll", edges);
    window.addEventListener("resize", edges);
    return () => {
      row.removeEventListener("wheel", wheel);
      row.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      row.removeEventListener("click", click, true);
      row.removeEventListener("scroll", edges);
      window.removeEventListener("resize", edges);
    };
  }, [ref, key, active]);
}
