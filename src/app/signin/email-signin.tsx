"use client";

import { useState } from "react";

/** "Continue with email": sign in, or create a creator account, with an email and password. */
export function EmailSignin() {
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
      if (!r.ok) throw new Error(d.error || "Could not sign in. Please try again.");
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" className="btn-email signin-btn" onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></svg>
        Continue with email
      </button>
    );

  return (
    <form className="email-signin" onSubmit={submit}>
      <div className="np-seg" role="tablist" aria-label="Email">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
      </div>
      {mode === "signup" && (
        <label>
          <span>Your name</span>
          <input className="np-input" name="name" autoComplete="name" maxLength={60} />
        </label>
      )}
      <label>
        <span>Email</span>
        <input className="np-input" name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Password</span>
        <input className="np-input" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required />
        {mode === "signup" && <small>At least 8 characters.</small>}
      </label>
      {error && <p className="np-error" role="alert">{error}</p>}
      <button type="submit" className="np-btn" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
  );
}
