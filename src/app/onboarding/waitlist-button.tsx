"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";

/** "Join the waitlist" while every TikTok Shop place is taken. */
export function WaitlistButton() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function join() {
    setBusy(true);
    const r = await fetch("/api/creator/waitlist", { method: "POST" });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) setError(d.error ? t(d.error) : t("Couldn't join the waitlist. Try again."));
    router.refresh();
  }
  return (
    <>
      <button type="button" className="nv-btn nv-press nv-cta ob-big" onClick={join} disabled={busy} style={{ background: "var(--asoft)", color: "var(--amber)" }}>
        {busy ? t("Joining…") : t("Join the waitlist")}
      </button>
      {error && <p role="alert" className="ob-note" style={{ margin: 0, background: "var(--rsoft)", color: "var(--red)" }}>{error}</p>}
    </>
  );
}
