"use client";

import { SUPPORT } from "@/lib/support";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Tip } from "@/components/ui";
import { AddressFields } from "@/components/account/address-fields";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { Otp } from "@/components/creator1/otp";
import { MY_STATES, isEmail, tidyPhone } from "@/lib/mock-creator1";
import { REFERRAL_REWARD } from "@/lib/mock";
import { NICHES } from "@/lib/mock-creator2";
import { EMPTY_ADDRESS, addressOk, birthdayError, saveAddress, saveSignup, type Address } from "@/lib/address";
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
 * TikTok ask one screen. Owner, 29 Oct 2026: sign-up asks everything her Profile needs (name, birthday, gender, state, WhatsApp,
 * creator type, niches) so there's nothing to fill in after joining; the delivery address is optional here and only required
 * for the Rate Card. Password sign-in and Forgot password are here too. Sample only: any code works.
 */
export default function SignIn() {
  const router = useRouter();
  const { toast } = useDemo();
  const [step, setStep] = useState<Step>("start");
  const [forgotFrom, setForgotFrom] = useState<Step>("password");
  // Sign up first, sign in for people who already have an account (owner, 30 Oct 2026). ?in=1 opens Sign in.
  const [entry, setEntry] = useState<"up" | "in">("up");
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
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  // Came from someone's invite link (owner, 28 Oct 2026): show what the friend gets. The code is kept for sign-up.
  const [refCode, setRefCode] = useState("");
  // Came from the landing checker (owner, 29 Oct 2026): keep the TikTok username she typed.
  const [handle, setHandle] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("in")) setEntry("in");
    const r = q.get("ref");
    if (r) setRefCode(r.toUpperCase().slice(0, 20));
    const u = q.get("u");
    if (u && /^[a-z0-9._]{2,24}$/i.test(u)) setHandle(u.toLowerCase());
  }, []);
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
    setName(PROVIDER[p].who);
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
        <small>e.g. 012-345 6789</small>
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
      {tried && !state ? <small className="cr1-err">Choose your state</small> : <small>Malaysia only. Sellers never see your address.</small>}
    </label>
  );

  const kindField = (
    <div className="v2-field">
      Creator type
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

  const nameField = (
    <label className="v2-field">
      Your name
      <input className="np-input" autoComplete="name" placeholder="e.g. Aisyah Rahman" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} />
      {tried && name.trim().length < 2 ? <small className="cr1-err">Enter your name</small> : <small>As on your IC, for payouts.</small>}
    </label>
  );

  // TikTok Shop affiliates must be 18 or older.
  const today = new Date();
  const maxBirth = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toLocaleDateString("en-CA");
  const bErr = birthdayError(birthday);
  const birthdayField = (
    <label className="v2-field">
      Birthday
      <input className="np-input" type="date" min="1920-01-01" max={maxBirth} value={birthday} onChange={(e) => setBirthday(e.target.value)} aria-invalid={tried && !!bErr} />
      {tried && bErr ? <small className="cr1-err">{bErr}</small> : <small>For birthday rewards and the 18+ check.</small>}
    </label>
  );

  const genderField = (
    <div className="v2-field">
      Gender
      <div className="v2-chips" role="group" aria-label="Gender">
        {["Female", "Male"].map((g) => <button key={g} type="button" className={`v2-chip ${gender === g ? "on" : ""}`} aria-pressed={gender === g} onClick={() => setGender(g)}>{g}</button>)}
      </div>
      {tried && !gender && <small className="cr1-err">Choose one</small>}
    </div>
  );

  const nicheField = (
    <div className="v2-field">
      Your niches
      <div className="v2-chips cr1-kinds" role="group" aria-label="Your niches">
        {NICHES.map((n) => {
          const on = niches.includes(n);
          return (
            <button key={n} type="button" className={`v2-chip ${on ? "on" : ""}`} aria-pressed={on} disabled={!on && niches.length >= 3} onClick={() => setNiches((l) => (on ? l.filter((x) => x !== n) : [...l, n]))}>
              {on && <Icon name="check" size={14} width={3} />}{n}
            </button>
          );
        })}
      </div>
      {tried && !niches.length ? <small className="cr1-err">Pick at least one</small> : <small>Up to 3. The first is your main niche.</small>}
    </div>
  );

  // Optional here; if she starts filling it in, it has to be complete.
  const addrStarted = Object.values(addr).some((v) => v.trim());
  const addrBad = showAddr && addrStarted && !addressOk(addr);
  const addressField = showAddr ? (
    <div className="v2-field">
      <span className="cr1-addr-h">Delivery address <small>· optional</small> <Tip text="Only needed for your Rate Card, so sellers can send products for paid reviews. Free Samples use your TikTok address." /></span>
      <AddressFields value={addr} onChange={setAddr} tried={tried && addrStarted} />
    </div>
  ) : (
    <button type="button" className="cr1-addaddr" onClick={() => setShowAddr(true)}><Icon name="plus" size={16} /> Add delivery address <small>(optional)</small></button>
  );
  const aboutBad = !!bErr || !gender || !niches.length || addrBad;
  const keep = () => {
    saveSignup({ birthday, niches });
    if (addressOk(addr)) saveAddress(addr);
  };

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
          <h1>{entry === "up" ? "Create your account" : "Welcome back"}</h1>
          <p>{entry === "up" ? "Free to join. No minimum followers." : "Sign in to your Rezekii account."}</p>
        </div>
        {refCode && (
          <p className="si-ref">
            <Icon name="gift" size={18} />
            <span>Invited with code <b>{refCode}</b>. Get <b>+{REFERRAL_REWARD.friend} credits</b>: link TikTok Shop and scan within 30 days.</span>
          </p>
        )}
        {handle && (
          <p className="si-ref si-handle">
            <Icon name="scan" size={18} />
            <span>Your scan for <b>@{handle}</b> is one step away. Sign up, then link TikTok Shop to see your rates.</span>
          </p>
        )}
        <button type="button" className={`btn-google cr1-authbtn`} onClick={() => oauth("Google")}><GoogleMark /> {entry === "up" ? "Sign up" : "Sign in"} with Google</button>
        <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")}><TikTokMark /> {entry === "up" ? "Sign up" : "Sign in"} with TikTok</button>
        <button type="button" className="btn-email cr1-authbtn" onClick={() => { setMode(entry === "up" ? "New here" : "I have an account"); go("email"); }}><Icon name="inbox" size={20} /> {entry === "up" ? "Sign up" : "Sign in"} with email</button>
        {entry === "in" && (
          <p className="cr1-center cr1-small">
            Have a password? <button type="button" className="v2-link" onClick={() => go("password")}>Sign in with password</button>
            {" · "}
            <button type="button" className="v2-link" onClick={() => { setForgotFrom("start"); go("forgot"); }}>Forgot password?</button>
          </p>
        )}
        <p className="cr1-center si-switch">
          {entry === "up"
            ? <>Already have an account? <button type="button" className="v2-link" onClick={() => setEntry("in")}>Sign in</button></>
            : <>New to Rezekii? <button type="button" className="v2-link" onClick={() => setEntry("up")}>Create an account</button></>}
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
        <p>Approve in {provider}&apos;s window.</p>
      </div>
    );
  } else if (step === "profile") {
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (name.trim().length < 2 || !state || tel.error || kindError || aboutBad) return;
          keep();
          finish(`Welcome to Rezekii, ${name.trim().split(" ")[0]}`);
        }}
      >
        {back("start")}
        <div className="cr1-who">
          <span className="v2-av">AR</span>
          <span>
            <b>{PROVIDER[provider].who}</b>
            <small>Signed in with {provider} · {provider === "TikTok" && handle ? `@${handle}` : PROVIDER[provider].id}</small>
          </span>
          <Icon name="check" size={18} stroke="#00c073" width={3} />
        </div>
        <div>
          <h1>About You</h1>
          <p className="cr1-sub">Once only. You won&apos;t need to fill this in again.</p>
        </div>
        {nameField}
        <div className="cr1-pair">
          {birthdayField}
          {genderField}
        </div>
        {stateField}
        {phoneField}
        {kindField}
        {nicheField}
        {addressField}
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
          if (isNew && (name.trim().length < 2 || !state || tel.error || kindError || aboutBad)) return;
          if (isNew) keep();
          sendCode(isNew ? "signup" : "signin");
        }}
      >
        {back("start")}
        <h1>{isNew ? "Create your account" : "Sign in with email"}</h1>
        <Seg value={mode} options={["New here", "I have an account"] as const} onChange={(m) => { setMode(m); setTried(false); }} />
        {isNew && nameField}
        {emailField}
        {isNew && birthdayField}
        {isNew && genderField}
        {isNew && stateField}
        {isNew && phoneField}
        {isNew && kindField}
        {isNew && nicheField}
        {isNew && addressField}
        <button type="submit" className="np-btn np-submit">Send code</button>
        {!isNew && (
          <p className="cr1-center cr1-small">
            <button type="button" className="v2-link" onClick={() => go("password")}>Use password</button>
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
            <p>If <b>{email.trim()}</b> has an account, we sent a code.</p>
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
              Valid for 10 minutes.{" "}
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
        <button type="button" className="v2-link cr1-forgot" onClick={() => { setForgotFrom("password"); go("forgot"); }}>Forgot password?</button>
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
        {back(forgotFrom)}
        <h1>Reset your password</h1>
        <p>We&apos;ll email you a 6-digit code. Works for Google and TikTok sign-ups too.</p>
        {emailField}
        <button type="submit" className="np-btn np-submit">Send code</button>
        {/* Still stuck: our team helps recover the account (owner, 30 Oct 2026). */}
        <p className="cr1-center cr1-small">Can&apos;t get in? Email <a className="v2-link" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> and we&apos;ll help you recover your account.</p>
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
          Confirm password
          <input className="np-input" type={showPw ? "text" : "password"} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={tried && !same} />
          {tried && !same && <small className="cr1-err">The two passwords don&apos;t match</small>}
        </label>
        <button type="submit" className="np-btn np-submit">Save and sign in</button>
        <p className="cr1-small">Other devices will be signed out.</p>
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
        <Link href="/" className="rz-back" aria-label="Back to home"><Icon name="back" size={20} /></Link>
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
        <p className="rz-foot">
          Need help? <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
        </p>
      </main>
    </>
  );
}
