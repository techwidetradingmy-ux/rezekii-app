"use client";

import { SUPPORT } from "@/lib/support";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Tip } from "@/components/ui";
import { AddressFields } from "@/components/account/address-fields";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { Otp } from "@/components/creator1/otp";
import { MY_STATES, isEmail, tidyPhone } from "@/lib/mock-creator1";
import { REFERRAL_REWARD, WELCOME_CREDITS } from "@/lib/mock";
import { COUNTRIES, tidyPhone as tidyAnyPhone } from "@/lib/mock-seller";
import { NICHES } from "@/lib/mock-creator2";
import { EMPTY_ADDRESS, addressOk, birthdayError, saveAddress, saveSignup, type Address } from "@/lib/address";
import "../creator1.css";
import { keepInviteCode } from "@/lib/live-rewards";

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

const KINDS = ["TikTok Affiliate", "Shopee Affiliate", "Lazada Affiliate", "Threads Affiliate", "Others"];
const GENDERS = ["Female", "Male", "Others"];

/** A compact dropdown that takes more than one pick (owner, 30 Oct 2026: the chips made sign-up too long). */
function MultiPick({ label, options, value, onChange, max, invalid }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; max?: number; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="su-pick" ref={box}>
      <button type="button" className="np-input su-pick-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid} onClick={() => setOpen((o) => !o)}>
        <span className={value.length ? undefined : "ph"}>{value.length ? value[0] : max ? `Up to ${max}` : "Choose"}</span>
        {value.length > 1 && <em>+{value.length - 1}</em>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="su-pick-list" role="listbox" aria-multiselectable="true" aria-label={label}>
          {options.map((o) => {
            const on = value.includes(o);
            return (
              <button key={o} type="button" role="option" aria-selected={on} disabled={!on && !!max && value.length >= max} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
                <i>{on && <Icon name="check" size={13} width={3.2} />}</i>
                {o}
              </button>
            );
          })}
          <button type="button" className="su-pick-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}

/**
 * Sign up first, then sign in (owner, 30 Oct 2026). Sign-up is its own short page: Google or TikTok on top, or the email
 * form below, in dropdowns so it fits about one screen. Email sign-up confirms the address with a 6-digit code; Google and
 * TikTok skip the code. Signing in stays on the small card and goes straight to the app. Sample only: any code works.
 */
export default function SignIn() {
  const router = useRouter();
  const { toast } = useDemo();
  const [step, setStep] = useState<Step>("start");
  const [forgotFrom, setForgotFrom] = useState<Step>("password");
  // ?in=1 opens Sign in; everything else opens Sign up.
  const [entry, setEntry] = useState<"up" | "in">("up");
  const [provider, setProvider] = useState<keyof typeof PROVIDER>("Google");
  const [purpose, setPurpose] = useState<Purpose>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Country for later markets (owner, 30 Oct 2026). Malaysia picks from its states; others type theirs.
  const [country, setCountry] = useState("MY");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [dial, setDial] = useState("60");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tried, setTried] = useState(false);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<"busy" | "ok" | undefined>();
  const [wait, setWait] = useState(0);
  const [welcome, setWelcome] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [otherKind, setOtherKind] = useState("");
  // Typed as DD/MM/YYYY (owner, 30 Oct 2026); kept as yyyy-mm-dd, or "bad" for a date that doesn't exist.
  const [bdText, setBdText] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  // Came from someone's invite link (owner, 28 Oct 2026): show what the friend gets. The code is kept for sign-up.
  const [refCode, setRefCode] = useState("");
  // No link: she can still type a friend's code (owner, 30 Oct 2026).
  const [typedRef, setTypedRef] = useState("");
  // Came from the landing checker (owner, 29 Oct 2026): keep the TikTok username she typed.
  const [handle, setHandle] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("in")) setEntry("in");
    const r = q.get("ref");
    if (r) setRefCode(r.toUpperCase().slice(0, 20));
    // Came from an invite link through the landing page: the invite is remembered for 14 days.
    else fetch("/api/v2/referral", { cache: "no-store" }).then((x) => x.json()).then((d: { code?: string | null }) => { if (d.code) setRefCode(d.code); }).catch(() => {});
    const u = q.get("u");
    if (u && /^[a-z0-9._]{2,24}$/i.test(u)) setHandle(u.toLowerCase());
    // A real sign-in that didn't finish comes back with ?error=.
    const err = q.get("error");
    if (err) toast(err === "denied" ? "Sign-in was cancelled." : err === "config" ? "This sign-in isn't set up yet." : "Sign-in didn't finish. Please try again.");
  }, []);
  const kindError = !kinds.length ? "Pick at least one" : kinds.includes("Others") && !otherKind.trim() ? "Tell us which one" : "";

  const tel = (() => {
    if (dial === "60") return tidyPhone(phone);
    const r = tidyAnyPhone(phone, dial);
    return { pretty: r.ok ? r.pretty.replace(`+${dial} `, "") : phone, e164: r.ok ? r.pretty : "", error: r.ok ? null : phone.trim() ? r.error ?? "Check the number" : "Enter your WhatsApp number" };
  })();
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

  async function oauth(p: keyof typeof PROVIDER) {
    // A friend's code typed here is kept for the new account (owner, 31 Oct 2026); a wrong code stops so it can be fixed.
    if (typedRef && !refCode) {
      try {
        await keepInviteCode(typedRef, "creator");
      } catch {
        toast("We couldn't find that referral code. Check it, or leave it empty.");
        return;
      }
    }
    setProvider(p);
    setStep("oauth");
    // Real sign-in (owner, 30 Oct 2026): Google or TikTok, then back into the app with a session.
    window.location.href = p === "Google" ? "/api/auth/google/start" : "/api/auth/tiktok/start";
  }

  function typeBirthday(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    setBdText(d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
    if (d.length < 8) return setBirthday("");
    const [dd, mm, yy] = [Number(d.slice(0, 2)), Number(d.slice(2, 4)), Number(d.slice(4))];
    const real = new Date(yy, mm - 1, dd);
    setBirthday(real.getFullYear() === yy && real.getMonth() === mm - 1 && real.getDate() === dd ? `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : "bad");
  }

  const nameField = (
    <label className="v2-field">
      Full name
      <input className="np-input" autoComplete="name" placeholder="Your real name, for verification" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} />
      {tried && name.trim().length < 2 && <small className="cr1-err">Enter your name</small>}
    </label>
  );

  const emailField = (
    <label className="v2-field">
      Email
      <input className="np-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && !isEmail(email)} />
      {tried && !isEmail(email) && <small className="cr1-err">Enter an email like you@example.com</small>}
    </label>
  );

  const countryField = (
    <label className="v2-field">
      Country
      <select
        className="np-input cr1-select"
        autoComplete="country"
        value={country}
        onChange={(e) => {
          const c = COUNTRIES.find((x) => x.code === e.target.value);
          setCountry(e.target.value);
          setState("");
          if (c) setDial(c.dial);
          setPhoneTouched(false);
        }}
      >
        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
    </label>
  );

  const stateField = (
    <label className="v2-field">
      State
      {country === "MY" ? (
        <select className="np-input cr1-select" value={state} onChange={(e) => setState(e.target.value)} aria-invalid={tried && !state}>
          <option value="">Choose</option>
          {Object.entries(MY_STATES).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          ))}
        </select>
      ) : (
        <input className="np-input" autoComplete="address-level1" placeholder="State / Province" value={state} onChange={(e) => setState(e.target.value)} aria-invalid={tried && !state.trim()} />
      )}
      {tried && !state.trim() && <small className="cr1-err">Choose your state</small>}
    </label>
  );

  const phoneField = (
    <label className="v2-field">
      WhatsApp number
      <span className="cr1-phone">
        <select aria-label="Country code" value={dial} onChange={(e) => { setDial(e.target.value); setPhoneTouched(false); }}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.code} +{c.dial}</option>)}
        </select>
        <input
          className="np-input"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={dial === "60" ? "12-345 6789" : "Phone number"}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => {
            setPhoneTouched(true);
            if (!tel.error) setPhone(tel.pretty);
          }}
          aria-invalid={(phoneTouched || tried) && !!tel.error}
        />
      </span>
      {(phoneTouched || tried) && tel.error && <small className="cr1-err">{tel.error}</small>}
    </label>
  );

  // TikTok Shop affiliates must be 18 or older.
  const bErr = bdText && !birthday ? "Use DD/MM/YYYY" : birthdayError(birthday);
  const birthdayField = (
    <label className="v2-field">
      Birthday
      <input className="np-input" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/YYYY" maxLength={10} value={bdText} onChange={(e) => typeBirthday(e.target.value)} aria-invalid={tried && !!bErr} />
      {tried && bErr && <small className="cr1-err">{bErr}</small>}
    </label>
  );

  const genderField = (
    <label className="v2-field">
      Gender
      <select className="np-input cr1-select" value={gender} onChange={(e) => setGender(e.target.value)} aria-invalid={tried && !gender}>
        <option value="">Choose</option>
        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      {tried && !gender && <small className="cr1-err">Choose one</small>}
    </label>
  );

  const kindField = (
    <div className="v2-field">
      Creator type
      <MultiPick label="Creator type" options={KINDS} value={kinds} onChange={setKinds} invalid={tried && !!kindError} />
      {kinds.includes("Others") && (
        <input className="np-input" placeholder="Which one?" value={otherKind} onChange={(e) => setOtherKind(e.target.value)} aria-label="Other kind of creator" aria-invalid={tried && !otherKind.trim()} />
      )}
      {tried && kindError && <small className="cr1-err">{kindError}</small>}
    </div>
  );

  const nicheField = (
    <div className="v2-field">
      Niches
      <MultiPick label="Niches" options={NICHES} value={niches} onChange={setNiches} max={3} invalid={tried && !niches.length} />
      {tried && !niches.length && <small className="cr1-err">Pick at least one</small>}
    </div>
  );

  // Referral code (owner, 30 Oct 2026): from a friend's invite link it's filled in and can't be changed.
  const refField = (
    <label className="v2-field">
      <span>Referral code{!refCode && <small className="su-opt"> · optional</small>}</span>
      {refCode ? (
        <span className="su-ref">
          <input className="np-input" value={refCode} readOnly aria-readonly="true" aria-describedby="su-ref-note" />
          <Icon name="lock" size={16} />
        </span>
      ) : (
        <input className="np-input" placeholder="Friend's code" autoCapitalize="characters" value={typedRef} onChange={(e) => setTypedRef(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} />
      )}
      {refCode && <small id="su-ref-note" className="cr1-okline"><Icon name="gift" size={14} width={2.4} /> From your friend&apos;s invite: +{REFERRAL_REWARD.friend} credits once you link TikTok Shop</small>}
    </label>
  );

  // Optional here; if she starts filling it in, it has to be complete.
  const addrStarted = Object.values(addr).some((v) => v.trim());
  const addrBad = showAddr && addrStarted && !addressOk(addr);
  const addressField = showAddr ? (
    <div className="v2-field">
      <span className="cr1-addr-h">Sample delivery address <small>· optional</small> <Tip text="Where sellers send your free samples. You can add or change it later in My Account." /></span>
      <AddressFields value={addr} onChange={setAddr} tried={tried && addrStarted} />
    </div>
  ) : (
    <button type="button" className="cr1-addaddr" onClick={() => setShowAddr(true)}><Icon name="plus" size={16} /> Add sample delivery address <small>(optional)</small></button>
  );
  const signupBad = name.trim().length < 2 || !state.trim() || !!tel.error || !!kindError || !!bErr || !gender || !niches.length || addrBad;
  const keep = () => {
    saveSignup({ birthday, niches });
    if (addressOk(addr)) saveAddress(addr);
  };

  const back = (to: Step, label = "Back") => (
    <button type="button" className="cr1-back" onClick={() => go(to)}><Icon name="back" size={18} /> {label}</button>
  );

  const codeView = (
    <>
      <span className="cr1-mail"><Icon name="inbox" size={28} /></span>
      <div className="cr1-center">
        <h1>{purpose === "reset" ? "Check your email" : "Enter the code"}</h1>
        {purpose === "reset" ? (
          <p>If <b>{email.trim()}</b> has an account, we sent a code.</p>
        ) : purpose === "signup" ? (
          <p>We sent a 6-digit code to <b>{email.trim()}</b> to confirm it&apos;s your email.</p>
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
    </>
  );

  // Sign-up is a page of its own, not the floating card (owner, 30 Oct 2026).
  const linked = step === "profile";
  if (entry === "up" && (step === "start" || step === "oauth" || linked || (step === "code" && purpose === "signup"))) {
    const unlink = () => {
      setName("");
      go("start");
    };
    return (
      <>
        <DemoStrip />
        <main className="su-page">
          <header className="su-top">
            {linked ? (
              <button type="button" className="su-back" onClick={unlink} aria-label="Back"><Icon name="back" size={20} /></button>
            ) : step === "code" ? (
              <button type="button" className="su-back" onClick={() => go("start")} aria-label="Change email"><Icon name="back" size={20} /></button>
            ) : (
              <Link href="/" className="su-back" aria-label="Back to home"><Icon name="back" size={20} /></Link>
            )}
            <Link href="/" className="su-brand">
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} />
              Rezekii
            </Link>
          </header>
          {step === "code" ? (
            <div key="code" className="cr1-form su-body su-code">{codeView}</div>
          ) : (
            <form
              className="cr1-form su-body"
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (signupBad || (!linked && !isEmail(email))) return;
                keep();
                if (linked) finish(`Welcome to Rezekii, ${name.trim().split(" ")[0]}`);
                else sendCode("signup");
              }}
            >
              <div className="su-head">
                <h1>Create your account</h1>
                <p>Free to join. No minimum followers.</p>
                {/* Every new account gets free credits to try multi-app posting (owner, 30 Oct 2026). */}
                <span className="su-gift"><Icon name="gift" size={15} width={2.4} /> +{WELCOME_CREDITS} free credits to try Post Everywhere</span>
              </div>
              {handle && (
                <p className="si-ref si-handle">
                  <Icon name="scan" size={18} />
                  <span>Your scan for <b>@{handle}</b> is one step away. Sign up, then link TikTok Shop to see your rates.</span>
                </p>
              )}
              {linked ? (
                <div className="cr1-who">
                  <span className="v2-av">AR</span>
                  <span>
                    <b>{PROVIDER[provider].who}</b>
                    <small>{provider} · {provider === "TikTok" && handle ? `@${handle}` : PROVIDER[provider].id}</small>
                  </span>
                  <Icon name="check" size={18} stroke="#00c073" width={3} />
                </div>
              ) : (
                <>
                  <div className="su-social">
                    <button type="button" className="btn-google cr1-authbtn" onClick={() => oauth("Google")} aria-label="Sign up with Google"><GoogleMark /> Google</button>
                    <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")} aria-label="Sign up with TikTok"><TikTokMark /> TikTok</button>
                  </div>
                  <p className="su-or"><span>or sign up with email</span></p>
                </>
              )}
              {nameField}
              {!linked && emailField}
              <div className="cr1-pair">
                {countryField}
                {stateField}
              </div>
              {phoneField}
              <div className="cr1-pair">
                {birthdayField}
                {genderField}
              </div>
              <div className="cr1-pair su-picks">
                {kindField}
                {nicheField}
              </div>
              {refField}
              {addressField}
              <button type="submit" className="np-btn np-submit">Create account</button>
              <p className="cr1-center si-switch">
                Already have an account? <button type="button" className="v2-link" onClick={() => { setEntry("in"); go("start"); }}>Sign in</button>
              </p>
              <p className="cr1-center cr1-fine">By continuing you agree to Rezekii&apos;s Terms of Service and Privacy Policy.</p>
            </form>
          )}
          {step === "oauth" && (
            <div className="su-wait" role="status">
              <div className="cr1-wait">
                <span className="cr1-provider">{provider === "Google" ? <GoogleMark /> : <TikTokMark size={26} />}</span>
                <span className="cr1-spin" aria-hidden="true" />
                <b>Signing up with {provider}…</b>
                <p>Approve in {provider}&apos;s window.</p>
              </div>
            </div>
          )}
        </main>
      </>
    );
  }

  let card: React.ReactNode;
  if (step === "start") {
    card = (
      <>
        <div className="cr1-center">
          <h1>Welcome back</h1>
          <p>Sign in to your Rezekii account.</p>
        </div>
        <button type="button" className={`btn-google cr1-authbtn`} onClick={() => oauth("Google")}><GoogleMark /> Sign in with Google</button>
        <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")}><TikTokMark /> Sign in with TikTok</button>
        <button type="button" className="btn-email cr1-authbtn" onClick={() => go("email")}><Icon name="inbox" size={20} /> Sign in with email</button>
        <p className="cr1-center cr1-small">
          Have a password? <button type="button" className="v2-link" onClick={() => go("password")}>Sign in with password</button>
          {" · "}
          <button type="button" className="v2-link" onClick={() => { setForgotFrom("start"); go("forgot"); }}>Forgot password?</button>
        </p>
        <p className="cr1-center si-switch">
          New to Rezekii? <button type="button" className="v2-link" onClick={() => { setEntry("up"); go("start"); }}>Create an account</button>
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
  } else if (step === "email") {
    card = (
      <form
        className="cr1-form"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (!isEmail(email)) return;
          sendCode("signin");
        }}
      >
        {back("start")}
        <h1>Sign in with email</h1>
        {emailField}
        <button type="submit" className="np-btn np-submit">Send code</button>
        <p className="cr1-center cr1-small">
          <button type="button" className="v2-link" onClick={() => go("password")}>Use password</button>
        </p>
      </form>
    );
  } else if (step === "code") {
    card = (
      <div className="cr1-form">
        {back(purpose === "reset" ? "forgot" : "email", purpose === "reset" ? "Back" : "Change email")}
        {codeView}
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
          No password yet? <button type="button" className="v2-link" onClick={() => go("email")}>Get a code by email</button>
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
        {welcome.startsWith("Welcome to Rezekii") && <span className="su-gift"><Icon name="gift" size={15} width={2.4} /> +{WELCOME_CREDITS} credits added to try Post Everywhere</span>}
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
