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
import { MY_STATES, isEmail, tidyPhone } from "@/lib/mock-creator1";
import { REFERRAL_REWARD, WELCOME_CREDITS } from "@/lib/mock";
import { COUNTRIES, tidyPhone as tidyAnyPhone } from "@/lib/mock-seller";
import { DIAL_OPTIONS } from "@/lib/countries";
import { NICHES } from "@/lib/mock-creator2";
import { EMPTY_ADDRESS, addressOk, birthdayError, saveAddress, saveSignup, type Address } from "@/lib/address";
import "../creator1.css";
import { keepInviteCode, saveProfile } from "@/lib/live-rewards";

type Step = "start" | "oauth" | "profile" | "email" | "password" | "create" | "forgot" | "verify" | "code" | "reset" | "welcome";

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
  const { toast, me } = useDemo();
  const [step, setStep] = useState<Step>("start");
  // Signed up with Google or TikTok: the same form once, to fill in the details those skip (owner, 31 Oct 2026).
  const [details, setDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forgotFrom, setForgotFrom] = useState<Step>("password");
  // ?in=1 opens Sign in; everything else opens Sign up.
  const [provider, setProvider] = useState<keyof typeof PROVIDER>("Google");
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
  // The 6-digit code from the email (owner, 31 Oct 2026: confirm a new account, sign in without a password, reset it).
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  // Continue with email (owner, 31 Oct 2026): what the email already has, and where to go after (e.g. /seller/connect).
  const [acct, setAcct] = useState<{ password: boolean; google: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<string | null>(null);
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
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    if (q.get("details")) {
      setStep("profile");
      setDetails(true);
    }
    const r = q.get("ref");
    if (r) setRefCode(r.toUpperCase().slice(0, 20));
    // Came from an invite link through the landing page: the invite is remembered for 14 days.
    else fetch("/api/v2/referral", { cache: "no-store" }).then((x) => x.json()).then((d: { code?: string | null }) => { if (d.code) setRefCode(d.code); }).catch(() => {});
    const u = q.get("u");
    if (u && /^[a-z0-9._]{2,24}$/i.test(u)) setHandle(u.toLowerCase());
    // A real sign-in that didn't finish comes back with ?error=.
    const err = q.get("error");
    if (err) toast(err === "denied" ? "Sign-in was cancelled." : err === "config" ? "This sign-in isn't set up yet." : err === "taken" ? "That TikTok account is already connected to another Rezekii account." : "Sign-in didn't finish. Please try again.");
  }, []);
  // Her name from Google or TikTok, ready to change.
  useEffect(() => {
    if (details && me?.name) setName((n) => n || me.name || "");
  }, [details, me]);
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

  function finish(line: string) {
    setWelcome(line);
    setStep("welcome");
    window.setTimeout(() => router.push("/app"), 1400);
  }

  /** Saves the sign-up details to her profile (and a friend's code she typed), then into the app. */
  async function saveDetails() {
    setSaving(true);
    try {
      if (typedRef && !refCode) {
        const r = await fetch("/api/v2/referral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: typedRef, side: "creator", join: true }) });
        if (!r.ok) {
          toast("We couldn't find that referral code. Check it, or leave it empty.");
          return;
        }
      }
      await saveProfile("creator", {
        name: name.trim(), birthday, country, state: state.trim(), whatsapp: tel.e164.replace(/\s/g, ""), gender,
        types: kinds.map((k) => (k === "Others" ? `Others: ${otherKind.trim()}` : k)), niches,
      });
      keep();
      finish(`Welcome to Rezekii, ${name.trim().split(" ")[0]}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function emailCall(body: Record<string, string>): Promise<{ exists?: boolean; password?: boolean; google?: boolean; details?: boolean }> {
    const r = await fetch("/api/auth/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { error?: string }).error ?? "That didn't work. Please try again.");
    return d;
  }
  // Signed in: the sign-up details first when they're missing (not when she came to do something else, like connect a shop).
  const land = (details?: boolean) => { window.location.href = details && !next ? "/signin?details=1" : next ?? "/app"; };
  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : "That didn't work. Please try again."); } finally { setBusy(false); }
  }
  const checkEmail = () => withBusy(async () => {
    const d = await emailCall({ mode: "check", email });
    setAcct({ password: !!d.password, google: !!d.google });
    setPw("");
    go(d.exists ? "password" : "create");
  });
  const signInEmail = () => withBusy(async () => land((await emailCall({ mode: "signin", email, password: pw })).details));
  const signUpEmail = () => withBusy(async () => { await emailCall({ mode: "signup", email, password: pw, name: name.trim(), code }); land(true); });
  /** Emails a code for `purpose`, then shows the step that asks for it. */
  const sendCode = (purpose: "signup" | "signin" | "reset", then: Step) => withBusy(async () => {
    await emailCall({ mode: "code", email, purpose });
    setCode("");
    toast(`Code sent to ${email.trim()}`);
    go(then);
  });
  const signInCode = () => withBusy(async () => land((await emailCall({ mode: "signin", email, code })).details));
  const resetPassword = () => withBusy(async () => land((await emailCall({ mode: "reset", email, code, password: pw })).details));

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
    const q = next ? `?next=${encodeURIComponent(next)}` : "";
    window.location.href = `${p === "Google" ? "/api/auth/google/start" : "/api/auth/tiktok/start"}${q}`;
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
          {DIAL_OPTIONS.map((o) => <option key={o.dial} value={o.dial}>{o.label}</option>)}
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

  // Sign-up is a page of its own, not the floating card (owner, 30 Oct 2026).
  const linked = step === "profile";
  if (linked) {
    const unlink = () => {
      // Signed up with Google or TikTok but not finished: going back signs out.
      if (details) {
        fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/signin"; });
        return;
      }
      setName("");
      go("start");
    };
    return (
      <>
        <DemoStrip />
        <main className="su-page">
          <header className="su-top">
            <button type="button" className="su-back" onClick={unlink} aria-label="Back"><Icon name="back" size={20} /></button>
            <Link href="/" className="su-brand">
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} />
              Rezekii
            </Link>
          </header>
          {(
            <form
              className="cr1-form su-body"
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (signupBad) return;
                if (details) return void saveDetails();
                keep();
                finish(`Welcome to Rezekii, ${name.trim().split(" ")[0]}`);
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
              {linked && details ? (
                <div className="cr1-who">
                  {me?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="v2-av" src={me.photo} alt="" />
                  ) : <span className="v2-av">{(me?.name ?? "?").slice(0, 2).toUpperCase()}</span>}
                  <span>
                    <b>{me?.name ?? "Your account"}</b>
                    <small>{me?.email ?? (me?.handle ? `@${me.handle}` : "Signed in")}</small>
                  </span>
                  <Icon name="check" size={18} stroke="#00c073" width={3} />
                </div>
              ) : linked ? (
                <div className="cr1-who">
                  <span className="v2-av">AR</span>
                  <span>
                    <b>{PROVIDER[provider].who}</b>
                    <small>{provider} · {provider === "TikTok" && handle ? `@${handle}` : PROVIDER[provider].id}</small>
                  </span>
                  <Icon name="check" size={18} stroke="#00c073" width={3} />
                </div>
              ) : null}
              {nameField}
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
              <button type="submit" className="np-btn np-submit" disabled={saving}>{saving ? "Saving…" : "Create account"}</button>
              <p className="cr1-center cr1-fine">By continuing you agree to Rezekii&apos;s Terms of Service and Privacy Policy.</p>
            </form>
          )}
        </main>
      </>
    );
  }

  const newPw = step === "create" || step === "reset";
  const codeField = (
    <label className="v2-field">
      6-digit code
      <input className="np-input cr1-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={tried && code.length !== 6} autoFocus />
      {tried && code.length !== 6 && <small className="cr1-err">Enter the 6 digits from the email</small>}
    </label>
  );
  const again = (purpose: "signup" | "signin" | "reset") => (
    <button type="button" className="v2-link cr1-forgot" disabled={busy} onClick={() => void sendCode(purpose, step)}>Send a new code</button>
  );
  const sentTo = <p>We sent a 6-digit code to <b>{email.trim()}</b>. It works for 10 minutes.</p>;
  let card: React.ReactNode;
  if (step === "start") {
    // One way in for everyone (owner, 31 Oct 2026): new people are asked for their details after, returning people go straight in.
    card = (
      <>
        <div className="cr1-center">
          <h1>Welcome to Rezekii</h1>
          <p>Sign in or create your account.</p>
        </div>
        <button type="button" className="btn-google cr1-authbtn" onClick={() => oauth("Google")}><GoogleMark /> Continue with Google</button>
        <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")}><TikTokMark /> Continue with TikTok</button>
        <button type="button" className="btn-email cr1-authbtn" onClick={() => go("email")}><Icon name="inbox" size={20} /> Continue with email</button>
        <p className="cr1-center cr1-fine">By continuing you agree to Rezekii&apos;s <a className="v2-link" href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> and <a className="v2-link" href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
      </>
    );
  } else if (step === "oauth") {
    card = (
      <div className="cr1-wait">
        <span className="cr1-provider">{provider === "Google" ? <GoogleMark /> : <TikTokMark size={26} />}</span>
        <span className="cr1-spin" aria-hidden="true" />
        <b>Continuing with {provider}…</b>
        <p>Approve in {provider}&apos;s window.</p>
      </div>
    );
  } else if (step === "email") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (isEmail(email)) void checkEmail(); }}>
        {back("start")}
        <h1>Continue with email</h1>
        {emailField}
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Continue"}</button>
      </form>
    );
  } else if (step === "password") {
    card = acct?.google && !acct.password ? (
      <div className="cr1-form">
        {back("email")}
        <h1>Use Google for this email</h1>
        <p><b>{email.trim()}</b> signs in with Google.</p>
        <button type="button" className="btn-google cr1-authbtn" onClick={() => oauth("Google")}><GoogleMark /> Continue with Google</button>
        <button type="button" className="v2-link" disabled={busy} onClick={() => void sendCode("signin", "code")}>Or email me a sign-in code</button>
      </div>
    ) : (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (pw) void signInEmail(); }}>
        {back("email")}
        <h1>Welcome back</h1>
        <p className="cr1-small" style={{ margin: 0 }}><b>{email.trim()}</b> · <button type="button" className="v2-link" onClick={() => go("email")}>Change</button></p>
        <label className="v2-field">
          Password
          <span className="cr1-pw">
            <input className="np-input" type={showPw ? "text" : "password"} autoComplete={newPw ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && (newPw ? pw.length < 8 : !pw)} />
            <button type="button" onClick={() => setShowPw((x) => !x)} aria-label={showPw ? "Hide password" : "Show password"}><Icon name="eye" size={18} /></button>
          </span>
          {newPw ? <small className={pw.length >= 8 ? "cr1-okline" : tried ? "cr1-err" : undefined}>At least 8 characters</small> : tried && !pw ? <small className="cr1-err">Enter your password</small> : null}
        </label>
        <button type="button" className="v2-link cr1-forgot" onClick={() => { setForgotFrom("password"); go("forgot"); }}>Forgot password?</button>
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Sign in"}</button>
        <button type="button" className="v2-link" disabled={busy} onClick={() => void sendCode("signin", "code")}>Email me a sign-in code instead</button>
      </form>
    );
  } else if (step === "create") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (name.trim().length >= 2 && pw.length >= 8) void sendCode("signup", "verify"); }}>
        {back("email")}
        <h1>Create your account</h1>
        <p className="cr1-small" style={{ margin: 0 }}><b>{email.trim()}</b> · <button type="button" className="v2-link" onClick={() => go("email")}>Change</button></p>
        {nameField}
        <label className="v2-field">
          Password
          <span className="cr1-pw">
            <input className="np-input" type={showPw ? "text" : "password"} autoComplete={newPw ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && (newPw ? pw.length < 8 : !pw)} />
            <button type="button" onClick={() => setShowPw((x) => !x)} aria-label={showPw ? "Hide password" : "Show password"}><Icon name="eye" size={18} /></button>
          </span>
          {newPw ? <small className={pw.length >= 8 ? "cr1-okline" : tried ? "cr1-err" : undefined}>At least 8 characters</small> : tried && !pw ? <small className="cr1-err">Enter your password</small> : null}
        </label>
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Create account"}</button>
      </form>
    );
  } else if (step === "verify") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (code.length === 6) void signUpEmail(); }}>
        {back("create")}
        <h1>Check your email</h1>
        {sentTo}
        {codeField}
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Create account"}</button>
        {again("signup")}
      </form>
    );
  } else if (step === "code") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (code.length === 6) void signInCode(); }}>
        {back("password")}
        <h1>Check your email</h1>
        {sentTo}
        {codeField}
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Sign in"}</button>
        {again("signin")}
      </form>
    );
  } else if (step === "forgot") {
    // A reset code by email (owner, 31 Oct 2026), then a new password.
    card = (
      <div className="cr1-form">
        {back(forgotFrom)}
        <h1>Reset your password</h1>
        <p>We&apos;ll email a 6-digit code to <b>{email.trim()}</b>. Then you choose a new password.</p>
        <button type="button" className="np-btn np-submit" disabled={busy} onClick={() => void sendCode("reset", "reset")}>{busy ? <span className="cr1-spin sm" /> : "Send code"}</button>
        <p className="cr1-small" style={{ margin: 0 }}>No access to this email? Write to <a className="v2-link" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>.</p>
      </div>
    );
  } else if (step === "reset") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (code.length === 6 && pw.length >= 8) void resetPassword(); }}>
        {back("forgot")}
        <h1>Choose a new password</h1>
        {sentTo}
        {codeField}
        <label className="v2-field">
          New password
          <span className="cr1-pw">
            <input className="np-input" type={showPw ? "text" : "password"} autoComplete={newPw ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && (newPw ? pw.length < 8 : !pw)} />
            <button type="button" onClick={() => setShowPw((x) => !x)} aria-label={showPw ? "Hide password" : "Show password"}><Icon name="eye" size={18} /></button>
          </span>
          {newPw ? <small className={pw.length >= 8 ? "cr1-okline" : tried ? "cr1-err" : undefined}>At least 8 characters</small> : tried && !pw ? <small className="cr1-err">Enter your password</small> : null}
        </label>
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : "Save and sign in"}</button>
        {again("reset")}
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
