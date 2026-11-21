"use client";

import { ShopeeAccounts } from "@/components/shopee-accounts";
import { FeedbackForm } from "@/components/feedback-form";
import { COUNTRIES, DIAL_OPTIONS, countryName, dialOfNumber, RACES } from "@/lib/countries";
import { SUPPORT } from "@/lib/support";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo, useWho } from "@/components/demo";
import { Seg, Sheet, Title, Loading, Tip } from "@/components/ui";
import { useSideScroll } from "@/components/side-scroll";
import { PlatformIcon } from "@/components/creator2/bits";
import { CREATOR, MY_SAMPLES, SOCIALS } from "@/lib/mock";
import { LiveSamples, MySamples } from "@/components/creator1/my-samples";
import { LevelFace } from "@/components/level-face";
import { LevelBadges } from "@/components/account/level-badges";
import { Referral } from "@/components/account/referral";
import { RateCard } from "@/components/account/rate-card";
import { Wallet } from "@/components/account/wallet";
import { PushSwitch } from "@/components/account/push-switch";
import { AccountSwitcher } from "@/components/account-switcher";
import { signOut } from "@/lib/sign-out";
import { AddressForm } from "@/components/account/address-fields";
import { SAMPLE_INFO, birthdayError, readSignup, useAddress, type Address } from "@/lib/address";
import { shortId } from "@/lib/short-id";
import type { IconName } from "@/components/icons";
import { MY_STATES, NICHES, NOTIFY } from "@/lib/mock-creator2";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { BrandLogo } from "@/components/brand-logos";
import { MyWishes } from "@/components/creator1/my-wishes";
import { ACCOUNT_TABS, tabFor, type AccountTab } from "@/lib/account-tabs";
import { NotYet, useCanConnect } from "@/components/not-yet";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { useLang, useSetLang, useT } from "@/lib/i18n/client";
import { LANGS, dateLocale } from "@/lib/i18n/lang";
import { rich } from "@/components/account/rich-text";
import { loadProfile, loadWallet, saveProfile } from "@/lib/live-rewards";
import { notesChanged } from "@/lib/live-notes";
import "@/app/creator2.css";

// Creator types, genders, races, niches and the theme are kept in English (saved as data) and translated where they're shown.
const TYPES = ["Affiliate", "UGC", "Artist", "Influencer"] as const;
const GENDERS = ["Female", "Male"] as const;
const THEMES = ["Light", "Dark", "Auto"] as const;
/** What a change request can be about (sent to the team in English). */
const CHANGES = ["Name", "State", "WhatsApp number", "Gender", "Creator type", "Niches", "Other"];
const TABS = ACCOUNT_TABS;
type TabKey = AccountTab;
const active = MY_SAMPLES.filter((x) => !["Done", "Not approved"].includes(x.status)).length;

/** A red star for a required field. */
function Req() {
  const t = useT();
  return <i className="pf-req" title={t("Required")}>*</i>;
}
/** Country codes for WhatsApp numbers (owner, 28 Oct 2026: a fixed format with the code in front). Malaysia first. */
// Every calling code (owner, 31 Oct 2026: creators from anywhere).
const CODES: [string, string][] = DIAL_OPTIONS.map((o) => [`+${o.dial}`, o.label.replace(/ \+\d+$/, "")]);
/** The number's digits without a leading 0, or null when it isn't a mobile number for that country. */
function digitsFor(cc: string, raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^0+/, "");
  const ok = cc === "+60" ? /^1\d{8,9}$/.test(d) : cc === "+65" ? /^[89]\d{7}$/.test(d) : /^\d{7,12}$/.test(d);
  return ok ? d : null;
}
/** Malaysia: 12-345 6789 or 11-2345 6789; elsewhere in groups of four. */
function prettyNum(cc: string, d: string) {
  if (cc === "+60") return d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)} ${d.slice(5)}` : `${d.slice(0, 2)}-${d.slice(2, 6)} ${d.slice(6)}`;
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** My account: profile, connections, samples & delivery, rate card and settings, grouped like iOS Settings. Nothing is saved. */

/** Loads her notification choices once (signed in). */
function LoadPrefs({ onLoad }: { onLoad: (p: Record<string, boolean>) => void }) {
  useEffect(() => {
    fetch("/api/v2/notifications?side=creator&part=prefs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { prefs?: Record<string, boolean> } | null) => onLoad(d?.prefs ?? { samples: true, chances: true, posts: true, rewards: true }))
      .catch(() => onLoad({ samples: true, chances: true, posts: true, rewards: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Her messages and change requests with the team's replies (owner, 1 Nov 2026: replies are read in the app). */
function MyMessages() {
  const t = useT();
  const lang = useLang();
  const [list, setList] = useState<{ id: string; kind: string; message: string; status: string; reply: string | null; replied_at: string | null; seen_at: string | null; created_at: string }[] | null>(null);
  useEffect(() => {
    fetch("/api/v2/feedback", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setList(d?.messages ?? [])).catch(() => setList([]));
  }, []);
  if (!list?.length) return null;
  const when = (at: string) => new Date(at).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
  return (
    <div className="cr2-cells acc-msgs" aria-label={t("My messages")}>
      <span className="lbl" style={{ padding: "10px 14px 0", display: "block" }}>{t("My Messages")}</span>
      {list.slice(0, 8).map((m) => (
        <div key={m.id} className="cr2-cell stack acc-msg">
          <span className="acc-msg-h"><b>{t(m.kind)}</b><small>{when(m.created_at)}</small>{m.reply && !m.seen_at && <i className="badge">{t("New Reply")}</i>}</span>
          <span className="v2-small" style={{ whiteSpace: "pre-wrap" }}>{m.message}</span>
          {m.reply ? (
            <span className="acc-reply"><b>{t("Rezekii Team")}{m.replied_at ? ` · ${when(m.replied_at)}` : ""}</b><span style={{ whiteSpace: "pre-wrap" }}>{m.reply}</span></span>
          ) : (
            <small className="v2-muted">{m.status === "handled" ? t("Seen by the team") : t("Waiting for the team")}</small>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Account() {
  const t = useT();
  const you = useWho();
  const { linked, setLinked, toast, consent, waVerified: verified, setWaVerified: setVerified, live, me, refreshMe } = useDemo();
  const [unlink, setUnlink] = useState(false);
  const [changing, setChanging] = useState(false);
  const [tab, setTab] = useState<TabKey>("profile");
  const tabsRef = useRef<HTMLDivElement>(null);
  useSideScroll(tabsRef, tab);
  const [email, setEmail] = useState(you.email);
  const [emailSheet, setEmailSheet] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [delSheet, setDelSheet] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [delText, setDelText] = useState("");

  useEffect(() => {
    const read = () => {
      const hit = tabFor(window.location.hash.slice(1));
      if (hit) setTab(hit);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (k: TabKey, at?: "streak") => {
    setTab(k);
    window.history.replaceState(null, "", `#${at ?? k}`);
    if (at) requestAnimationFrame(() => document.getElementById(at)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    // replaceState fires no hashchange; tell the top bar's page switcher too.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const [name, setName] = useState(you.name);
  const [state, setState] = useState(CREATOR.state);
  const [country, setCountry] = useState("MY");
  const [cc, setCc] = useState("+60");
  const [phone, setPhone] = useState("12-345 6789");
  const [verifying, setVerifying] = useState(false);
  const [waSheet, setWaSheet] = useState(false);
  const [gender, setGender] = useState<"Female" | "Male">("Female");
  const [race, setRace] = useState("");
  const [raceSaved, setRaceSaved] = useState(false);
  const [types, setTypes] = useState<string[]>(["Affiliate", "UGC"]);
  const [niche, setNiche] = useState("Home Supplies");
  const [sub1, setSub1] = useState("Muslim Fashion");
  const [sub2, setSub2] = useState("");
  // Sign-up asks for all of this (owner, 29 Oct 2026), so the profile arrives saved; changes go through support.
  const [locked, setLocked] = useState(true);
  const [birthday, setBirthday] = useState(SAMPLE_INFO.birthday);
  useEffect(() => setBirthday(readSignup().birthday), []);
  const [tried, setTried] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [changeSheet, setChangeSheet] = useState(false);
  const [change, setChange] = useState({ what: "WhatsApp number", to: "", why: "" });
  const [savedAddr, saveAddr] = useAddress();
  const [addr, setAddr] = useState<Address>(savedAddr);
  useEffect(() => setAddr(savedAddr), [savedAddr]);
  const [conn, setConn] = useState<Record<string, boolean>>(Object.fromEntries(SOCIALS.map((s) => [s.name, s.linked])));
  const [notify, setNotify] = useState<Record<string, [boolean, boolean]>>({ samples: [true, true], chances: [true, true], posts: [true, false], rewards: [true, false] });
  // Signed in (owner, 31 Oct 2026): the in-app switches decide what shows in Notifications. No email alerts are sent yet.
  const [inApp, setInApp] = useState<Record<string, boolean> | null>(null);
  const [pwSheet, setPwSheet] = useState(false);
  const [hasPw, setHasPw] = useState(true);
  const [googleOn, setGoogleOn] = useState(true);
  const [pw, setPw] = useState(["", "", ""]);
  const [feedback, setFeedback] = useState(false);
  const [theme, setTheme] = useState<Theme>("Auto");
  // English, Bahasa Melayu or 中文 (owner, 3 Nov 2026): saved on this device and the page reloads in it.
  const lang = useLang();
  const [pickLang, langBusy] = useSetLang();
  const langLabel = LANGS.find(([k]) => k === lang)![1];

  useEffect(() => {
    const saved = readTheme();
    setTheme(saved);
    if (saved !== "Auto") applyTheme(saved);
  }, []);
  const pickTheme = (next: Theme) => { setTheme(next); applyTheme(next); };

  // Settings on her real account (owner, 31 Oct 2026): how she signs in, password and email, and deleting the account.
  const ways = live ? me?.signIn : undefined;
  const [curPw, setCurPw] = useState("");
  const [busyAcct, setBusyAcct] = useState(false);
  const emailLogin = async (change: { email?: string; password?: string; current?: string }, done: string) => {
    setBusyAcct(true);
    try {
      const r = await fetch("/api/account/email-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(change) });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) return toast(d.error ? t(d.error) : t("Didn't save. Please try again."));
      toast(done);
      setPwSheet(false);
      setEmailSheet(false);
      setPw(["", "", ""]);
      setCurPw("");
      refreshMe();
    } finally {
      setBusyAcct(false);
    }
  };
  const deleteReal = async () => {
    setBusyAcct(true);
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { error?: string; switched?: boolean } | undefined;
    setBusyAcct(false);
    if (!r?.ok) return toast(d?.error ? t(d.error) : t("Couldn't delete the account. Please try again."));
    window.location.href = d?.switched ? "/app" : "/";
  };

  // Signed in (owner, 31 Oct 2026): her real channels for Connections, and a message when she comes back from connecting one.
  type Chan = { key: string; app: "tiktok" | "facebook" | "instagram" | "threads" | "shopee"; name: string; sub: string; status: "active" | "reconnect"; role?: "seller" | "affiliate" };
  const [chans, setChans] = useState<Chan[] | null>(null);
  // Shopee only where its app keys are set; until then its row still reads Coming Soon.
  const [shopeeOn, setShopeeOn] = useState(false);
  const loadChans = () => fetch("/api/v2/publish?part=setup&side=creator", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { channels?: Chan[]; shopeeOn?: boolean } | null) => { setChans(d?.channels ?? []); setShopeeOn(!!d?.shopeeOn); }).catch(() => setChans([]));
  useEffect(() => {
    if (!live) return;
    void loadChans();
    const q = new URLSearchParams(window.location.search);
    const result = q.get("connect");
    if (result) {
      const app = ({ tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads", shopee: "Shopee" } as Record<string, string>)[q.get("channel") ?? ""] ?? t("The app");
      toast(result === "ok" ? t("{app} connected.", { app }) : result === "no_pages" ? t("No Facebook Pages were picked. Connect again and tick your Pages.") : result === "personal" ? t("That Instagram account is personal. Switch it to a Business or Creator account, then connect again.") : result === "cancelled" ? t("{app} sign-in was cancelled.", { app }) : t("{app} didn't connect. Please try again.", { app }));
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  // TikTok and Meta wait for their platform's approval (owner, 3 Nov 2026); admins can still connect, and anyone can reconnect.
  const can = useCanConnect();
  const connectApp = (app: Chan["app"]) => { window.location.href = app === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${app}/start?from=account`; };
  const disconnect = async (c: Chan) => {
    const r = await fetch(c.app === "tiktok" ? `/api/account/tiktok/${encodeURIComponent(c.key.replace(/^tiktok:/, ""))}` : `/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return toast(t("Couldn't disconnect. Try again."));
    toast(c.app === "tiktok" ? t("{name} disconnected. Its scheduled posts moved to drafts.", { name: c.name }) : t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
    void loadChans();
  };

  // Signed in (owner, 31 Oct 2026): her saved profile, or an empty one to fill in once; and her real streak.
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streakReal, setStreak] = useState<number | null>(null);
  const streak = live ? streakReal : CREATOR.streak;
  const lvName = live && me ? me.level.charAt(0).toUpperCase() + me.level.slice(1) : CREATOR.level;
  useEffect(() => {
    if (!live) return;
    setLoadingProfile(true);
    loadWallet("creator").then((w) => setStreak(w.streak)).catch(() => {});
    loadProfile<{ name: string; birthday: string; country?: string; state: string; whatsapp: string; gender: "Female" | "Male"; race?: string; types: string[]; niches: string[] }>("creator")
      .then(({ profile }) => {
        if (profile) {
          const d = profile.details;
          const code = `+${dialOfNumber(d.whatsapp) ?? "60"}`;
          setName(d.name); setBirthday(d.birthday); setCountry(d.country || "MY"); setState(d.state); setCc(code); setPhone(d.whatsapp.slice(code.length));
          setGender(d.gender); setTypes(d.types); setNiche(d.niches[0] ?? ""); setSub1(d.niches[1] ?? ""); setSub2(d.niches[2] ?? "");
          setRace(d.race ?? ""); setRaceSaved(!!d.race);
          setLocked(true);
        } else {
          setName(me?.name ?? ""); setBirthday(""); setState(""); setPhone(""); setTypes([]); setNiche(""); setSub1(""); setSub2("");
          setLocked(false);
        }
      })
      .catch(() => toast(t("Couldn't load your profile. Please refresh.")))
      .finally(() => setLoadingProfile(false));
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveReal = async () => {
    setSaving(true);
    try {
      await saveProfile("creator", { name, birthday, country, state, whatsapp: intl, gender, race, types, niches: [niche, sub1, sub2].filter(Boolean) });
      if (race) setRaceSaved(true);
      setLocked(true);
      setConfirmSave(false);
      toast(t("Profile saved"));
    } catch (e) {
      toast(e instanceof Error ? t(e.message) : t("Didn't save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const local = digitsFor(cc, phone);
  const intl = local ? `${cc}${local}` : null;
  const profileErrors = [
    !name.trim() && t("Enter your name."),
    !state.trim() && t("Pick your state."),
    !niche && t("Pick your main niche."),
    birthdayError(birthday) && t("Birthday: {problem}.", { problem: t(birthdayError(birthday)) }),
    !local && t("Enter a valid WhatsApp number."),
    types.length === 0 && t("Pick at least one creator type."),
  ].filter(Boolean) as string[];
  const verifyNow = () => {
    setVerifying(true);
    toast(t("Opening WhatsApp…"));
    window.setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      setWaSheet(false);
      toast(t("WhatsApp number verified"));
    }, 1800);
  };

  const socials: { key: string; label: string; icon: React.ReactNode; detail: string; on: boolean; soon?: boolean }[] = [
    { key: "TikTok Shop", label: "TikTok Shop", icon: <BrandLogo name="TikTok Shop" size={34} className="cr2-pi" />, detail: linked ? t("Linked") : t("Not linked"), on: linked },
    { key: "TikTok", label: t("TikTok Account"), icon: <PlatformIcon name="TikTok" size={34} />, detail: conn.TikTok ? SOCIALS[0].handle : t("Not connected"), on: conn.TikTok },
    { key: "Facebook", label: t("Facebook Page"), icon: <PlatformIcon name="Facebook" size={34} />, detail: conn.Facebook ? SOCIALS[2].handle : t("Not connected"), on: conn.Facebook },
    { key: "Instagram", label: "Instagram", icon: <PlatformIcon name="Instagram" size={34} />, detail: conn.Instagram ? `${SOCIALS[1].handle} · Reels` : t("Not connected"), on: conn.Instagram },
    { key: "Threads", label: "Threads", icon: <PlatformIcon name="Threads" size={34} />, detail: conn.Threads ? "@aisyah.glow" : t("Not connected"), on: conn.Threads },
    // A teaser (owner, 30 Oct 2026): Shopee is on the way, nothing to connect yet.
    { key: "Shopee", label: "Shopee", icon: <BrandLogo name="Shopee" size={34} className="cr2-pi" />, detail: t("Shopee Affiliate, on the way"), on: false, soon: true },
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <Title title={t("My Account")} sub={t("Your details, wallet, samples and settings")} />

      <div className="cr2-settings acc-layout">
        {/* Owner, 28 Oct 2026: on a wide screen the profile and the sections sit in a side bar. */}
        <aside className={`acc-side${tab === "referral" ? " no-prof" : ""}`}>
        {/* Referral shows its own banner instead of her profile (owner, 30 Oct 2026). */}
        {tab !== "referral" && (
        <div className="cr2-cells">
          <div className="cr2-profile">
            <LevelFace lv={live ? me?.ttLevel ?? null : linked ? CREATOR.tiktokLevel : null} size={76} img={you.photo} name={you.name} />
            <span>
              <strong className="cr2-name">
                {name || you.name}
                {linked && (
                  <span className="cr2-tick" title={t("TikTok Shop account linked and approved")} aria-label={t("Verified TikTok Shop account")}>
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <defs><linearGradient id="cr2-vt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22dc95" /><stop offset="1" stopColor="#00915a" /></linearGradient></defs>
                      <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12z" fill="url(#cr2-vt)" />
                      <path d="M7.8 12.3l2.8 2.8 5.6-5.8" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </strong>
              <span className="v2-small">{you.handle}</span>
              {/* Level and streak as two small stat tiles (owner, 29 Oct 2026, option C). */}
              <span className="cr2-mstats">
                {/* Each tile opens its section (owner, 1 Nov 2026): Level and Streak, both in Level, Streak & Badges. */}
                <button type="button" onClick={() => go("level")} aria-label={t("{level} level. Open Level, Streak & Badges", { level: t(lvName) })}><i className={`lv ${lvName.toLowerCase()}`}><Icon name="gem" size={15} /></i><b>{t(lvName)}</b><small>{t("Level")}</small></button>
                <button type="button" onClick={() => go("level", "streak")} aria-label={t("Open your streak")}><i className="st"><Icon name="flame" size={15} /></i><b>{streak === null ? "–" : streak === 1 ? t("{n} day", { n: streak }) : t("{n} days", { n: streak })}</b><small>{t("Streak")}</small></button>
              </span>
              {/* WhatsApp checks aren't connected yet, so real accounts don't see Verify. */}
              {!verified && !live && <span className="cr2-chips"><button type="button" className="cr2-wachip" onClick={() => setWaSheet(true)}>{t("Verify WhatsApp")}</button></span>}
            </span>
          </div>
        </div>
        )}
        <div ref={tabsRef} className="acc-tabs nv-noscroll" role="tablist" aria-label={t("Account sections")}>
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : undefined} onClick={() => go(k)}>
              <Icon name={icon} size={17} /> {t(label)}
              {k === "samples" && !live && <span className="badge badge-amber">{active}</span>}
            </button>
          ))}
          {/* Sign out at the end of the side menu, in red, on wide screens (owner, 31 Oct 2026). Phones have it in the account panel. */}
          {/* Switch Account beside it (owner, 4 Nov 2026), on one row so the menu still fits a laptop screen. */}
          <div className="acc-outrow">
            {live && <button type="button" className="acc-out acc-switch" onClick={() => setSwitcher(true)}><Icon name="users" size={17} /> {t("Switch Account")}</button>}
            <Link href="/signin?in=1" className="acc-out" onClick={(e) => { if (!live) return; e.preventDefault(); signOut(); }}>
              <Icon name="back" size={17} /> {t("Sign Out")}
            </Link>
          </div>
        </div>
        </aside>

        {tab === "profile" && loadingProfile && <Loading text={t("Loading your profile…")} />}
        {tab === "profile" && !loadingProfile && (
          <>
        {/* Owner, 28 Oct 2026: the whole profile in one box; once saved it's locked, and changes go through support. */}
        <section className="cr2-group">
          <div className={`pf-card${locked ? " locked" : ""}`}>
            <div className="pf-head">
              <h2>{t("Your Profile")}</h2>
              {locked ? <span className="pf-lock"><Icon name="lock" size={14} /> {t("Saved · locked")}</span> : <span className="pf-hint"><Req /> {t("required")}</span>}
            </div>

            <div className="pf-grid">
              {/* Her short user ID, only here (owner, 3 Nov 2026), so she knows what to give when support asks. */}
              {live && me && (
                <div className="pf-f wide">
                  <span className="pf-l">{t("User ID")} <Tip text={t("Give this to Rezekii support when they ask who you are.")} label={t("About your user ID")} /></span>
                  <b className="pf-v pf-uid">
                    <code>{shortId(me.id)}</code>
                    <button type="button" className="v2-iconbtn" aria-label={t("Copy user ID")} onClick={() => navigator.clipboard.writeText(shortId(me.id)).then(() => toast(t("User ID copied")), () => toast(shortId(me.id)))}><Icon name="doc" size={15} /></button>
                  </b>
                </div>
              )}
              <label className="pf-f">
                <span className="pf-l">{t("Name")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{name}</b> : <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} />}
              </label>
              <label className="pf-f pair">
                <span className="pf-l">{t("Birthday")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{new Date(birthday).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "long", year: "numeric" })}</b> : <input className="np-input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />}
              </label>
              <label className="pf-f pair">
                <span className="pf-l">{t("Country")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{countryName(country)}</b> : (
                  <select className="np-input" value={country} onChange={(e) => { const c = COUNTRIES.find((x) => x.code === e.target.value); setCountry(e.target.value); setState(""); if (c) { setCc(`+${c.dial}`); setVerified(false); } }}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                )}
              </label>
              <label className="pf-f pair">
                <span className="pf-l">{t("State")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{state}</b> : country === "MY" ? (
                  <select className="np-input" value={state} onChange={(e) => setState(e.target.value)}>
                    {!state && <option value="">{t("Pick one")}</option>}
                    {MY_STATES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                ) : (
                  <input className="np-input" autoComplete="address-level1" placeholder={t("State / Province / Region")} value={state} onChange={(e) => setState(e.target.value)} />
                )}
              </label>

              <div className="pf-f wide">
                <span className="pf-l">{t("WhatsApp number")} {!locked && <Req />}</span>
                {locked ? (
                  <b className="pf-v">{cc} {local ? prettyNum(cc, local) : phone}</b>
                ) : (
                  <span className="cr2-phone">
                    <select className="np-input" value={cc} onChange={(e) => { setCc(e.target.value); setVerified(false); }} aria-label={t("Country code")}>
                      {CODES.map(([code, short]) => <option key={code} value={code}>{short} {code}</option>)}
                    </select>
                    <input id="cr2-wa" className="np-input" inputMode="tel" value={phone} aria-label={t("WhatsApp number")} placeholder={cc === "+60" ? "12-345 6789" : t("Mobile number")} onChange={(e) => { setPhone(e.target.value); setVerified(false); }} onBlur={() => local && setPhone(prettyNum(cc, local))} />
                  </span>
                )}
                <span className="pf-sub">
                  {!local && !locked && (tried || phone.trim()) ? <span className="cr2-red" style={{ fontWeight: 700 }}>{cc === "+60" ? t("Enter a Malaysian mobile number, e.g. 12-345 6789") : t("Enter a mobile number")}</span> : null}
                  {verified ? (
                    <span className="badge"><Icon name="check" size={13} width={3} /> {t("Verified")}</span>
                  ) : live ? null : (
                    <button type="button" className="np-btn v2-btn-sm cr2-wabtn" disabled={!intl} onClick={() => setWaSheet(true)}>
                      <Icon name="whatsapp" size={16} /> {t("Verify")}
                    </button>
                  )}
                </span>
              </div>

              <div className="pf-f">
                <span className="pf-l">{t("Gender")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{t(gender)}</b> : <Seg value={t(gender)} options={GENDERS.map((x) => t(x))} onChange={(v) => setGender(GENDERS.find((x) => t(x) === v) ?? gender)} />}
              </div>
              <div className="pf-f">
                <span className="pf-l">{t("Race")} {(!locked || !raceSaved) && <Req />}</span>
                {locked && raceSaved ? <b className="pf-v">{t(race)}</b> : (
                  <select className="np-input" style={{ maxWidth: 260 }} value={race} aria-label={t("Race")} onChange={(e) => {
                    setRace(e.target.value);
                    // Saved profiles can still add it once (owner, 31 Oct 2026).
                    if (locked && live && e.target.value) void saveProfile("creator", { name, birthday, country, state, whatsapp: intl, gender, race: e.target.value, types, niches: [niche, sub1, sub2].filter(Boolean) }).then(() => { setRaceSaved(true); toast(t("Race saved")); }).catch((err: Error) => toast(t(err.message)));
                  }}>
                    <option value="">{t("Choose")}</option>
                    {RACES.map((r) => <option key={r} value={r}>{t(r)}</option>)}
                  </select>
                )}
              </div>
              <div className="pf-f">
                <span className="pf-l">{t("Creator type")} {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{types.map((x) => t(x)).join(", ")}</b> : (
                  <div className="v2-chips">
                    {TYPES.map((ty) => {
                      const on = types.includes(ty);
                      return (
                        <button key={ty} type="button" aria-pressed={on} className={`v2-chip ${on ? "on" : ""}`} onClick={() => setTypes((l) => (on ? l.filter((x) => x !== ty) : [...l, ty]))}>
                          {on && <Icon name="check" size={14} width={3} />}{t(ty)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pf-f wide">
                <span className="pf-l">{t("Niches")} {!locked && <Req />}</span>
                {locked ? (
                  <b className="pf-v">{[niche, sub1, sub2].filter(Boolean).map((x) => t(x)).join(" · ")}</b>
                ) : (
                  <span className="pf-niches">
                    <select className="np-input" value={niche} onChange={(e) => setNiche(e.target.value)} aria-label={t("Main niche")}>
                      {!niche && <option value="">{t("Pick one")}</option>}
                      {NICHES.map((n) => <option key={n} value={n}>{t(n)}</option>)}
                    </select>
                    <select className="np-input" value={sub1} onChange={(e) => setSub1(e.target.value)} aria-label={t("Second niche, optional")}>
                      <option value="">{t("2nd (optional)")}</option>
                      {NICHES.filter((n) => n !== niche).map((n) => <option key={n} value={n}>{t(n)}</option>)}
                    </select>
                    <select className="np-input" value={sub2} onChange={(e) => setSub2(e.target.value)} aria-label={t("Third niche, optional")}>
                      <option value="">{t("3rd (optional)")}</option>
                      {NICHES.filter((n) => n !== niche && n !== sub1).map((n) => <option key={n} value={n}>{t(n)}</option>)}
                    </select>
                  </span>
                )}
              </div>
            </div>

            {profileErrors.length > 0 && tried && <ul className="pf-err" role="alert">{profileErrors.map((x) => <li key={x}>{x}</li>)}</ul>}
            <div className="pf-foot">
              {locked ? (
                <>
                  <span>{t("Need a change? Ask support.")}</span>
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => setChangeSheet(true)}><Icon name="edit" size={15} /> {t("Request a Change")}</button>
                </>
              ) : (
                <>
                  <span>{t("Once saved, only support can change it.")}</span>
                  <button type="button" className="np-btn" onClick={() => { setTried(true); if (!profileErrors.length) setConfirmSave(true); }}>{t("Save Profile")}</button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="cr2-group">
          <h2>{t("Delivery Address")} <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>· {t("optional")}</span></h2>
          <p style={{ color: "var(--body)" }}>
            {t("Needed for your Rate Card, so sellers can send products for paid reviews. Free Samples use your TikTok address.")}
          </p>
          <AddressForm value={addr} onChange={setAddr} save={saveAddr} />
        </section>

          </>
        )}

        {tab === "connections" && live && (
        <section className="cr2-group">
          <h2>{t("Connections")}</h2>
          <div className="cr2-cells">
            <div className="cr2-cell row">
              <BrandLogo name="TikTok Shop" size={34} className="cr2-pi" />
              <span className="cr2-conn"><b>TikTok Shop</b>{me?.shop?.expired ? <small className="cr2-lost">@{me.shop.handle} · {t("Link expired. Re-link to keep your data updating.")}</small> : <small>{me?.shop ? `@${me.shop.handle}${me.shop.access && me.shop.access !== "approved" ? ` · ${t("waiting for approval")}` : ""}` : t("Not linked")}{me?.shop?.noLive && <span className="cr2-lost"> · {t("LIVE data not allowed")}</span>}</small>}</span>
              {/* A link that ended (owner, 2 Nov 2026) turns into a red Re-link, so she notices. */}
              {me?.shop?.expired ? <button type="button" className="np-btn v2-btn-sm cr2-relink" onClick={() => setLinked(true)}><Icon name="refresh" size={15} /> {t("Re-link")}</button>
                : me?.shop ? (
                  <span className="cr2-connbtns">
                    {/* Linked without LIVE data (owner, 3 Nov 2026): link again with that box ticked. */}
                    {me.shop.noLive && <button type="button" className="np-btn v2-btn-sm cr2-relink" onClick={() => setLinked(true)}><Icon name="refresh" size={15} /> {t("Allow LIVE Data")}</button>}
                    {/* Change Account (owner, 2 Nov 2026): link a different TikTok Shop in its place, in one step. */}
                    <button type="button" className="btn-outline v2-btn-sm" onClick={() => setChanging(true)}>{t("Change Account")}</button>
                    <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlink(true)}>{t("Unlink")}</button>
                  </span>
                ) : <button type="button" className="np-btn v2-btn-sm" onClick={() => setLinked(true)}>{t("Link")}</button>}
            </div>
            {chans === null && <Loading text={t("Loading your accounts…")} inline />}
            {chans !== null && (["tiktok", "facebook", "instagram", "threads"] as const).map((app) => {
              // Labels in Title Case (owner, 3 Nov 2026: "TikTok Account", "Add Another TikTok Account").
              const label = { tiktok: t("TikTok Account"), facebook: t("Facebook Page"), instagram: "Instagram", threads: "Threads" }[app];
              const icon = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" }[app] as "TikTok" | "Facebook" | "Instagram" | "Threads";
              const mine = chans.filter((c) => c.app === app);
              return (
                <Fragment key={app}>
                  {mine.map((c) => (
                    <div key={c.key} className="cr2-cell row">
                      <PlatformIcon name={icon} size={34} />
                      <span className="cr2-conn"><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? ` · ${t("needs reconnecting")}` : ""}</small></span>
                      {c.status === "reconnect" && <button type="button" className="np-btn v2-btn-sm" onClick={() => connectApp(app)}><Icon name="refresh" size={15} /> {t("Reconnect")}</button>}
                      <button type="button" className="btn-outline v2-btn-sm" onClick={() => void disconnect(c)}>{t("Disconnect")}</button>
                    </div>
                  ))}
                  <div className="cr2-cell row">
                    <PlatformIcon name={icon} size={34} />
                    <span className="cr2-conn"><b>{mine.length ? t("Add Another {account}", { account: label }) : label}</b><small>{mine.length ? t("Connect one more") : t("Not connected")}</small></span>
                    {can(app) ? <button type="button" className={mine.length ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"} onClick={() => connectApp(app)}>{t("Connect")}</button> : <NotYet app={app} />}
                  </div>
                </Fragment>
              );
            })}
            {chans !== null && shopeeOn ? <ShopeeAccounts chans={chans} from="account" row="cr2-cell row" reload={() => void loadChans()} /> : (
              <div className="cr2-cell row">
                <BrandLogo name="Shopee" size={34} className="cr2-pi" />
                <span className="cr2-conn"><b>Shopee</b><small>{t("Shopee Affiliate, on the way")}</small></span>
                <span className="badge badge-amber">{t("Coming Soon")}</span>
              </div>
            )}
          </div>
        </section>
        )}
        {tab === "connections" && !live && (
        <section className="cr2-group">
          <h2>{t("Connections")}</h2>
          <div className="cr2-cells">
            {socials.map((s) => (
              <div key={s.key} className="cr2-cell row">
                {s.icon}
                <span className="cr2-conn">
                  <b>{s.label}</b>
                  <small>{s.detail}</small>
                </span>
                {s.soon ? (
                  <span className="badge badge-amber">{t("Coming Soon")}</span>
                ) : !s.on && s.key !== "TikTok Shop" && !can(s.key.toLowerCase() as "tiktok") ? (
                  <NotYet app={s.key.toLowerCase() as "tiktok"} />
                ) : s.on && s.key === "TikTok Shop" ? (
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlink(true)}>{t("Unlink")}</button>
                ) : s.on ? (
                  <button
                    type="button"
                    className="btn-outline v2-btn-sm"
                    onClick={() => toast(t("{account} reconnected", { account: s.label }))}
                  >
                    <Icon name="refresh" size={15} /> {t("Reconnect")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="np-btn v2-btn-sm"
                    onClick={() => { if (s.key === "TikTok Shop") return setLinked(true); setConn((c) => ({ ...c, [s.key]: true })); toast(t("{account} connected", { account: s.label })); }}
                  >
                    {s.key === "TikTok Shop" ? t("Link") : t("Connect")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        {tab === "level" && <LevelBadges />}
        {tab === "wallet" && <Wallet />}
        {tab === "referral" && <Referral />}
        {tab === "samples" && (live ? <LiveSamples /> : <MySamples />)}
        {tab === "wish" && <MyWishes />}

        {tab === "rate-card" && <RateCard />}

        {tab === "settings" && (
          <>
        <section className="cr2-group">
          <h2>{t("Login & Security")}</h2>
          <div className="cr2-cells">
            {/* Owner, 28 Oct 2026: remind people which account they sign in with. */}
            <div className="cr2-cell stack">
              <span className="lbl">{t("How you sign in")}</span>
              {ways ? (
              <div className="si-methods">
                <span className={`si-m ${ways.tiktok ? "on" : ""}`}>
                  <span className="si-ico tt" aria-hidden="true"><TikTokMark size={18} /></span>
                  <span><b>TikTok</b><small>{ways.tiktok ? t("Signed in as {name}", { name: ways.tiktok }) : t("Not linked")}</small></span>
                  {ways.tiktok ? <span className="badge">{t("Linked")}</span> : can("tiktok") ? <a className="btn-outline v2-btn-sm" href="/api/auth/tiktok/start">{t("Link")}</a> : <NotYet app="tiktok" />}
                </span>
                <span className={`si-m ${ways.google ? "on" : ""}`}>
                  <span className="si-ico gg" aria-hidden="true"><GoogleMark /></span>
                  <span><b>Google</b><small>{ways.google ? t("Linked to {email}", { email: ways.google }) : t("Not linked")}</small></span>
                  {ways.google && <span className="badge">{t("Linked")}</span>}
                </span>
                <span className={`si-m ${ways.password ? "on" : ""}`}>
                  <span className="si-ico em" aria-hidden="true"><Icon name="lock" size={15} /></span>
                  <span><b>{t("Email and password")}</b><small>{ways.password ? `${ways.email ?? me?.email ?? ""}` : t("No password yet")}</small></span>
                  <span className="si-acts">
                    {ways.password && <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setNewEmail(""); setCurPw(""); setEmailSheet(true); }}>{t("Change Email")}</button>}
                    <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setPw(["", "", ""]); setPwSheet(true); }}>{ways.password ? t("Change Password") : t("Set Password")}</button>
                  </span>
                </span>
              </div>
              ) : (
              <div className="si-methods">
                {([
                  ["TikTok", t("Signed in as {name}", { name: you.handle }), true, "tt"],
                  ["Google", googleOn ? t("Linked to {email}", { email: you.email }) : t("Not linked"), googleOn, "gg"],
                  [t("Email and password"), hasPw ? t("{email} · password changed {date}", { email, date: new Date("2026-03-03T12:00:00Z").toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" }) }) : t("{email} · no password yet", { email }), hasPw, "em"],
                ] as [string, string, boolean, string][]).map(([label, detail, on, key]) => (
                  <span key={key} className={`si-m ${on ? "on" : ""}`}>
                    <span className={`si-ico ${key}`} aria-hidden="true">{key === "tt" ? <TikTokMark size={18} /> : key === "gg" ? <GoogleMark /> : <Icon name="lock" size={15} />}</span>
                    <span><b>{label}</b><small>{detail}</small></span>
                    {/* Each way in names its account (owner, 29 Oct 2026): her TikTok handle and her Gmail. */}
                    {key === "tt" ? <span className="badge">{t("Last Used")}</span>
                      : key === "gg" ? <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setGoogleOn(!googleOn); toast(googleOn ? t("Google unlinked") : t("Google linked")); }}>{googleOn ? t("Unlink") : t("Link")}</button>
                      : (
                        <span className="si-acts">
                          <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setNewEmail(""); setEmailSheet(true); }}>{t("Change Email")}</button>
                          <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setPw(["", "", ""]); setPwSheet(true); }}>{hasPw ? t("Change Password") : t("Set Password")}</button>
                        </span>
                      )}
                  </span>
                ))}
              </div>
              )}
            </div>
          </div>
        </section>

        <section className="cr2-group">
          <h2>{t("Privacy & Your Data")}</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">{t("Consent")}</span>
              <span className="val v2-muted">{live ? (me?.shop ? t("Given when you linked TikTok Shop") : t("None. TikTok Shop isn't linked.")) : consent && !consent.unlinkedAt ? t("Terms v{terms} · Privacy v{privacy} · {date}", { terms: consent.terms, privacy: consent.privacy, date: consent.at }) : t("None. TikTok Shop isn't linked.")}</span>
            </div>
            {live ? (
              <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent(t("A copy of my Rezekii data"))}`} className="cr2-cell cr2-cellbtn">
                <span className="lbl">{t("Download my data")}</span>
                <span className="chev">{t("Ask support")} <Icon name="arrow" size={16} /></span>
              </a>
            ) : (
            <button type="button" className="cr2-cell cr2-cellbtn" onClick={() => toast(t("We'll email you a copy of your data within 7 days"))}>
              <span className="lbl">{t("Download my data")}</span>
              <span className="chev">{t("Email me a copy")} <Icon name="arrow" size={16} /></span>
            </button>
            )}
            <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer" className="cr2-cell cr2-cellbtn" onClick={(e) => { if (live) return; e.preventDefault(); toast(t("Opening the Privacy Policy")); }}>
              <span className="lbl">{t("Privacy Policy")}</span>
              <span className="chev">v1.0 · {new Date("2026-10-28T12:00:00Z").toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" })} <Icon name="arrow" size={16} /></span>
            </a>
          </div>
          <p>{t("Your earnings are private. Sellers never see your sales unless you share.")}</p>
        </section>

        <section className="cr2-group">
          <h2>{t("Notifications")}</h2>
          <PushSwitch side="creator" />
          <div className="cr2-cells">
            <div className="cr2-notifyhead"><span>{t("Tell me about")}</span><span>{t("In-app")}</span><span>{t("Email")}</span></div>
            {live && !inApp && <LoadPrefs onLoad={setInApp} />}
            {NOTIFY.map((n) => (
              <div key={n.key} className="cr2-notify">
                <span>
                  <b>{t(n.label)}</b>
                  <small>{t(n.note)}</small>
                </span>
                {[0, 1].map((ch) => {
                  const on = live ? ch === 0 && (inApp?.[n.key] ?? true) : notify[n.key][ch];
                  return (
                    <button
                      key={ch}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={ch === 0 ? t("{item} by in-app", { item: t(n.label) }) : t("{item} by email", { item: t(n.label) })}
                      className={`np-switch ${on ? "on" : ""}`}
                      disabled={live && (ch === 1 || !inApp)}
                      onClick={() => {
                        if (live) {
                          setInApp((s) => ({ ...s, [n.key]: !on }));
                          fetch("/api/v2/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side: "creator", prefs: { [n.key]: !on } }) })
                            .then((r) => { if (!r.ok) throw new Error(); notesChanged(); })
                            .catch(() => { setInApp((s) => ({ ...s, [n.key]: on })); toast(t("Didn't save. Please try again.")); });
                          return;
                        }
                        setNotify((s) => {
                          const next: [boolean, boolean] = [...s[n.key]] as [boolean, boolean];
                          next[ch] = !next[ch];
                          return { ...s, [n.key]: next };
                        });
                      }}
                    >
                      <span />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p>{live ? t("Email alerts aren't on yet; everything shows in Notifications. Reminders to reconnect an account always show.") : t("No marketing messages unless you ask.")}</p>
        </section>

        <section className="cr2-group">
          <h2>{t("Language & Appearance")}</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">{t("Language")}</span>
              <span className="val"><Seg value={langLabel} options={LANGS.map(([, l]) => l)} onChange={(l) => { if (!langBusy) pickLang(LANGS.find(([, x]) => x === l)![0]); }} /></span>
            </div>
            {/* Phones switch theme from the sun/moon icon in the account panel (owner, 29 Oct 2026). */}
            <div className="cr2-cell acc-theme-row">
              <span className="lbl">{t("Theme")}</span>
              <span className="val"><Seg value={t(theme)} options={THEMES.map((x) => t(x))} onChange={(v) => pickTheme(THEMES.find((x) => t(x) === v) ?? theme)} /></span>
            </div>
          </div>
          <p className="acc-theme-row">{t("Auto matches your device.")}</p>
        </section>
        <section className="cr2-group acc-in-panel">
          <h2>{t("Help & Feedback")}</h2>
          {live && <MyMessages />}
          <div className="cr2-cells">
            {/* The page footer is hidden on phones, so its links live here (owner, 29 Oct 2026). */}
            <a className="cr2-cell acc-link" href={SUPPORT.waLink} target="_blank" rel="noreferrer"><span className="lbl">{t("Contact Support")}</span><span className="v2-small">WhatsApp {SUPPORT.wa}</span><Icon name="arrow" size={16} /></a>
            <a className="cr2-cell acc-link" href="https://rezekii.com/privacy" target="_blank" rel="noreferrer"><span className="lbl">{t("Privacy Policy")}</span><Icon name="arrow" size={16} /></a>
            <a className="cr2-cell acc-link" href="https://rezekii.com/terms" target="_blank" rel="noreferrer"><span className="lbl">{t("Terms of Service")}</span><Icon name="arrow" size={16} /></a>
            {/* The same full feedback form as the account panel (owner, 30 Oct 2026). */}
            <button type="button" className="cr2-cell cr2-cellbtn acc-link" onClick={() => setFeedback(true)}><span className="lbl">{t("Send Feedback")}</span><span className="v2-small">{t("Ideas, Bugs, Questions")}</span><Icon name="arrow" size={16} /></button>
            <a href={`mailto:${SUPPORT.email}`} className="cr2-cell cr2-cellbtn">
              <span className="lbl">{t("Email Support")}</span>
              <span className="chev">support@rezekii.com <Icon name="arrow" size={16} /></span>
            </a>
            {/* The beginner guide (owner, 4 Nov 2026), instead of the preview's page list. */}
            <Link href="/app/guide" className="cr2-cell cr2-cellbtn">
              <span className="lbl">{t("How to Use Rezekii")}</span>
              <span className="chev">{t("Guide")} <Icon name="arrow" size={16} /></span>
            </Link>
          </div>
        </section>

        <section className="cr2-group">
          <h2>{t("Account")}</h2>
          <div className="cr2-cells">
            <button type="button" className="cr2-cell cr2-cellbtn danger" onClick={() => { setDelText(""); setDelSheet(true); }}>{t("Delete Account")}</button>
          </div>
        </section>

          </>
        )}
      </div>
      {confirmSave && (
        <Sheet title={t("Save Your Profile?")} onClose={() => setConfirmSave(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>{t("After saving, only support can change it.")}</p>
          <dl className="pf-sum">
            <div><dt>{t("Name")}</dt><dd>{name}</dd></div>
            <div><dt>{t("Country")}</dt><dd>{countryName(country)}</dd></div>
            <div><dt>{t("State")}</dt><dd>{state}</dd></div>
            <div><dt>WhatsApp</dt><dd>{cc} {local ? prettyNum(cc, local) : ""}</dd></div>
            <div><dt>{t("Gender")}</dt><dd>{t(gender)}</dd></div>
            <div><dt>{t("Race")}</dt><dd>{race && t(race)}</dd></div>
            <div><dt>{t("Creator type")}</dt><dd>{types.map((x) => t(x)).join(", ")}</dd></div>
            <div><dt>{t("Niches")}</dt><dd>{[niche, sub1, sub2].filter(Boolean).map((x) => t(x)).join(" · ")}</dd></div>
          </dl>
          <button type="button" className="np-btn" disabled={saving} onClick={() => { if (live) { void saveReal(); return; } setLocked(true); setConfirmSave(false); toast(t("Profile saved")); }}>{saving ? t("Saving…") : t("Save Profile")}</button>
          <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setConfirmSave(false)}>{t("Keep Editing")}</button>
        </Sheet>
      )}
      {switcher && <AccountSwitcher app="creator" onClose={() => setSwitcher(false)} />}
      {feedback && (
        <Sheet title={t("Send Feedback")} onClose={() => setFeedback(false)}>
          <FeedbackForm onDone={() => setFeedback(false)} />
        </Sheet>
      )}
      {changeSheet && (
        <Sheet title={t("Request a Change")} onClose={() => setChangeSheet(false)}>
          <label className="v2-field">{t("What to change")}
            <select className="np-input" value={change.what} onChange={(e) => setChange({ ...change, what: e.target.value })}>
              {CHANGES.map((x) => <option key={x} value={x}>{t(x)}</option>)}
            </select>
          </label>
          <label className="v2-field">{t("Change it to")}<input className="np-input" value={change.to} onChange={(e) => setChange({ ...change, to: e.target.value })} placeholder={t("New value")} /></label>
          <label className="v2-field">{t("Why")} <span className="pf-opt">{t("Optional")}</span><textarea className="np-input" rows={2} value={change.why} onChange={(e) => setChange({ ...change, why: e.target.value })} placeholder={t("e.g. I changed my number")} /></label>
          {/* Saved to the team's Feedback Inbox as a change request (owner, 1 Nov 2026); the reply comes here in the app. */}
          <button type="button" className="np-btn" disabled={!change.to.trim()} onClick={() => {
            const message = `${change.what}: change to "${change.to.trim()}"${change.why.trim() ? `. Why: ${change.why.trim()}` : ""}`;
            const done = () => { setChangeSheet(false); setChange({ what: "WhatsApp number", to: "", why: "" }); toast(t("Sent. The team's reply shows in Settings › My Messages.")); };
            if (!live) return done();
            fetch("/api/v2/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "Change request", message, page: "/app/account#profile" }) })
              .then((r) => (r.ok ? done() : toast(t("Didn't send. Please try again."))))
              .catch(() => toast(t("Didn't send. Please try again.")));
          }}>{t("Send Request")}</button>
          <p className="v2-small" style={{ margin: 0 }}>{t("The team checks it and replies here in the app.")}</p>
        </Sheet>
      )}
      {waSheet && (
        <Sheet title={t("Verify with WhatsApp")} onClose={() => setWaSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>{t("Free and takes 10 seconds. Confirms {number} has WhatsApp.", { number: `${cc} ${local ? prettyNum(cc, local) : ""}`.trim() })}</p>
          <ol className="cr2-steps">
            <li><i>1</i><span><b>{t("Tap Open WhatsApp.")}</b> {t("The message is ready.")}</span></li>
            <li><i>2</i><span>{rich(t("{send} without changes."), { send: <b>{t("Send it")}</b> })}</span></li>
            <li><i>3</i><span><b>{t("Done.")}</b> {t("Come back here.")}</span></li>
          </ol>
          <div className="cr2-wamsg">REZEKII verify 482 913<br />{t("Please send this message as it is.")}</div>
          <button type="button" className="np-btn cr2-wabtn" disabled={verifying} onClick={verifyNow}>
            <Icon name="whatsapp" size={18} /> {verifying ? t("Waiting for your message…") : t("Open WhatsApp")}
          </button>
          <span className="v2-small" style={{ textAlign: "center" }}>{t("We never send you a code.")}</span>
        </Sheet>
      )}

      {changing && me?.shop && (
        <Sheet title={t("Change TikTok Shop Account")} onClose={() => setChanging(false)}>
          <p style={{ margin: 0 }}>{rich(t("Link a different TikTok Shop account in place of {handle}."), { handle: <b>@{me.shop.handle}</b> })}</p>
          <ul className="v2-small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li>{t("On TikTok's page, make sure you're signed in as the account you want, then approve.")}</li>
            <li>{t("Rezekii then shows that account's sales, showcase and samples. {handle}'s sales stay in TikTok Shop.", { handle: `@${me.shop.handle}` })}</li>
          </ul>
          <button type="button" className="np-btn" onClick={() => { window.location.href = "/api/auth/tiktokshop/start"; }}>{t("Continue to TikTok Shop")}</button>
          <button type="button" className="btn-outline" onClick={() => setChanging(false)}>{t("Keep {handle}", { handle: `@${me.shop.handle}` })}</button>
        </Sheet>
      )}
      {unlink && (
        <Sheet title={t("Unlink TikTok Shop?")} onClose={() => setUnlink(false)}>
          <ul className="cr2-danger" style={{ margin: 0, paddingLeft: 30 }}>
            <li>{t("We stop reading your TikTok Shop data now.")}</li>
            <li>{t("Scans, earnings and payouts are removed. Data deleted within 30 days.")}</li>
            <li>{t("Added products keep their rate until the campaign ends.")}</li>
          </ul>
          <button type="button" className="np-btn cr2-delbtn" onClick={() => { setLinked(false); setUnlink(false); toast(t("TikTok Shop unlinked")); }}>{t("Unlink TikTok Shop")}</button>
          <button type="button" className="btn-outline" onClick={() => setUnlink(false)}>{t("Keep It Linked")}</button>
        </Sheet>
      )}

      {emailSheet && (
        <Sheet title={t("Change Email")} onClose={() => setEmailSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>{ways ? t("Now: {email}.", { email: ways.email ?? me?.email ?? "" }) : t("Now: {email}. Confirm with the link we send.", { email })}</p>
          <label className="v2-field">
            {t("New email")}
            <input type="email" className="np-input" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          {ways && (
            <label className="v2-field">
              {t("Current password")}
              <input type="password" className="np-input" autoComplete="current-password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </label>
          )}
          <button
            type="button"
            className="np-btn"
            disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) || (!!ways && !curPw) || busyAcct}
            onClick={() => { if (ways) return void emailLogin({ email: newEmail, current: curPw }, t("Email changed")); setEmail(newEmail); setEmailSheet(false); toast(t("Link sent to {email}", { email: newEmail })); }}
          >
            {ways ? t("Change email") : t("Send link")}
          </button>
        </Sheet>
      )}

      {delSheet && (
        <Sheet title={t("Delete Account")} onClose={() => setDelSheet(false)}>
          <div className="cr2-danger">
            <b>{t("This can't be undone.")}</b>
            <ul>
              <li>{t("Your profile, connections and credits are removed.")}</li>
              <li>{live ? t("Finish samples in progress first, or they're marked undelivered.") : t("Finish samples in progress ({n}) first, or they're marked undelivered.", { n: active })}</li>
              <li>{t("TikTok still pays commission it owes you.")}</li>
            </ul>
          </div>
          <label className="v2-field">
            {t("Type DELETE to confirm")}
            <input className="np-input" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="np-btn cr2-delbtn" disabled={delText !== "DELETE" || busyAcct} onClick={() => { if (live) return void deleteReal(); setDelSheet(false); toast(t("Preview only: nothing was deleted")); }}>
            {t("Delete my account")}
          </button>
          <button type="button" className="btn-outline" onClick={() => setDelSheet(false)}>{t("Keep My Account")}</button>
        </Sheet>
      )}

      {pwSheet && (
        <Sheet title={(ways ? ways.password : hasPw) ? t("Change Password") : t("Set a Password")} onClose={() => setPwSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>{(ways ? ways.password : hasPw) ? t("For signing in with {email}.", { email: (ways ? ways.email ?? me?.email : email) ?? "" }) : t("Sign in with {email} too.", { email: ways ? me?.email ?? t("your email") : email })}</p>
          {(ways ? ways.password : hasPw) && (
            <label className="v2-field">
              {t("Current password")}
              <input type="password" className="np-input" autoComplete="current-password" value={pw[0]} onChange={(e) => setPw([e.target.value, pw[1], pw[2]])} />
              {!ways && <button type="button" className="v2-link" style={{ alignSelf: "flex-start", fontSize: 13 }} onClick={() => { setPwSheet(false); toast(t("Reset link sent to {email}", { email })); }}>{t("Email Me a Reset Link")}</button>}
            </label>
          )}
          <label className="v2-field">
            {t("New password")}
            <input type="password" className="np-input" autoComplete="new-password" value={pw[1]} onChange={(e) => setPw([pw[0], e.target.value, pw[2]])} />
            <small>{t("At least {n} characters", { n: 8 })}</small>
          </label>
          <label className="v2-field">
            {t("Type it again")}
            <input type="password" className="np-input" autoComplete="new-password" value={pw[2]} onChange={(e) => setPw([pw[0], pw[1], e.target.value])} />
            {pw[2] && pw[1] !== pw[2] && <small className="cr2-red">{t("Doesn't match")}</small>}
          </label>
          <button
            type="button"
            className="np-btn"
            disabled={((ways ? ways.password : hasPw) && !pw[0]) || pw[1].length < 8 || pw[1] !== pw[2] || busyAcct}
            onClick={() => {
              if (ways) return void emailLogin(ways.password ? { password: pw[1], current: pw[0] } : { email: me?.email ?? undefined, password: pw[1] }, ways.password ? t("Password changed") : t("Password set"));
              setHasPw(true); setPw(["", "", ""]); setPwSheet(false); toast(hasPw ? t("Password changed. Other devices are signed out.") : t("Password set"));
            }}
          >
            {(ways ? ways.password : hasPw) ? t("Change Password") : t("Save Password")}
          </button>
        </Sheet>
      )}
    </div>
  );
}
