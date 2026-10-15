"use client";

import { useState, type FormEvent } from "react";

const field = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 700, color: "var(--body)" } as const;
const input = { height: 38, background: "var(--surface)", border: "1.5px solid var(--border)", fontSize: 14 } as const;

/**
 * Sign in with email too (owner, 15 Oct 2026): a creator account made with TikTok (or anything else) can add an email and
 * password and still sign in as before, or change the password. An account that also signs in with Google keeps that email.
 */
export function EmailLogin({ email, has, googleEmail, onDone }: { email: string | null; has: boolean; googleEmail: string | null; onDone: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("again") ?? "")) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/account/email-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: f.get("email"), password, current: f.get("current") ?? "" }) });
      const x = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(x.error || "Something went wrong. Please try again.");
      setOpen(false);
      onDone(has ? "Password changed" : "You can now sign in with email too");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => { setError(""); setOpen(true); }}>{has ? "Change password" : "Add email and password"}</button>
      {open && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setOpen(false)} />
          <form className="nv-alert" role="dialog" aria-modal="true" aria-labelledby="acpw" onSubmit={save}>
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
              <span id="acpw" style={{ fontSize: 17, fontWeight: 700, textAlign: "center" }}>{has ? "Change your password" : "Sign in with email too"}</span>
              <span style={{ fontSize: 13, lineHeight: 1.45, textAlign: "center" }}>
                {has ? "Enter your current password, then the new one." : "Add an email and password to this account. You can still sign in the way you do now."}
              </span>
              <label style={field}>
                Email
                <input name="email" type="email" className="nv-input" style={input} defaultValue={googleEmail ?? email ?? ""} readOnly={!!googleEmail} required autoComplete="email" />
              </label>
              {googleEmail && <small style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>This account signs in with Google, so it keeps your Google email.</small>}
              {has && (
                <label style={field}>
                  Current password
                  <input name="current" type="password" className="nv-input" style={input} required autoComplete="current-password" />
                </label>
              )}
              <label style={field}>
                {has ? "New password" : "Password"}
                <input name="password" type="password" className="nv-input" style={input} minLength={8} maxLength={128} required autoComplete="new-password" />
              </label>
              <label style={field}>
                Type it again
                <input name="again" type="password" className="nv-input" style={input} minLength={8} maxLength={128} required autoComplete="new-password" />
              </label>
              <small style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>At least 8 characters.</small>
              {error && <span role="alert" style={{ fontSize: 13, color: "var(--red)", fontWeight: 700 }}>{error}</span>}
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={busy} style={{ opacity: busy ? 0.4 : 1, fontWeight: 700 }}>{busy ? "…" : "Save"}</button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
