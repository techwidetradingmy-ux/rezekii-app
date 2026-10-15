"use client";

import { useState, type FormEvent } from "react";

type Which = "email" | "password";
type Props = { email: string | null; has: boolean; googleEmail: string | null; tiktok: string | null; onDone: (message: string) => void };

/**
 * Sign-in & security on Account (owner's pick C, 15 Oct 2026): the ways this account signs in, then email and password side
 * by side. Email sign-in is added with an email and a password; after that each one changes on its own, with the current
 * password. An account that also signs in with Google keeps its Google email.
 */
export function SignInSecurity({ email, has, googleEmail, tiktok, onDone }: Props) {
  const [busy, setBusy] = useState<Which | null>(null);
  const [error, setError] = useState<{ which: Which; text: string } | null>(null);
  const emailLocked = has && !!googleEmail;

  async function send(which: Which, form: HTMLFormElement, body: Record<string, unknown>, done: string) {
    if (busy) return;
    setBusy(which);
    setError(null);
    try {
      const r = await fetch("/api/account/email-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const x = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(x.error || "Something went wrong. Please try again.");
      form.reset();
      onDone(done);
    } catch (err) {
      setError({ which, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  function saveEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (has) return void send("email", e.currentTarget, { email: f.get("email"), current: f.get("current") }, "Email changed");
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("again") ?? "")) return setError({ which: "email", text: "The two passwords don't match." });
    void send("email", e.currentTarget, { email: f.get("email"), password }, "You can now sign in with email too");
  }

  function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("again") ?? "")) return setError({ which: "password", text: "The two passwords don't match." });
    void send("password", e.currentTarget, { password, current: f.get("current") }, "Password changed");
  }

  const way = (label: string, value: string | null, on: boolean) => (
    <div className="ac-way">
      <b>{label}</b>
      <span>{value ?? "Not added"}</span>
      <span className={`nv-badge ${on ? "b-green" : "b-gray"}`}>{on ? "On" : "Off"}</span>
    </div>
  );

  return (
    <section className="nv-up nv-card ac-sig" aria-labelledby="acsig" style={{ animationDelay: "170ms" }}>
      <div className="ac-sig-head">
        <h2 id="acsig" className="nv-h2">Sign-in &amp; security</h2>
        <span>Each way below opens this same account, with the same TikTok Shop link and data.</span>
      </div>
      <div className="ac-ways">
        {way("TikTok", tiktok, !!tiktok)}
        {way("Email", has ? email : null, has)}
        {googleEmail && way("Google", googleEmail, true)}
      </div>
      <div className="ac-sig-grid">
        <form className="ac-sig-card" onSubmit={saveEmail}>
          <h3>{has ? "Email" : "Add email sign-in"}</h3>
          <span className="ac-note">
            {emailLocked ? `You sign in with ${email}, your Google email. It changes with your Google account.` : has ? `You sign in with ${email}. Change it here.` : "Add an email and password to sign in without TikTok. You can still sign in the way you do now."}
          </span>
          {!emailLocked && (
            <>
              <label className="ac-f">
                {has ? "New email" : "Email"}
                <input name="email" type="email" className="nv-input" required readOnly={!!googleEmail} defaultValue={googleEmail ?? ""} placeholder="you@example.com" autoComplete="email" />
              </label>
              {has ? (
                <label className="ac-f">
                  Your password
                  <input name="current" type="password" className="nv-input" required autoComplete="current-password" />
                </label>
              ) : (
                <>
                  <label className="ac-f">
                    Password
                    <input name="password" type="password" className="nv-input" required minLength={8} maxLength={128} placeholder="At least 8 characters" autoComplete="new-password" />
                  </label>
                  <label className="ac-f">
                    Type it again
                    <input name="again" type="password" className="nv-input" required minLength={8} maxLength={128} autoComplete="new-password" />
                  </label>
                </>
              )}
              {error?.which === "email" && <span role="alert" className="ac-err">{error.text}</span>}
              <button type="submit" className="nv-btn nv-press" disabled={busy === "email"}>{busy === "email" ? "Saving…" : has ? "Change email" : "Add email sign-in"}</button>
            </>
          )}
        </form>

        <form className={`ac-sig-card ${has ? "" : "ac-off"}`} onSubmit={savePassword}>
          <h3>Password</h3>
          <span className="ac-note">{has ? "Change the password you use with your email." : "Add email sign-in first."}</span>
          <fieldset disabled={!has} className="ac-fs">
            <label className="ac-f">
              Current password
              <input name="current" type="password" className="nv-input" required autoComplete="current-password" />
            </label>
            <label className="ac-f">
              New password
              <input name="password" type="password" className="nv-input" required minLength={8} maxLength={128} placeholder="At least 8 characters" autoComplete="new-password" />
            </label>
            <label className="ac-f">
              Type it again
              <input name="again" type="password" className="nv-input" required minLength={8} maxLength={128} autoComplete="new-password" />
            </label>
            {error?.which === "password" && <span role="alert" className="ac-err">{error.text}</span>}
            <button type="submit" className="nv-btn nv-press" disabled={busy === "password"}>{busy === "password" ? "Saving…" : "Change password"}</button>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
