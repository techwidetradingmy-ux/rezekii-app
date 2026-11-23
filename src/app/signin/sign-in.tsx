"use client";

import { SUPPORT } from "@/lib/support";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DemoStrip } from "@/components/shell";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Tip } from "@/components/ui";
import { AddressFields } from "@/components/account/address-fields";
import { PickList } from "@/components/pick-list";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { NotYet } from "@/components/not-yet";
import { OPEN } from "@/lib/platforms";
import { Rich } from "@/components/landing/bits";
import { MY_STATES, isEmail, tidyPhone } from "@/lib/mock-creator1";
import { REFERRAL_REWARD } from "@/lib/mock";
import { COUNTRIES, tidyPhone as tidyAnyPhone } from "@/lib/mock-seller";
import { DIAL_OPTIONS, RACES } from "@/lib/countries";
import { NICHES } from "@/lib/mock-creator2";
import { EMPTY_ADDRESS, addressOk, birthdayError, saveAddress, saveSignup, type Address } from "@/lib/address";
import { LangSwitch, useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx } from "@/lib/i18n/lang";
import "../creator1.css";
import { keepInviteCode, saveProfile } from "@/lib/live-rewards";
import { signOut } from "@/lib/sign-out";

type Step = "start" | "oauth" | "profile" | "email" | "create" | "reset" | "welcome" | "handed";

/**
 * The Home Screen app keeps its own sign-in, apart from the phone's browser (owner, 3 Nov 2026: it opened signed out each time,
 * and Google asked for the password again). There, Google and TikTok open in the browser with a one-time code, and the app
 * claims the sign-in when it's done (see modules/accounts/handoff.ts).
 */
const HANDOFF_KEY = "rz_handoff";
const HANDOFF_MS = 10 * 60_000;
const homeScreenApp = () => {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; }
};
/**
 * Asks the browser to save her email and password once they've worked (owner, 23 Nov 2026: "remember password"), where it can
 * (Chrome and Edge); other browsers offer to save from the form itself. Never stops the sign-in.
 */
async function rememberPassword(email: string, password: string): Promise<void> {
  try {
    const Cred = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name?: string }) => Credential }).PasswordCredential;
    if (Cred && navigator.credentials?.store) await navigator.credentials.store(new Cred({ id: email.trim(), password, name: email.trim() }));
  } catch {}
}
const startPath = (p: "Google" | "TikTok") => (p === "Google" ? "/api/auth/google/start" : "/api/auth/tiktok/start");

/**
 * Six icons around the card, three a side, on phones too (owner, 2 Nov 2026): video, cart, earnings, Marketplace, LIVE and
 * link. [position, background, icon colour, tilt, icon path]
 */
const TILES: [React.CSSProperties, string, string, string, string][] = [
  [{ top: "13%", left: "6%" }, "#fe2c55", "#ffffff", "-10deg", "M4 5h16v14H4zM10 9l5 3-5 3z"],
  [{ top: "10%", right: "8%" }, "#ffc700", "#3b2a00", "12deg", "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M10 20.5h.01M17 20.5h.01"],
  [{ top: "25%", left: "3%" }, "#00c073", "#ffffff", "8deg", "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M6.5 10v4M17.5 10v4"],
  [{ top: "23%", right: "3%" }, "#7c5cff", "#ffffff", "-8deg", "M4 10v10h16V10M3 10l2-6h14l2 6zM3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5"],
  [{ bottom: "3%", left: "9%" }, "#0d1117", "#25f4ee", "-8deg", "M12 12h.01M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"],
  [{ bottom: "4%", right: "10%" }, "#25c8f4", "#ffffff", "6deg", "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
];

const PROVIDER = {
  Google: { who: "Aisyah Rahman", id: "aisyah.rahman@gmail.com" },
  TikTok: { who: "Aisyah Rahman", id: "@aisyah.glow" },
};

const KINDS = [tx("TikTok Affiliate"), tx("Shopee Affiliate"), tx("Lazada Affiliate"), tx("Threads Affiliate"), tx("Others")];
const GENDERS = [tx("Female"), tx("Male"), tx("Others")];

/** The language switch top right of the sign-in card, level with the back button (owner, 3 Nov 2026: visitors pick too). */
const LANG_SPOT: React.CSSProperties = { position: "absolute", top: 16, right: 14, zIndex: 3 };

/**
 * Sign up first, then sign in (owner, 30 Oct 2026). Sign-up is its own short page: Google or TikTok on top, or the email
 * form below, in dropdowns so it fits about one screen. Email sign-up confirms the address with a 6-digit code; Google and
 * TikTok skip the code. Signing in stays on the small card and goes straight to the app. Sample only: any code works.
 * In English, Malay or Chinese (owner, 3 Nov 2026): what she picks is saved in English, only the words shown change.
 */
export default function SignIn() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { toast, me } = useDemo();
  const [step, setStep] = useState<Step>("start");
  // Signed up with Google or TikTok: the same form once, to fill in the details those skip (owner, 31 Oct 2026).
  const [details, setDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  // ?in=1 opens Sign in; everything else opens Sign up.
  const [provider, setProvider] = useState<keyof typeof PROVIDER>("Google");
  // The Home Screen app's code while sign-in finishes in the browser.
  const [handoff, setHandoff] = useState<string | null>(null);
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
  // A code was emailed for this card (owner, 31 Oct 2026: the code box shows on the same page, no extra page).
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  // Add Account (owner, 4 Nov 2026): signing in to another account keeps the one in use, to switch back to.
  const [add, setAdd] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [otherKind, setOtherKind] = useState("");
  // Typed as DD/MM/YYYY (owner, 30 Oct 2026); kept as yyyy-mm-dd, or "bad" for a date that doesn't exist.
  const [bdText, setBdText] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [race, setRace] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState<Address>(EMPTY_ADDRESS);
  // Came from someone's invite link (owner, 28 Oct 2026): show what the friend gets. The code is kept for sign-up.
  const [refCode, setRefCode] = useState("");
  // No link: she can still type a friend's code (owner, 30 Oct 2026).
  const [typedRef, setTypedRef] = useState("");
  // Came from the landing checker (owner, 29 Oct 2026): keep the TikTok username she typed.
  const [handle, setHandle] = useState("");
  // Choices are kept in English; the list shows them in her language. Countries by their code, named by the browser.
  const pairs = (list: readonly string[]): [string, string][] => list.map((x) => [x, t(x)]);
  const countryOptions = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try { names = new Intl.DisplayNames([dateLocale(lang)], { type: "region" }); } catch {}
    return COUNTRIES.map((c) => {
      let shown = c.name;
      if (lang !== "en") try { shown = names?.of(c.code) ?? c.name; } catch {}
      return [c.code, shown] as [string, string];
    });
  }, [lang]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    if (q.get("add") === "1") setAdd(true);
    // Finished in the browser for the Home Screen app: say to go back there.
    if (q.get("handed")) setStep("handed");
    // The Home Screen app reopened while a sign-in was finishing in the browser: keep waiting for it.
    else if (homeScreenApp()) {
      try {
        const saved = JSON.parse(localStorage.getItem(HANDOFF_KEY) ?? "null") as { code: string; at: number; provider: "Google" | "TikTok" } | null;
        if (saved && Date.now() - saved.at < HANDOFF_MS) { setProvider(saved.provider); setStep("oauth"); setHandoff(saved.code); }
        else localStorage.removeItem(HANDOFF_KEY);
      } catch {}
    }
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
    if (err) toast(err === "denied" ? t("Sign-in was cancelled.") : err === "config" ? t("This sign-in isn't set up yet.") : err === "taken" ? t("That TikTok account is already connected to another Rezekii account.") : t("Sign-in didn't finish. Please try again."));
  }, []);
  // Her name from Google or TikTok, ready to change.
  useEffect(() => {
    if (details && me?.name) setName((n) => n || me.name || "");
  }, [details, me]);
  const kindError = !kinds.length ? t("Pick at least one") : kinds.includes("Others") && !otherKind.trim() ? t("Tell us which one") : "";

  const tel = (() => {
    if (dial === "60") return tidyPhone(phone);
    const r = tidyAnyPhone(phone, dial);
    return { pretty: r.ok ? r.pretty.replace(`+${dial} `, "") : phone, e164: r.ok ? r.pretty : "", error: r.ok ? null : phone.trim() ? r.error ?? tx("Check the number") : tx("Enter your WhatsApp number") };
  })();
  const go = (s: Step) => {
    setTried(false);
    setCodeSent(false);
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
          toast(t("We couldn't find that referral code. Check it, or leave it empty."));
          return;
        }
      }
      await saveProfile("creator", {
        name: name.trim(), birthday, country, state: state.trim(), whatsapp: tel.e164.replace(/\s/g, ""), gender, race,
        types: kinds.map((k) => (k === "Others" ? `Others: ${otherKind.trim()}` : k)), niches,
      });
      keep();
      finish(t("Welcome to Rezekii, {name}", { name: name.trim().split(" ")[0] }));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("Didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function emailCall(body: Record<string, string>): Promise<{ exists?: boolean; password?: boolean; google?: boolean; details?: boolean }> {
    const r = await fetch("/api/auth/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { error?: string }).error ?? t("That didn't work. Please try again."));
    return d;
  }
  // Signed in: the sign-up details first when they're missing (not when she came to do something else, like connect a shop).
  // Passed on to Google's and TikTok's sign-in: where to go after, and whether this adds an account.
  const startParams: Record<string, string> = { ...(next ? { next } : {}), ...(add ? { add: "1" } : {}) };
  const land = (details?: boolean) => { window.location.href = details && !next ? "/signin?details=1" : next ?? "/app"; };
  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : t("That didn't work. Please try again.")); } finally { setBusy(false); }
  }
  const signInEmail = () => withBusy(async () => {
    try {
      const d = await emailCall({ mode: "signin", email, password: pw });
      await rememberPassword(email, pw);
      land(d.details);
    } catch (e) {
      // An email that signs in with Google has no password.
      const d = await emailCall({ mode: "check", email }).catch(() => null);
      if (d?.exists && !d.password && d.google) throw new Error(t("This email signs in with Google. Continue with Google, or email yourself a sign-in code."));
      throw e;
    }
  });
  const signUpEmail = () => withBusy(async () => { await emailCall({ mode: "signup", email, password: pw, name: name.trim(), code }); await rememberPassword(email, pw); land(true); });
  /** Emails a code for `purpose`; the code box then shows on the same card (or on `then`). */
  const sendCode = (purpose: "signup" | "signin" | "reset", then?: Step) => withBusy(async () => {
    if (!isEmail(email)) throw new Error(t("Enter your email first."));
    await emailCall({ mode: "code", email, purpose });
    setCode("");
    toast(t("Code sent to {email}", { email: email.trim() }));
    if (then) go(then);
    setCodeSent(true);
  });
  const signInCode = () => withBusy(async () => land((await emailCall({ mode: "signin", email, code })).details));
  const resetPassword = () => withBusy(async () => { const d = await emailCall({ mode: "reset", email, code, password: pw }); await rememberPassword(email, pw); land(d.details); });

  // Waiting for the sign-in in the browser: asks every few seconds and whenever the app comes back to the front.
  useEffect(() => {
    if (!handoff) return;
    let on = true;
    const check = async () => {
      const r = await fetch("/api/auth/handoff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: handoff }) }).catch(() => null);
      const d = r?.ok ? ((await r.json().catch(() => null)) as { to?: string } | null) : null;
      if (on && d?.to) {
        try { localStorage.removeItem(HANDOFF_KEY); } catch {}
        window.location.href = d.to;
      }
    };
    const timer = window.setInterval(() => void check(), 2500);
    const seen = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", seen);
    const stop = window.setTimeout(() => {
      if (!on) return;
      try { localStorage.removeItem(HANDOFF_KEY); } catch {}
      setHandoff(null);
      setStep("start");
      toast(t("Sign-in took too long. Please try again."));
    }, HANDOFF_MS);
    void check();
    return () => { on = false; window.clearInterval(timer); window.clearTimeout(stop); document.removeEventListener("visibilitychange", seen); };
  }, [handoff]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancelHandoff = () => {
    try { localStorage.removeItem(HANDOFF_KEY); } catch {}
    setHandoff(null);
    setStep("start");
  };

  async function oauth(p: keyof typeof PROVIDER) {
    // A friend's code typed here is kept for the new account (owner, 31 Oct 2026); a wrong code stops so it can be fixed.
    if (typedRef && !refCode) {
      try {
        await keepInviteCode(typedRef, "creator");
      } catch {
        toast(t("We couldn't find that referral code. Check it, or leave it empty."));
        return;
      }
    }
    setProvider(p);
    setStep("oauth");
    // From the Home Screen app: sign in in the phone's browser and come back (owner, 3 Nov 2026).
    if (homeScreenApp()) {
      const code = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "").slice(0, 40);
      try { localStorage.setItem(HANDOFF_KEY, JSON.stringify({ code, at: Date.now(), provider: p })); } catch {}
      setHandoff(code);
      window.open(`${startPath(p as "Google" | "TikTok")}?${new URLSearchParams({ ...startParams, handoff: code })}`, "_blank");
      return;
    }
    // Real sign-in (owner, 30 Oct 2026): Google or TikTok, then back into the app with a session.
    const q = new URLSearchParams(startParams).toString();
    window.location.href = `${startPath(p as "Google" | "TikTok")}${q ? `?${q}` : ""}`;
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
      {t("Full name")}
      <input className="np-input" autoComplete="name" placeholder={t("Your real name, for verification")} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} />
      {tried && name.trim().length < 2 && <small className="cr1-err">{t("Enter your name")}</small>}
    </label>
  );

  const emailField = (
    <label className="v2-field">
      {t("Email")}
      {/* Named and marked as the account name, so the browser offers to save and fill the password (owner, 23 Nov 2026). */}
      <input className="np-input" type="email" name="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && !isEmail(email)} />
      {tried && !isEmail(email) && <small className="cr1-err">{t("Enter an email like you@example.com")}</small>}
    </label>
  );

  const countryField = (
    <label className="v2-field">
      {t("Country")}
      <PickList
        label={t("Country")}
        options={countryOptions}
        value={[country]}
        onChange={([code]) => {
          const c = COUNTRIES.find((x) => x.code === code);
          setCountry(code);
          setState("");
          if (c) setDial(c.dial);
          setPhoneTouched(false);
        }}
      />
    </label>
  );

  const stateField = (
    <label className="v2-field">
      {t("State")}
      {country === "MY" ? (
        <PickList label={t("State")} options={Object.values(MY_STATES).flat().map((x): [string, string] => [x, x])} value={state ? [state] : []} onChange={([v]) => setState(v)} invalid={tried && !state} />
      ) : (
        <input className="np-input" autoComplete="address-level1" placeholder={t("State / Province")} value={state} onChange={(e) => setState(e.target.value)} aria-invalid={tried && !state.trim()} />
      )}
      {tried && !state.trim() && <small className="cr1-err">{t("Choose your state")}</small>}
    </label>
  );

  const phoneField = (
    <label className="v2-field">
      {t("WhatsApp number")}
      <span className="cr1-phone">
        <PickList compact label={t("Country code")} shown={(d) => `+${d}`} options={DIAL_OPTIONS.map((o) => [o.dial, o.label] as [string, string])} value={[dial]} onChange={([d]) => { setDial(d); setPhoneTouched(false); }} />
        <input
          className="np-input"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={dial === "60" ? "12-345 6789" : t("Phone number")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => {
            setPhoneTouched(true);
            if (!tel.error) setPhone(tel.pretty);
          }}
          aria-invalid={(phoneTouched || tried) && !!tel.error}
        />
      </span>
      {/* The number's problem comes in English from the checker; shown in her language. */}
      {(phoneTouched || tried) && tel.error && <small className="cr1-err">{t(tel.error)}</small>}
    </label>
  );

  // TikTok Shop affiliates must be 18 or older.
  const bErr = bdText && !birthday ? tx("Use DD/MM/YYYY") : birthdayError(birthday);
  const birthdayField = (
    <label className="v2-field">
      {t("Birthday")}
      <input className="np-input" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/YYYY" maxLength={10} value={bdText} onChange={(e) => typeBirthday(e.target.value)} aria-invalid={tried && !!bErr} />
      {tried && bErr && <small className="cr1-err">{t(bErr)}</small>}
    </label>
  );

  const raceField = (
    <div className="v2-field">
      {t("Race")}
      <PickList label={t("Race")} options={pairs(RACES)} value={race ? [race] : []} onChange={([v]) => setRace(v)} invalid={tried && !race} />
      {tried && !race && <small className="cr1-err">{t("Choose one")}</small>}
    </div>
  );
  const genderField = (
    <div className="v2-field">
      {t("Gender")}
      <PickList label={t("Gender")} options={pairs(GENDERS)} value={gender ? [gender] : []} onChange={([v]) => setGender(v)} invalid={tried && !gender} />
      {tried && !gender && <small className="cr1-err">{t("Choose one")}</small>}
    </div>
  );

  const kindField = (
    <div className="v2-field">
      {t("Creator type")}
      <PickList multi label={t("Creator type")} options={pairs(KINDS)} value={kinds} onChange={setKinds} invalid={tried && !!kindError} />
      {kinds.includes("Others") && (
        <input className="np-input" placeholder={t("Which one?")} value={otherKind} onChange={(e) => setOtherKind(e.target.value)} aria-label={t("Other kind of creator")} aria-invalid={tried && !otherKind.trim()} />
      )}
      {tried && kindError && <small className="cr1-err">{kindError}</small>}
    </div>
  );

  const nicheField = (
    <div className="v2-field">
      {t("Niches")}
      <PickList multi label={t("Niches")} options={pairs(NICHES)} value={niches} onChange={setNiches} max={3} invalid={tried && !niches.length} />
      {tried && !niches.length && <small className="cr1-err">{t("Pick at least one")}</small>}
    </div>
  );

  // Referral code (owner, 30 Oct 2026): from a friend's invite link it's filled in and can't be changed.
  const refField = (
    <label className="v2-field">
      <span>{t("Referral code")}{!refCode && <small className="su-opt"> · {t("optional")}</small>}</span>
      {refCode ? (
        <span className="su-ref">
          <input className="np-input" value={refCode} readOnly aria-readonly="true" aria-describedby="su-ref-note" />
          <Icon name="lock" size={16} />
        </span>
      ) : (
        <input className="np-input" placeholder={t("Friend's code")} autoCapitalize="characters" value={typedRef} onChange={(e) => setTypedRef(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} />
      )}
      {refCode && <small id="su-ref-note" className="cr1-okline"><Icon name="gift" size={14} width={2.4} /> {t("From your friend's invite: +{n} credits once you link TikTok Shop", { n: REFERRAL_REWARD.friend })}</small>}
    </label>
  );

  // Optional here; if she starts filling it in, it has to be complete.
  const addrStarted = Object.values(addr).some((v) => v.trim());
  const addrBad = showAddr && addrStarted && !addressOk(addr);
  const addressField = showAddr ? (
    <div className="v2-field">
      <span className="cr1-addr-h">{t("Sample delivery address")} <small>· {t("optional")}</small> <Tip text={t("Where sellers send your free samples. You can add or change it later in My Account.")} /></span>
      <AddressFields value={addr} onChange={setAddr} tried={tried && addrStarted} />
    </div>
  ) : (
    <button type="button" className="cr1-addaddr" onClick={() => setShowAddr(true)}><Icon name="plus" size={16} /> {t("Add Sample Delivery Address")} <small>({t("optional")})</small></button>
  );
  const signupBad = name.trim().length < 2 || !state.trim() || !!tel.error || !!kindError || !!bErr || !gender || !race || !niches.length || addrBad;
  const keep = () => {
    saveSignup({ birthday, niches });
    if (addressOk(addr)) saveAddress(addr);
  };

  const back = (to: Step, label = t("Back")) => (
    <button type="button" className="cr1-back" onClick={() => go(to)}><Icon name="back" size={18} /> {label}</button>
  );
  // Terms and Privacy Policy, linked, inside one whole line.
  const policies = {
    terms: <a className="v2-link" href="https://rezekii.com/terms" target="_blank" rel="noreferrer">{t("Terms of Service")}</a>,
    privacy: <a className="v2-link" href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">{t("Privacy Policy")}</a>,
  };

  // Sign-up is a page of its own, not the floating card (owner, 30 Oct 2026).
  const linked = step === "profile";
  if (linked) {
    const unlink = () => {
      // Signed up with Google or TikTok but not finished: going back signs out.
      if (details) {
        signOut({ out: "/signin" });
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
            <button type="button" className="su-back" onClick={unlink} aria-label={t("Back")}><Icon name="back" size={20} /></button>
            <Link href="/" className="su-brand">
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} />
              Rezekii
            </Link>
            <span className="site-spacer" />
            <LangSwitch compact />
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
                finish(t("Welcome to Rezekii, {name}", { name: name.trim().split(" ")[0] }));
              }}
            >
              <div className="su-head">
                <h1>{t("Create Your Account")}</h1>
                <p>{t("Free to join. No minimum followers.")}</p>
              </div>
              {handle && (
                <p className="si-ref si-handle">
                  <Icon name="scan" size={18} />
                  <span><Rich text={t("Your scan for {handle} is one step away. Sign up, then link TikTok Shop to see your rates.")} parts={{ handle: <b>@{handle}</b> }} /></span>
                </p>
              )}
              {linked && details ? (
                <div className="cr1-who">
                  {me?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="v2-av" src={me.photo} alt="" />
                  ) : <span className="v2-av">{(me?.name ?? "?").slice(0, 2).toUpperCase()}</span>}
                  <span>
                    <b>{me?.name ?? t("Your account")}</b>
                    <small>{me?.email ?? (me?.handle ? `@${me.handle}` : t("Signed in"))}</small>
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
              {raceField}
              <div className="cr1-pair su-picks">
                {kindField}
                {nicheField}
              </div>
              {refField}
              {addressField}
              <button type="submit" className="np-btn np-submit" disabled={saving}>{saving ? t("Saving…") : t("Create Account")}</button>
              <p className="cr1-center cr1-fine">{t("By continuing you agree to Rezekii's Terms of Service and Privacy Policy.")}</p>
            </form>
          )}
        </main>
      </>
    );
  }

  const newPw = step === "create" || step === "reset";
  const codeField = (
    <label className="v2-field">
      {t("6-digit code")}
      <input className="np-input cr1-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={tried && code.length !== 6} autoFocus />
      {tried && code.length !== 6 && <small className="cr1-err">{t("Enter the 6 digits from the email")}</small>}
    </label>
  );
  const again = (purpose: "signup" | "signin" | "reset") => (
    <button type="button" className="v2-link cr1-forgot" disabled={busy} onClick={() => void sendCode(purpose)}>{t("Send a New Code")}</button>
  );
  const pwField = (label: string) => (
    <label className="v2-field">
      {label}
      <span className="cr1-pw">
        <input className="np-input" type={showPw ? "text" : "password"} name="password" autoComplete={newPw ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && (newPw ? pw.length < 8 : !pw)} />
        <button type="button" onClick={() => setShowPw((x) => !x)} aria-label={showPw ? t("Hide password") : t("Show password")}><Icon name="eye" size={18} /></button>
      </span>
      {newPw ? <small className={pw.length >= 8 ? "cr1-okline" : tried ? "cr1-err" : undefined}>{t("At least 8 characters")}</small> : tried && !pw ? <small className="cr1-err">{t("Enter your password")}</small> : null}
    </label>
  );
  const spin = <span className="cr1-spin sm" />;
  const sentTo = <p><Rich text={t("We sent a 6-digit code to {email}. It works for 10 minutes.")} parts={{ email: <b>{email.trim()}</b> }} /></p>;
  // Opens the sign-in in the browser again for the Home Screen app's code.
  const handoffUrl = handoff ? `${startPath(provider as "Google" | "TikTok")}?${new URLSearchParams({ ...startParams, handoff })}` : "";
  let card: React.ReactNode;
  if (step === "start") {
    // One way in for everyone (owner, 31 Oct 2026): new people are asked for their details after, returning people go straight in.
    card = (
      <>
        <div className="cr1-center">
          <h1>{add ? t("Add Account") : t("Welcome to Rezekii")}</h1>
          <p>{add ? t("Sign in to another account. You can switch between them anytime.") : t("Sign in or create your account.")}</p>
        </div>
        <button type="button" className="btn-google cr1-authbtn" onClick={() => oauth("Google")}><GoogleMark /> {t("Continue with Google")}</button>
        {/* Not Available Yet until TikTok approves Rezekii's app (owner, 3 Nov 2026). */}
        {OPEN.tiktok ? <button type="button" className="btn-tiktok cr1-authbtn" onClick={() => oauth("TikTok")}><TikTokMark /> {t("Continue with TikTok")}</button>
          : <div className="cr1-authbtn auth-off"><TikTokMark /> {t("Continue with TikTok")} <NotYet app="tiktok" /></div>}
        <button type="button" className="btn-email cr1-authbtn" onClick={() => go("email")}><Icon name="inbox" size={20} /> {t("Continue with Email")}</button>
        <p className="cr1-center cr1-switch">{t("New to Rezekii?")} <button type="button" className="v2-link" onClick={() => go("create")}>{t("Create Account")}</button></p>
        <p className="cr1-center cr1-fine"><Rich text={t("By Continuing You Agree to Rezekii's {terms} and {privacy}.")} parts={policies} /></p>
        {add && <p className="cr1-center"><a className="v2-link" href={next ?? "/app"}>{t("Cancel")}</a></p>}
      </>
    );
  } else if (step === "oauth" && handoff) {
    // Home Screen app: sign-in is open in the browser; this app signs in by itself once it's done (owner, 3 Nov 2026).
    card = (
      <div className="cr1-wait">
        <span className="cr1-provider">{provider === "Google" ? <GoogleMark /> : <TikTokMark size={26} />}</span>
        <span className="cr1-spin" aria-hidden="true" />
        <b>{t("Finish Signing In in Your Browser")}</b>
        <p>{t("Approve in {provider}, then come back to this app. It signs you in by itself.", { provider })}</p>
        <a className="btn-outline" href={handoffUrl} target="_blank" rel="noreferrer">{t("Open Sign-In Again")}</a>
        <button type="button" className="v2-link" onClick={cancelHandoff}>{t("Cancel")}</button>
      </div>
    );
  } else if (step === "handed") {
    card = (
      <div className="cr1-wait">
        <span className="cr1-provider"><Icon name="check" size={26} width={2.6} /></span>
        <b>{t("You're Signed In")}</b>
        <p>{t("Go back to the Rezekii app on your Home Screen. It signs you in by itself.")}</p>
        <a className="v2-link" href="/app">{t("Continue Here Instead")}</a>
      </div>
    );
  } else if (step === "oauth") {
    card = (
      <div className="cr1-wait">
        <span className="cr1-provider">{provider === "Google" ? <GoogleMark /> : <TikTokMark size={26} />}</span>
        <span className="cr1-spin" aria-hidden="true" />
        <b>{t("Continuing with {provider}…", { provider })}</b>
        <p>{t("Approve in {provider}'s window.", { provider })}</p>
      </div>
    );
  } else if (step === "email") {
    // Sign in on one page (owner, 31 Oct 2026): email and password, or a code by email, without extra pages.
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (!isEmail(email)) return; if (codeSent) { if (code.length === 6) void signInCode(); } else if (pw) void signInEmail(); }}>
        {back("start")}
        <h1>{t("Sign in with Email")}</h1>
        {emailField}
        {codeSent ? (
          <>
            {sentTo}
            {codeField}
            <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? spin : t("Sign in")}</button>
            {again("signin")}
            <button type="button" className="v2-link" onClick={() => setCodeSent(false)}>{t("Use My Password Instead")}</button>
          </>
        ) : (
          <>
            {pwField(t("Password"))}
            <button type="button" className="v2-link cr1-forgot" disabled={busy} onClick={() => void sendCode("reset", "reset")}>{t("Forgot password?")}</button>
            <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? spin : t("Sign in")}</button>
            <button type="button" className="v2-link" disabled={busy} onClick={() => { setTried(true); void sendCode("signin"); }}>{t("Email Me a Sign-In Code Instead")}</button>
          </>
        )}
        <p className="cr1-center cr1-switch">{t("New to Rezekii?")} <button type="button" className="v2-link" onClick={() => go("create")}>{t("Create Account")}</button></p>
      </form>
    );
  } else if (step === "create") {
    // Create account on one page: name, email and password, then the code from the email right below.
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (name.trim().length < 2 || !isEmail(email) || pw.length < 8) return; if (codeSent) { if (code.length === 6) void signUpEmail(); } else void sendCode("signup"); }}>
        {back("start")}
        <h1>{t("Create Your Account")}</h1>
        {nameField}
        {emailField}
        {pwField(t("Password"))}
        {codeSent ? (
          <>
            {sentTo}
            {codeField}
            <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? spin : t("Confirm and Create Account")}</button>
            {again("signup")}
          </>
        ) : (
          <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? spin : t("Create Account")}</button>
        )}
        <p className="cr1-center cr1-switch">{t("Already have an account?")} <button type="button" className="v2-link" onClick={() => go("email")}>{t("Sign in")}</button></p>
      </form>
    );
  } else if (step === "reset") {
    card = (
      <form className="cr1-form" onSubmit={(e) => { e.preventDefault(); setTried(true); if (code.length === 6 && pw.length >= 8) void resetPassword(); }}>
        {back("email")}
        <h1>{t("Choose a New Password")}</h1>
        {sentTo}
        {codeField}
        {pwField(t("New password"))}
        <button type="submit" className="np-btn np-submit" disabled={busy}>{busy ? <span className="cr1-spin sm" /> : t("Save and Sign In")}</button>
        {again("reset")}
        <p className="cr1-small" style={{ margin: 0 }}><Rich text={t("No Access to This Email? Write to {email}.")} parts={{ email: <a className="v2-link" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> }} /></p>
      </form>
    );
  } else {
    card = (
      <div className="cr1-wait">
        <span className="v2-medal green cr1-welcome"><Icon name="check" size={40} width={2.6} /></span>
        <b>{welcome}</b>
        <p>{t("Opening your app…")}</p>
      </div>
    );
  }

  return (
    <>
      <DemoStrip />
      <main className="rz-splash cr1-splash">
        <Link href="/" className="rz-back" aria-label={t("Back to home")}><Icon name="back" size={20} /></Link>
        <div style={LANG_SPOT}><LangSwitch compact /></div>
        <div className="rz-tiles" aria-hidden="true">
          {TILES.map(([pos, bg, fg, rot, d], i) => (
            <span key={i} className="rz-tile" style={{ ...pos, animationDelay: `${-i * 0.7}s` }}>
              <span style={{ background: bg, transform: `rotate(${rot})` }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              </span>
            </span>
          ))}
        </div>
        <Link href="/" className="rz-logo-wrap" aria-label={t("Rezekii home")}>
          <span className="rz-ripple" aria-hidden="true" />
          <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-1s" }} />
          <span className="rz-ripple" aria-hidden="true" style={{ animationDelay: "-2s" }} />
          <span className="rz-logo">
            <Image src="/master-logo-transparent.png" alt="Rezekii" width={64} height={64} priority />
          </span>
        </Link>
        <p className="rz-name">Rezekii</p>
        <p className="rz-tag">{t("CONNECTING AFFILIATES")}</p>
        <div key={step} className="rz-card cr1-auth">{card}</div>
        <p className="rz-foot">
          <Rich text={t("Need help? {email}")} parts={{ email: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> }} />
        </p>
      </main>
    </>
  );
}
