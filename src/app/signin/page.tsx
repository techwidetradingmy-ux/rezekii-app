"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg } from "@/components/ui";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { Otp } from "@/components/creator1/otp";
import { MY_STATES, isEmail, tidyPhone } from "@/lib/mock-creator1";
import "../creator1.css";

type Step = "start" | "oauth" | "profile" | "email" | "code" | "password" | "forgot" | "newpass" | "welcome";
type Purpose = "signup" | "signin" | "reset";

const TILES: [React.CSSProperties, string, string, string, string][] = [
  [{ top: "14%", left: "8%" }, "#fe2c55", "#ffffff", "-10deg", "M4 5h16v14H4zM10 9l5 3-5 3z"],
  [{ top: "11%", right: "10%" }, "#ffc700", "#3b2a00", "12deg", "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M10 20.5h.01M17 20.5h.01"],
  [{ bottom: "16%", left: "7%" }, "#00c073", "#ffffff", "8deg", "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
  [{ bottom: "14%", right: "8%" }, "#0d1117", "#25f4ee", "-8deg", "M12 12h.01M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"],
  [{ top: "46%", left: "3%" }, "#25c8f4", "#ffffff", "6deg", "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
];

const PROVIDER = {
  Google: { who: "Aisyah Rahman", id: "aisyah.rahman@gmail.com" },
  TikTok: { who: "Aisyah Rahman", id: "@aisyah.glow" },
};

/**
 * Sign in or sign up (blueprint 7.2/7.3): Google, TikTok or email. Email sign-up is one form plus a 6-digit code; Google and
 * TikTok ask one small screen (state, WhatsApp). Password sign-in and Forgot password are here too. Sample only: any code works.
 */
export default function SignIn() {
  const router = useRouter();
  const { toast } = useDemo();
  const [step, setStep] = useState<Step>("start");
  const [provider, setProvider] = useState<keyof typeof PROVIDER>("Google");
  const [mode, setMode] = useState<"New here" | "I have an account">("New here");
  const [purpose, setPurpose] = useState<Purpose>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tried, setTried] = useState(false);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"busy" | "ok" | undefined>();
  const [wait, setWait] = useState(0);
  const [welcome, setWelcome] = useState("");
  // Owner, 28 Oct 2026: which kind of affiliate creator they are, picked at sign-up. More than one is fine.
  const [kinds, setKinds] = useState<string[]>([]);
  const [otherKind, setOtherKind] = useState("");
  const kindError = !kinds.length ? "Pick at least one" : kinds.includes("Others") && !otherKind.trim() ? "Tell us which one" : "";

  const tel = tidyPhone(phone);
  const go = (s: Step) => {
    setTried(false);
    setStep(s);
  };

  // Resend is allowed once a minute.
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  // A full code checks itself.
  useEffect(() => {
    if (step !== "code" || !/^\d{6}$/.test(code) || codeState) return;
    setCodeState("busy");
    const a = window.setTimeout(() => setCodeState("ok"), 700);
    const b = window.setTimeout(() => {
      if (purpose === "reset") {
        setCode("");
        setCodeState(undefined);
        setPw("");
        setPw2("");
        go("newpass");
      } else finish(purpose === "signup" ? `Welcome to Rezekii, ${name.trim().split(" ")[0] || "Aisyah"}` : "Welcome back, Aisyah");
    }, 1300);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  function finish(line: string) {
    setWelcome(line);
    setStep("welcome");
    window.setTimeout(() => router.push("/app"), 1400);
  }

  function sendCode(p: Purpose) {
    setPurpose(p);
    setCode("");
    setCodeState(undefined);
    setWait(60);
    go("code");
  }

  function oauth(p: keyof typeof PROVIDER) {
    setProvider(p);
    setStep("oauth");
    window.setTimeout(() => setStep("profile"), 1100);
  }

  const phoneField = (
    <label className="v2-field">
      WhatsApp number
      <span className="cr1-phone">
        <span>+60</span>
        <input
          className="np-input"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="12-345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => {
            setPhoneTouched(true);
            if (!tel.error) setPhone(tel.pretty);
          }}
          aria-invalid={(phoneTouched || tried) && !!tel.error}
        />
      </span>
      {(phoneTouched || tried) && tel.error ? (
        <small className="cr1-err">{tel.error}</small>
      ) : !tel.error ? (
        <small className="cr1-okline"><Icon name="check" size={14} width={3} /> Saved as {tel.e164}</small>
      ) : (
        <small>Malaysian mobile, e.g. 012-345 6789. Only the Techwide team sees it.</small>
      )}
    </label>
  );

  const stateField = (
    <label className="v2-field">
      State
      <select className="np-input cr1-select" value={state} onChange={(e) => setState(e.target.value)} aria-invalid={tried && !state}>
        <option value="">Choose your state</option>
        {Object.entries(MY_STATES).map(([group, list]) => (
          <optgroup key={group} label={group}>
            {list.map((s) => <option key={s} value={s}>{s}</option>)}
          </optgroup>
        ))}
      </select>
      {tried && !state ? <small className="cr1-err">Choose your state</small> : <small>Malaysia only for now. Sellers see your state, never your address.</small>}
    </label>
  );

  const kindField = (
    <div className="v2-field">
      What kind of creator are you?
      <div className="v2-chips cr1-kinds" role="group" aria-label="Kind of creator">
        {["TikTok Affiliate", "Shopee Affiliate", "Threads Affiliate", "Others"].map((k) => {
          const on = kinds.includes(k);
          return (
            <button key={k} type="button" className={`v2-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setKinds((l) => (on ? l.filter((x) => x !== k) : [...l, k]))}>
              {on && <Icon name="check" size={14} width={3} />}{k}
            </button>
          );
        })}
      </div>
      {kinds.includes("Others") && (
        <input className="np-input" placeholder="e.g. Lazada Affiliate, UGC creator" value={otherKind} onChange={(e) => setOtherKind(e.target.value)} aria-label="Other kind of creator" aria-invalid={tried && !otherKind.trim()} />
      )}
      {tried && kindError ? <small className="cr1-err">{kindError}</small> : <small>Pick all that fit.</small>}
    </div>
  );

  const emailField = (
    <label className="v2-field">
      Email
      <input className="np-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && !isEmail(email)} />
      {tried && !isEmail(email) && <small className="cr1-err">Enter an email like you@example.com</small>}
    </label>
  );

  const back = (to: Step, label = "Back") => (
    <button type="button" className="cr1-back" onClick={() => go(to)}><Icon name="back" size={18} /> {label}</button>
  );

  let card: React.ReactNode;
  if (step === "start") {
    card = (
      <>
        <div className="cr1-center">
          <h1>Sign in to Rezekii</h1>
          <p>New or returning, it&apos;s the same buttons. Free for TikTok Shop creators.</p>
        </div>
        <button type="button" className={`btn-google cr1-authbtn`} onClick={() => oauth("Google")}><GoogleMark /> Continue with Google</button>
        <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")}><TikTokMark /> Continue with TikTok</button>
        <button type="button" className="btn-email cr1-authbtn" onClick={() => { setMode("New here"); go("email"); }}><Icon name="inbox" size={20} /> Continue with email</button>
        <p className="cr1-center cr1-small">
          Have a password? <button type="button" className="v2-link" onClick={() => go("password")}>Sign in with password</button>
        </p>
        <p className="cr1-center cr1-fine">By continuing you agree to Rezekii&apos;s Terms of Service and Privacy Policy.</p>
      </>
    );
  } else if (step === "oauth") {
    card = (
      <div className="cr1-wait">
        <span className="cr1-provider">{provider === "Google" ? <GoogleMark /> : <TikTokMark size={26} />}</span>
        <span className="cr1-spin" aria-hidden="true" />
        <b>Signing in with {provider}…</b>
        <p>You approve it in {provider}&apos;s own window.</p>
      </div>
    );
  } else if (step === "profile") {
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!state || tel.error || kindError) return;
          finish(`Welcome to Rezekii, ${PROVIDER[provider].who.split(" ")[0]}`);
        }}
      >
        {back("start")}
        <div className="cr1-who">
          <span className="v2-av">AR</span>
          <span>
            <b>{PROVIDER[provider].who}</b>
            <small>Signed in with {provider} · {PROVIDER[provider].id}</small>
          </span>
          <Icon name="check" size={18} stroke="#00c073" width={3} />
        </div>
        <div>
          <h1>One more thing</h1>
          <p>Three quick details and you&apos;re in.</p>
        </div>
        {kindField}
        {stateField}
        {phoneField}
        <button type="submit" className="np-btn np-submit">Continue <Icon name="arrow" size={18} /></button>
      </form>
    );
  } else if (step === "email") {
    const isNew = mode === "New here";
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!isEmail(email)) return;
          if (isNew && (name.trim().length < 2 || !state || tel.error || kindError)) return;
          sendCode(isNew ? "signup" : "signin");
        }}
      >
        {back("start")}
        <h1>{isNew ? "Create your account" : "Sign in with email"}</h1>
        <Seg value={mode} options={["New here", "I have an account"] as const} onChange={(m) => { setMode(m); setTried(false); }} />
        {isNew && (
          <label className="v2-field">
            Your name
            <input className="np-input" autoComplete="name" placeholder="e.g. Aisyah Rahman" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} />
            {tried && name.trim().length < 2 ? <small className="cr1-err">Enter your name</small> : <small>Shown in the app and on invites. You can change it later.</small>}
          </label>
        )}
        {emailField}
        {isNew && kindField}
        {isNew && stateField}
        {isNew && phoneField}
        <button type="submit" className="np-btn np-submit">Send me a code</button>
        {!isNew && (
          <p className="cr1-center cr1-small">
            <button type="button" className="v2-link" onClick={() => go("password")}>Use my password instead</button>
          </p>
        )}
      </form>
    );
  } else if (step === "code") {
    card = (
      <div className="cr1-form">
        {back(purpose === "reset" ? "forgot" : "email", purpose === "reset" ? "Back" : "Change email")}
        <span className="cr1-mail"><Icon name="inbox" size={28} /></span>
        <div className="cr1-center">
          <h1>{purpose === "reset" ? "Check your email" : "Enter the code"}</h1>
          {purpose === "reset" ? (
            <p>If <b>{email.trim()}</b> has an account, we&apos;ve sent a 6-digit code to it.</p>
          ) : (
            <p>We sent a code to <b>{email.trim()}</b>.</p>
          )}
        </div>
        <Otp value={code} onChange={setCode} state={codeState} />
        <div className="cr1-center cr1-small" aria-live="polite">
          {codeState === "busy" ? (
            <span className="cr1-inline"><span className="cr1-spin sm" aria-hidden="true" /> Checking…</span>
          ) : codeState === "ok" ? (
            <span className="cr1-inline cr1-okline"><Icon name="check" size={16} width={3} /> Code accepted</span>
          ) : (
            <>
              The code works for 10 minutes.{" "}
              {wait > 0 ? (
                <span>Resend in {wait}s</span>
              ) : (
                <button type="button" className="v2-link" onClick={() => { setWait(60); toast("New code sent"); }}>Resend code</button>
              )}
            </>
          )}
        </div>
        <p className="cr1-center cr1-fine">Preview: any 6 digits work.</p>
      </div>
    );
  } else if (step === "password") {
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!isEmail(email) || !pw) return;
          finish("Welcome back, Aisyah");
        }}
      >
        {back("start")}
        <h1>Sign in with password</h1>
        {emailField}
        <label className="v2-field">
          Password
          <span className="cr1-pw">
            <input className="np-input" type={showPw ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && !pw} />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}><Icon name="eye" size={18} /></button>
          </span>
          {tried && !pw && <small className="cr1-err">Enter your password</small>}
        </label>
        <button type="button" className="v2-link cr1-forgot" onClick={() => go("forgot")}>Forgot password?</button>
        <button type="submit" className="np-btn np-submit">Sign in</button>
        <p className="cr1-center cr1-small">
          No password yet? <button type="button" className="v2-link" onClick={() => { setMode("I have an account"); go("email"); }}>Get a code by email</button>
        </p>
      </form>
    );
  } else if (step === "forgot") {
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!isEmail(email)) return;
          sendCode("reset");
        }}
      >
        {back("password")}
        <h1>Reset your password</h1>
        <p>Enter your email and we&apos;ll send a 6-digit code. This also works if you signed up with Google or TikTok and never set a password.</p>
        {emailField}
        <button type="submit" className="np-btn np-submit">Send code</button>
      </form>
    );
  } else if (step === "newpass") {
    const long = pw.length >= 8;
    const same = pw === pw2;
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!long || !same) return;
          toast("Password changed. Other devices were signed out.");
          finish("You're signed in");
        }}
      >
        <h1>Set a new password</h1>
        <label className="v2-field">
          New password
          <span className="cr1-pw">
            <input className="np-input" type={showPw ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && !long} />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}><Icon name="eye" size={18} /></button>
          </span>
          <small className={long ? "cr1-okline" : tried ? "cr1-err" : undefined}>
            {long ? <><Icon name="check" size={14} width={3} /> At least 8 characters</> : `At least 8 characters (${pw.length} so far)`}
          </small>
        </label>
        <label className="v2-field">
          Type it again
          <input className="np-input" type={showPw ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={tried && !same} />
          {tried && !same && <small className="cr1-err">The two passwords don&apos;t match</small>}
        </label>
        <button type="submit" className="np-btn np-submit">Save and sign in</button>
        <p className="cr1-small">We&apos;ll sign you out on other devices and email you that your password changed.</p>
      </form>
    );
  } else {
    card = (
      <div className="cr1-wait">
        <span className="v2-medal green cr1-welcome"><Icon name="check" size={40} width={2.6} /></span>
        <b>{welcome}</b>
        <p>Opening your app…</p>
      </div>
    );
  }

  return (
    <>
      <DemoStrip />
      <main className="rz-splash cr1-splash">
        <div className="rz-tiles" aria-hidden="true">
          {TILES.map(([pos, bg, fg, rot, d], i) => (
            <span key={i} className="rz-tile" style={{ ...pos, animationDelay: `${-i * 0.7}s` }}>
              <span style={{ background: bg, transform: `rotate(${rot})` }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              </span>
            </span>
          ))}
        </div>
        <Link href="/" className="rz-logo-wrap" aria-label="Rezekii home">
          <span className="rz-ripple" aria-hidden="true" />
          <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-1s" }} />
          <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-2s" }} />
          <span className="rz-logo">
            <Image src="/master-logo-transparent.png" alt="Rezekii" width={64} height={64} priority />
          </span>
        </Link>
        <p className="rz-name">Rezekii</p>
        <p className="rz-tag">CONNECTING AFFILIATES</p>
        <div key={step} className="rz-card cr1-auth">{card}</div>
        <div className="cr1-authnote">
          <Icon name="link" size={18} />
          <span>TikTok Shop is linked inside the app, after you sign in. Signing in with TikTok is not the same as linking TikTok Shop.</span>
        </div>
        <p className="rz-foot">
          <Link href="/">Back to home</Link> · <a href="mailto:support@rezekii.com">support@rezekii.com</a>
        </p>
      </main>
    </>
  );
}
