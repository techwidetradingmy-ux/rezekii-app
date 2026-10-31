"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { addOne } from "@/lib/live";

/** Products added in this visit, so the same product shows Added on every page. */
const ADDED = new Set<string>();
const listeners = new Set<() => void>();
const markAdded = (id: string) => {
  ADDED.add(id);
  listeners.forEach((l) => l());
};

/**
 * One Add button everywhere (owner, 1 Nov 2026, option A): green, "+ Add" → "Adding…" → "✓ Added"; an error puts it back.
 * Tapped on a product that's already in her showcase, it says so ("Already in your showcase"); it isn't marked anywhere else.
 * `inShowcase` is for the sample account only; signed in, the server knows.
 */
export function AddButton({ id, name, rate, size = "md", label = "Add", inShowcase = false, className = "" }: {
  id: string; name: string; rate?: number | null; size?: "sm" | "md" | "lg"; label?: string; inShowcase?: boolean; className?: string;
}) {
  const { linked, setLinked, live, toast } = useDemo();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  useEffect(() => {
    const sync = () => { if (ADDED.has(id)) setState("done"); };
    sync();
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, [id]);
  const done = (already: boolean) => {
    markAdded(id);
    setState("done");
    toast(already ? `Already in your showcase${rate ? ` · now at ${rate}% through Rezekii` : ""}` : `Added${rate ? ` at ${rate}%` : ""}: ${name}`);
  };
  const add = async () => {
    if (state !== "idle") return;
    if (!linked) return setLinked(true);
    if (!live) return done(inShowcase);
    setState("busy");
    const r = await addOne(id);
    if (r.added) return done(!!r.already);
    setState("idle");
    // Not approved for direct adds yet: TikTok's own page opens to add it there.
    if (r.link) window.open(r.link, "_blank", "noopener");
    else toast(r.error ?? "TikTok Shop didn't add it. Please try again.");
  };
  return (
    <button
      type="button"
      className={`rz-add ${size} ${state} ${className}`.trim()}
      disabled={state !== "idle"}
      aria-busy={state === "busy"}
      aria-label={state === "done" ? `${name} added to your showcase` : `Add ${name} to your showcase`}
      onClick={add}
    >
      {state === "busy" ? <><span className="rz-add-spin" aria-hidden="true" /> Adding…</> : state === "done" ? <><Icon name="check" size={size === "lg" ? 18 : 15} width={2.8} /> Added</> : <><Icon name="plus" size={size === "lg" ? 18 : 15} width={2.8} /> {label}</>}
    </button>
  );
}
