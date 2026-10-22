"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import { tx } from "@/lib/i18n/lang.ts";

/** "Continue with email": sign in, or create a creator account, with an email and password. */
export function EmailSignin() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, email: f.get("email"), password: f.get("password"), name: f.get("name") }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error || tx("Could not sign in. Please try again."));
      window.location.href = "/app";
    } catch (err) {
      setError(t(err instanceof Error ? err.message : String(err)));
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" className="btn-email signin-btn" onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
        {t("Continue with email")}
      </button>
    );

  return (
    <form className="email-signin" onSubmit={submit}>
      <div className="np-seg" role="tablist" aria-label={t("Email")}>
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>{t("Sign in")}</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(""); }}>{t("Create account")}</button>
      </div>
      {mode === "signup" && (
        <label>
          <span>{t("Your name")}</span>
          <input className="np-input" name="name" autoComplete="name" maxLength={60} />
        </label>
      )}
      <label>
        <span>{t("Email")}</span>
        <input className="np-input" name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>{t("Password")}</span>
        <input className="np-input" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required />
        {mode === "signup" && <small>{t("At least 8 characters.")}</small>}
      </label>
      {error && <p className="np-error" role="alert">{error}</p>}
      <button type="submit" className="np-btn" disabled={busy}>{busy ? t("Please wait…") : mode === "signup" ? t("Create account") : t("Sign in")}</button>
    </form>
  );
}
