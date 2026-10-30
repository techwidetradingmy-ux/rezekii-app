"use client";

import { FeedbackForm } from "@/components/feedback-form";
import { SUPPORT } from "@/lib/support";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo, useWho } from "@/components/demo";
import { Seg, Sheet, Title } from "@/components/ui";
import { useSideScroll } from "@/components/side-scroll";
import { PlatformIcon } from "@/components/creator2/bits";
import { CREATOR, MY_SAMPLES, SOCIALS } from "@/lib/mock";
import { LiveSamples, MySamples } from "@/components/creator1/my-samples";
import { LevelFace } from "@/components/level-face";
import { LevelBadges } from "@/components/account/level-badges";
import { Referral } from "@/components/account/referral";
import { RateCard } from "@/components/account/rate-card";
import { Wallet } from "@/components/account/wallet";
import { AddressFields } from "@/components/account/address-fields";
import { SAMPLE_INFO, addressOk, birthdayError, readSignup, useAddress, type Address } from "@/lib/address";
import type { IconName } from "@/components/icons";
import { MY_STATES, NICHES, NOTIFY } from "@/lib/mock-creator2";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { BrandLogo } from "@/components/brand-logos";
import { MyWishes } from "@/components/creator1/my-wishes";
import { ACCOUNT_TABS, type AccountTab } from "@/lib/account-tabs";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { loadProfile, loadWallet, saveProfile } from "@/lib/live-rewards";
import "@/app/creator2.css";

const TYPES = ["Affiliate", "UGC", "Artist", "Influencer"] as const;
const TABS = ACCOUNT_TABS;
type TabKey = AccountTab;
const active = MY_SAMPLES.filter((x) => !["Done", "Not approved"].includes(x.status)).length;

/** A red star for a required field. */
const Req = () => <i className="pf-req" title="Required">*</i>;
/** Country codes for WhatsApp numbers (owner, 28 Oct 2026: a fixed format with the code in front). Malaysia first. */
const CODES: [string, string, string][] = [["+60", "MY", "Malaysia"], ["+65", "SG", "Singapore"], ["+62", "ID", "Indonesia"], ["+66", "TH", "Thailand"], ["+63", "PH", "Philippines"], ["+84", "VN", "Vietnam"], ["+673", "BN", "Brunei"], ["+86", "CN", "China"]];
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
export default function Account() {
  const you = useWho();
  const { linked, setLinked, toast, consent, waVerified: verified, setWaVerified: setVerified, live, me } = useDemo();
  const [unlink, setUnlink] = useState(false);
  const [tab, setTab] = useState<TabKey>("profile");
  const tabsRef = useRef<HTMLDivElement>(null);
  useSideScroll(tabsRef, tab);
  const [email, setEmail] = useState(you.email);
  const [emailSheet, setEmailSheet] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [delSheet, setDelSheet] = useState(false);
  const [delText, setDelText] = useState("");

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      const hit = TABS.find(([k]) => k === h);
      if (hit) setTab(hit[0]);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (k: TabKey) => {
    setTab(k);
    window.history.replaceState(null, "", `#${k}`);
    // replaceState fires no hashchange; tell the top bar's page switcher too.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const [name, setName] = useState(you.name);
  const [state, setState] = useState(CREATOR.state);
  const [cc, setCc] = useState("+60");
  const [phone, setPhone] = useState("12-345 6789");
  const [verifying, setVerifying] = useState(false);
  const [waSheet, setWaSheet] = useState(false);
  const [gender, setGender] = useState<"Female" | "Male">("Female");
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
  const [addrTried, setAddrTried] = useState(false);
  const [conn, setConn] = useState<Record<string, boolean>>(Object.fromEntries(SOCIALS.map((s) => [s.name, s.linked])));
  const [notify, setNotify] = useState<Record<string, [boolean, boolean]>>({ samples: [true, true], chances: [true, true], posts: [true, false], rewards: [true, false] });
  const [pwSheet, setPwSheet] = useState(false);
  const [hasPw, setHasPw] = useState(true);
  const [googleOn, setGoogleOn] = useState(true);
  const [pw, setPw] = useState(["", "", ""]);
  const [feedback, setFeedback] = useState(false);
  const [theme, setTheme] = useState<Theme>("Auto");
  const [lang, setLang] = useState<"English" | "中文">("English");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    if (t !== "Auto") applyTheme(t);
  }, []);
  const pickTheme = (t: Theme) => { setTheme(t); applyTheme(t); };

  // Signed in (owner, 31 Oct 2026): her real channels for Connections, and a message when she comes back from connecting one.
  type Chan = { key: string; app: "tiktok" | "facebook" | "instagram" | "threads"; name: string; sub: string; status: "active" | "reconnect" };
  const [chans, setChans] = useState<Chan[] | null>(null);
  const loadChans = () => fetch("/api/v2/publish?part=setup&side=creator", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { channels?: Chan[] } | null) => setChans(d?.channels ?? [])).catch(() => setChans([]));
  useEffect(() => {
    if (!live) return;
    void loadChans();
    const q = new URLSearchParams(window.location.search);
    const result = q.get("connect");
    if (result) {
      const app = ({ tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" } as Record<string, string>)[q.get("channel") ?? ""] ?? "The app";
      toast(result === "ok" ? `${app} connected.` : result === "no_pages" ? "No Facebook Pages were picked. Connect again and tick your Pages." : result === "personal" ? "That Instagram account is personal. Switch it to a Business or Creator account, then connect again." : result === "cancelled" ? `${app} sign-in was cancelled.` : `${app} didn't connect. Please try again.`);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    }
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const connectApp = (app: Chan["app"]) => { window.location.href = app === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${app}/start?from=account`; };
  const disconnect = async (c: Chan) => {
    const r = await fetch(c.app === "tiktok" ? `/api/account/tiktok/${encodeURIComponent(c.key.replace(/^tiktok:/, ""))}` : `/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return toast("Couldn't disconnect. Try again.");
    toast(c.app === "tiktok" ? `${c.name} disconnected. Its scheduled posts moved to drafts.` : `${c.name} disconnected. Its scheduled posts were cancelled.`);
    void loadChans();
  };

  // Signed in (owner, 31 Oct 2026): her saved profile, or an empty one to fill in once; and her real streak.
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(CREATOR.streak);
  const lvName = live && me ? me.level.charAt(0).toUpperCase() + me.level.slice(1) : CREATOR.level;
  useEffect(() => {
    if (!live) return;
    setLoadingProfile(true);
    loadWallet("creator").then((w) => setStreak(w.streak)).catch(() => {});
    loadProfile<{ name: string; birthday: string; state: string; whatsapp: string; gender: "Female" | "Male"; types: string[]; niches: string[] }>("creator")
      .then(({ profile }) => {
        if (profile) {
          const d = profile.details;
          const code = CODES.map((c) => c[0]).filter((c) => d.whatsapp.startsWith(c)).sort((a, b) => b.length - a.length)[0] ?? "+60";
          setName(d.name); setBirthday(d.birthday); setState(d.state); setCc(code); setPhone(d.whatsapp.slice(code.length));
          setGender(d.gender); setTypes(d.types); setNiche(d.niches[0] ?? ""); setSub1(d.niches[1] ?? ""); setSub2(d.niches[2] ?? "");
          setLocked(true);
        } else {
          setName(me?.name ?? ""); setBirthday(""); setState(""); setPhone(""); setTypes([]); setNiche(""); setSub1(""); setSub2("");
          setLocked(false);
        }
      })
      .catch(() => toast("Couldn't load your profile. Please refresh."))
      .finally(() => setLoadingProfile(false));
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveReal = async () => {
    setSaving(true);
    try {
      await saveProfile("creator", { name, birthday, state, whatsapp: intl, gender, types, niches: [niche, sub1, sub2].filter(Boolean) });
      setLocked(true);
      setConfirmSave(false);
      toast("Profile saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const local = digitsFor(cc, phone);
  const intl = local ? `${cc}${local}` : null;
  const profileErrors = [
    !name.trim() && "Enter your name.",
    !state && "Pick your state.",
    !niche && "Pick your main niche.",
    birthdayError(birthday) && `Birthday: ${birthdayError(birthday)}.`,
    !local && "Enter a valid WhatsApp number.",
    types.length === 0 && "Pick at least one creator type.",
  ].filter(Boolean) as string[];
  const verifyNow = () => {
    setVerifying(true);
    toast("Opening WhatsApp…");
    window.setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      setWaSheet(false);
      toast("WhatsApp number verified");
    }, 1800);
  };

  const socials: { key: string; label: string; icon: React.ReactNode; detail: string; on: boolean; soon?: boolean }[] = [
    { key: "TikTok Shop", label: "TikTok Shop", icon: <BrandLogo name="TikTok Shop" size={34} className="cr2-pi" />, detail: linked ? "Linked" : "Not linked", on: linked },
    { key: "TikTok", label: "TikTok account", icon: <PlatformIcon name="TikTok" size={34} />, detail: conn.TikTok ? SOCIALS[0].handle : "Not connected", on: conn.TikTok },
    { key: "Facebook", label: "Facebook Page", icon: <PlatformIcon name="Facebook" size={34} />, detail: conn.Facebook ? SOCIALS[2].handle : "Not connected", on: conn.Facebook },
    { key: "Instagram", label: "Instagram", icon: <PlatformIcon name="Instagram" size={34} />, detail: conn.Instagram ? `${SOCIALS[1].handle} · Reels` : "Not connected", on: conn.Instagram },
    { key: "Threads", label: "Threads", icon: <PlatformIcon name="Threads" size={34} />, detail: conn.Threads ? "@aisyah.glow" : "Not connected", on: conn.Threads },
    // A teaser (owner, 30 Oct 2026): Shopee is on the way, nothing to connect yet.
    { key: "Shopee", label: "Shopee", icon: <BrandLogo name="Shopee" size={34} className="cr2-pi" />, detail: "Shopee Affiliate, on the way", on: false, soon: true },
  ];

  return (
    <div className="v2-stack v2-in" style={{ gap: 22 }}>
      <Title title="My Account" sub="Your details, wallet, samples and settings" />

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
                  <span className="cr2-tick" title="TikTok Shop account linked and approved" aria-label="Verified TikTok Shop account">
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
                <span><i className={`lv ${lvName.toLowerCase()}`}><Icon name="gem" size={15} /></i><b>{lvName}</b><small>Level</small></span>
                <span><i className="st"><Icon name="flame" size={15} /></i><b>{streak} day{streak === 1 ? "" : "s"}</b><small>Streak</small></span>
              </span>
              {/* WhatsApp checks aren't connected yet, so real accounts don't see Verify. */}
              {!verified && !live && <span className="cr2-chips"><button type="button" className="cr2-wachip" onClick={() => setWaSheet(true)}>Verify WhatsApp</button></span>}
            </span>
          </div>
        </div>
        )}

        <div ref={tabsRef} className="acc-tabs nv-noscroll" role="tablist" aria-label="Account sections">
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : undefined} onClick={() => go(k)}>
              <Icon name={icon} size={17} /> {label}
              {k === "samples" && !live && <span className="badge badge-amber">{active}</span>}
            </button>
          ))}
          {/* Sign out at the end of the side menu, in red, on wide screens (owner, 31 Oct 2026). Phones have it in the account panel. */}
          <Link href="/signin?in=1" className="acc-out" onClick={(e) => { if (!live) return; e.preventDefault(); fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/signin?in=1"; }); }}>
            <Icon name="back" size={17} /> Sign out
          </Link>
        </div>
        </aside>

        {tab === "profile" && loadingProfile && <p className="v2-muted">Loading your profile…</p>}
        {tab === "profile" && !loadingProfile && (
          <>
        {/* Owner, 28 Oct 2026: the whole profile in one box; once saved it's locked, and changes go through support. */}
        <section className="cr2-group">
          <div className={`pf-card${locked ? " locked" : ""}`}>
            <div className="pf-head">
              <h2>Your Profile</h2>
              {locked ? <span className="pf-lock"><Icon name="lock" size={14} /> Saved · locked</span> : <span className="pf-hint"><Req /> required</span>}
            </div>

            <div className="pf-grid">
              <label className="pf-f">
                <span className="pf-l">Name {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{name}</b> : <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} />}
              </label>
              <label className="pf-f pair">
                <span className="pf-l">Birthday {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{new Date(birthday).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</b> : <input className="np-input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />}
              </label>
              <label className="pf-f pair">
                <span className="pf-l">State {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{state}</b> : (
                  <select className="np-input" value={state} onChange={(e) => setState(e.target.value)}>
                    {!state && <option value="">Pick one</option>}
                    {MY_STATES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                )}
              </label>

              <div className="pf-f wide">
                <span className="pf-l">WhatsApp number {!locked && <Req />}</span>
                {locked ? (
                  <b className="pf-v">{cc} {local ? prettyNum(cc, local) : phone}</b>
                ) : (
                  <span className="cr2-phone">
                    <select className="np-input" value={cc} onChange={(e) => { setCc(e.target.value); setVerified(false); }} aria-label="Country code">
                      {CODES.map(([code, short, cname]) => <option key={code} value={code} title={cname}>{short} {code}</option>)}
                    </select>
                    <input id="cr2-wa" className="np-input" inputMode="tel" value={phone} aria-label="WhatsApp number" placeholder={cc === "+60" ? "12-345 6789" : "Mobile number"} onChange={(e) => { setPhone(e.target.value); setVerified(false); }} onBlur={() => local && setPhone(prettyNum(cc, local))} />
                  </span>
                )}
                <span className="pf-sub">
                  {!local && !locked && (tried || phone.trim()) ? <span className="cr2-red" style={{ fontWeight: 700 }}>{cc === "+60" ? "Enter a Malaysian mobile number, e.g. 12-345 6789" : "Enter a mobile number"}</span> : null}
                  {verified ? (
                    <span className="badge"><Icon name="check" size={13} width={3} /> Verified</span>
                  ) : live ? null : (
                    <button type="button" className="np-btn v2-btn-sm cr2-wabtn" disabled={!intl} onClick={() => setWaSheet(true)}>
                      <Icon name="whatsapp" size={16} /> Verify
                    </button>
                  )}
                </span>
              </div>

              <div className="pf-f">
                <span className="pf-l">Gender {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{gender}</b> : <Seg value={gender} options={["Female", "Male"] as const} onChange={setGender} />}
              </div>
              <div className="pf-f">
                <span className="pf-l">Creator type {!locked && <Req />}</span>
                {locked ? <b className="pf-v">{types.join(", ")}</b> : (
                  <div className="v2-chips">
                    {TYPES.map((t) => {
                      const on = types.includes(t);
                      return (
                        <button key={t} type="button" aria-pressed={on} className={`v2-chip ${on ? "on" : ""}`} onClick={() => setTypes((l) => (on ? l.filter((x) => x !== t) : [...l, t]))}>
                          {on && <Icon name="check" size={14} width={3} />}{t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pf-f wide">
                <span className="pf-l">Niches {!locked && <Req />}</span>
                {locked ? (
                  <b className="pf-v">{[niche, sub1, sub2].filter(Boolean).join(" · ")}</b>
                ) : (
                  <span className="pf-niches">
                    <select className="np-input" value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Main niche">
                      {!niche && <option value="">Pick one</option>}
                      {NICHES.map((n) => <option key={n}>{n}</option>)}
                    </select>
                    <select className="np-input" value={sub1} onChange={(e) => setSub1(e.target.value)} aria-label="Second niche, optional">
                      <option value="">2nd (optional)</option>
                      {NICHES.filter((n) => n !== niche).map((n) => <option key={n}>{n}</option>)}
                    </select>
                    <select className="np-input" value={sub2} onChange={(e) => setSub2(e.target.value)} aria-label="Third niche, optional">
                      <option value="">3rd (optional)</option>
                      {NICHES.filter((n) => n !== niche && n !== sub1).map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </span>
                )}
              </div>
            </div>

            {profileErrors.length > 0 && tried && <ul className="pf-err" role="alert">{profileErrors.map((x) => <li key={x}>{x}</li>)}</ul>}
            <div className="pf-foot">
              {locked ? (
                <>
                  <span>Need a change? Ask support.</span>
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => setChangeSheet(true)}><Icon name="whatsapp" size={15} /> Contact support</button>
                </>
              ) : (
                <>
                  <span>Once saved, only support can change it.</span>
                  <button type="button" className="np-btn" onClick={() => { setTried(true); if (!profileErrors.length) setConfirmSave(true); }}>Save profile</button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="cr2-group">
          <h2>Delivery Address <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>· optional</span></h2>
          <p style={{ color: "var(--body)" }}>
            Needed for your Rate Card, so sellers can send products for paid reviews. Free Samples use your TikTok address.
          </p>
          <AddressFields value={addr} onChange={setAddr} tried={addrTried} />
          <button type="button" className="btn-outline" style={{ alignSelf: "flex-start" }} onClick={() => { setAddrTried(true); if (!addressOk(addr)) return; saveAddr(addr); toast("Address saved"); }}>Save Address</button>
        </section>

          </>
        )}

        {tab === "connections" && live && (
        <section className="cr2-group">
          <h2>Connections</h2>
          <div className="cr2-cells">
            <div className="cr2-cell row">
              <BrandLogo name="TikTok Shop" size={34} className="cr2-pi" />
              <span className="cr2-conn"><b>TikTok Shop</b><small>{me?.shop ? `@${me.shop.handle}${me.shop.access && me.shop.access !== "approved" ? " · waiting for approval" : ""}` : "Not linked"}</small></span>
              {me?.shop ? <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlink(true)}>Unlink</button> : <button type="button" className="np-btn v2-btn-sm" onClick={() => setLinked(true)}>Link</button>}
            </div>
            {chans === null && <p className="v2-muted" style={{ margin: "8px 0" }}>Loading your accounts…</p>}
            {chans !== null && (["tiktok", "facebook", "instagram", "threads"] as const).map((app) => {
              const label = { tiktok: "TikTok account", facebook: "Facebook Page", instagram: "Instagram", threads: "Threads" }[app];
              const icon = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" }[app] as "TikTok" | "Facebook" | "Instagram" | "Threads";
              const mine = chans.filter((c) => c.app === app);
              return (
                <Fragment key={app}>
                  {mine.map((c) => (
                    <div key={c.key} className="cr2-cell row">
                      <PlatformIcon name={icon} size={34} />
                      <span className="cr2-conn"><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span>
                      {c.status === "reconnect" && <button type="button" className="np-btn v2-btn-sm" onClick={() => connectApp(app)}><Icon name="refresh" size={15} /> Reconnect</button>}
                      <button type="button" className="btn-outline v2-btn-sm" onClick={() => void disconnect(c)}>Disconnect</button>
                    </div>
                  ))}
                  <div className="cr2-cell row">
                    <PlatformIcon name={icon} size={34} />
                    <span className="cr2-conn"><b>{mine.length ? `Add another ${label}` : label}</b><small>{mine.length ? "Connect one more" : "Not connected"}</small></span>
                    <button type="button" className={mine.length ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"} onClick={() => connectApp(app)}>Connect</button>
                  </div>
                </Fragment>
              );
            })}
            <div className="cr2-cell row">
              <BrandLogo name="Shopee" size={34} className="cr2-pi" />
              <span className="cr2-conn"><b>Shopee</b><small>Shopee Affiliate, on the way</small></span>
              <span className="badge badge-amber">Coming soon</span>
            </div>
          </div>
        </section>
        )}
        {tab === "connections" && !live && (
        <section className="cr2-group">
          <h2>Connections</h2>
          <div className="cr2-cells">
            {socials.map((s) => (
              <div key={s.key} className="cr2-cell row">
                {s.icon}
                <span className="cr2-conn">
                  <b>{s.label}</b>
                  <small>{s.detail}</small>
                </span>
                {s.soon ? (
                  <span className="badge badge-amber">Coming soon</span>
                ) : s.on && s.key === "TikTok Shop" ? (
                  <button type="button" className="btn-outline v2-btn-sm" onClick={() => setUnlink(true)}>Unlink</button>
                ) : s.on ? (
                  <button
                    type="button"
                    className="btn-outline v2-btn-sm"
                    onClick={() => toast(`${s.label} reconnected`)}
                  >
                    <Icon name="refresh" size={15} /> Reconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    className="np-btn v2-btn-sm"
                    onClick={() => { if (s.key === "TikTok Shop") return setLinked(true); setConn((c) => ({ ...c, [s.key]: true })); toast(`${s.label} connected`); }}
                  >
                    {s.key === "TikTok Shop" ? "Link" : "Connect"}
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
          <h2>Login & Security</h2>
          <div className="cr2-cells">
            {/* Owner, 28 Oct 2026: remind people which account they sign in with. */}
            <div className="cr2-cell stack">
              <span className="lbl">How you sign in</span>
              <div className="si-methods">
                {([
                  ["TikTok", `Signed in as ${you.handle}`, true, "tt"],
                  ["Google", googleOn ? `Linked to ${you.email}` : "Not linked", googleOn, "gg"],
                  ["Email and password", hasPw ? `${email} · password changed 3 Mar 2026` : `${email} · no password yet`, hasPw, "em"],
                ] as [string, string, boolean, string][]).map(([label, detail, on, key]) => (
                  <span key={key} className={`si-m ${on ? "on" : ""}`}>
                    <span className={`si-ico ${key}`} aria-hidden="true">{key === "tt" ? <TikTokMark size={18} /> : key === "gg" ? <GoogleMark /> : <Icon name="lock" size={15} />}</span>
                    <span><b>{label}</b><small>{detail}</small></span>
                    {/* Each way in names its account (owner, 29 Oct 2026): her TikTok handle and her Gmail. */}
                    {key === "tt" ? <span className="badge">Last used</span>
                      : key === "gg" ? <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setGoogleOn(!googleOn); toast(googleOn ? "Google unlinked" : "Google linked"); }}>{googleOn ? "Unlink" : "Link"}</button>
                      : (
                        <span className="si-acts">
                          <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setNewEmail(""); setEmailSheet(true); }}>Change email</button>
                          <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setPw(["", "", ""]); setPwSheet(true); }}>{hasPw ? "Change password" : "Set password"}</button>
                        </span>
                      )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cr2-group">
          <h2>Privacy & Your Data</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">Consent</span>
              <span className="val v2-muted">{consent && !consent.unlinkedAt ? `Terms v${consent.terms} · Privacy v${consent.privacy} · ${consent.at}` : "None. TikTok Shop isn't linked."}</span>
            </div>
            <button type="button" className="cr2-cell cr2-cellbtn" onClick={() => toast("We'll email you a copy of your data within 7 days")}>
              <span className="lbl">Download my data</span>
              <span className="chev">Email me a copy <Icon name="arrow" size={16} /></span>
            </button>
            <a href="#" className="cr2-cell cr2-cellbtn" onClick={(e) => { e.preventDefault(); toast("Opening the Privacy Policy"); }}>
              <span className="lbl">Privacy Policy</span>
              <span className="chev">v1.0 · 28 Oct 2026 <Icon name="arrow" size={16} /></span>
            </a>
          </div>
          <p>Your earnings are private. Sellers never see your sales unless you share.</p>
        </section>

        <section className="cr2-group">
          <h2>Notifications</h2>
          <div className="cr2-cells">
            <div className="cr2-notifyhead"><span>Tell me about</span><span>In-app</span><span>Email</span></div>
            {NOTIFY.map((n) => (
              <div key={n.key} className="cr2-notify">
                <span>
                  <b>{n.label}</b>
                  <small>{n.note}</small>
                </span>
                {[0, 1].map((ch) => {
                  const on = notify[n.key][ch];
                  return (
                    <button
                      key={ch}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${n.label} by ${ch === 0 ? "in-app" : "email"}`}
                      className={`np-switch ${on ? "on" : ""}`}
                      onClick={() => setNotify((s) => {
                        const next: [boolean, boolean] = [...s[n.key]] as [boolean, boolean];
                        next[ch] = !next[ch];
                        return { ...s, [n.key]: next };
                      })}
                    >
                      <span />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p>No marketing messages unless you ask.</p>
        </section>

        <section className="cr2-group">
          <h2>Language & Appearance</h2>
          <div className="cr2-cells">
            <div className="cr2-cell">
              <span className="lbl">Language</span>
              <span className="val"><Seg value={lang} options={["English", "中文"] as const} onChange={(l) => { setLang(l); toast(l === "中文" ? "已切换为中文" : "Switched to English"); }} /></span>
            </div>
            {/* Phones switch theme from the sun/moon icon in the account panel (owner, 29 Oct 2026). */}
            <div className="cr2-cell acc-theme-row">
              <span className="lbl">Theme</span>
              <span className="val"><Seg value={theme} options={["Light", "Dark", "Auto"] as const} onChange={pickTheme} /></span>
            </div>
          </div>
          <p className="acc-theme-row">Auto matches your device.</p>
        </section>
        <section className="cr2-group acc-in-panel">
          <h2>Help & Feedback</h2>
          <div className="cr2-cells">
            {/* The page footer is hidden on phones, so its links live here (owner, 29 Oct 2026). */}
            <a className="cr2-cell acc-link" href={`mailto:${SUPPORT.email}`}><span className="lbl">Contact support</span><span className="v2-small">{SUPPORT.email}</span><Icon name="arrow" size={16} /></a>
            <a className="cr2-cell acc-link" href={SUPPORT.waLink} target="_blank" rel="noreferrer"><span className="lbl">WhatsApp us</span><span className="v2-small">{SUPPORT.wa}</span><Icon name="arrow" size={16} /></a>
            <a className="cr2-cell acc-link" href="https://rezekii.com/privacy" target="_blank" rel="noreferrer"><span className="lbl">Privacy Policy</span><Icon name="arrow" size={16} /></a>
            <a className="cr2-cell acc-link" href="https://rezekii.com/terms" target="_blank" rel="noreferrer"><span className="lbl">Terms of Service</span><Icon name="arrow" size={16} /></a>
            {/* The same full feedback form as the account panel (owner, 30 Oct 2026). */}
            <button type="button" className="cr2-cell cr2-cellbtn acc-link" onClick={() => setFeedback(true)}><span className="lbl">Send feedback</span><span className="v2-small">Ideas, bugs, questions</span><Icon name="arrow" size={16} /></button>
            <a href="mailto:support@rezekii.com" className="cr2-cell cr2-cellbtn" onClick={(e) => { e.preventDefault(); toast("support@rezekii.com · we reply within 1 working day"); }}>
              <span className="lbl">Email support</span>
              <span className="chev">support@rezekii.com <Icon name="arrow" size={16} /></span>
            </a>
            <Link href="/tour" className="cr2-cell cr2-cellbtn">
              <span className="lbl">How Rezekii works</span>
              <span className="chev">Tour <Icon name="arrow" size={16} /></span>
            </Link>
          </div>
        </section>

        <section className="cr2-group">
          <h2>Account</h2>
          <div className="cr2-cells">
            <button type="button" className="cr2-cell cr2-cellbtn danger" onClick={() => { setDelText(""); setDelSheet(true); }}>Delete account</button>
          </div>
        </section>

          </>
        )}
      </div>
      {confirmSave && (
        <Sheet title="Save Your Profile?" onClose={() => setConfirmSave(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>After saving, only support can change it.</p>
          <dl className="pf-sum">
            <div><dt>Name</dt><dd>{name}</dd></div>
            <div><dt>State</dt><dd>{state}</dd></div>
            <div><dt>WhatsApp</dt><dd>{cc} {local ? prettyNum(cc, local) : ""}</dd></div>
            <div><dt>Gender</dt><dd>{gender}</dd></div>
            <div><dt>Creator type</dt><dd>{types.join(", ")}</dd></div>
            <div><dt>Niches</dt><dd>{[niche, sub1, sub2].filter(Boolean).join(" · ")}</dd></div>
          </dl>
          <button type="button" className="np-btn" disabled={saving} onClick={() => { if (live) { void saveReal(); return; } setLocked(true); setConfirmSave(false); toast("Profile saved"); }}>{saving ? "Saving…" : "Save profile"}</button>
          <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setConfirmSave(false)}>Keep editing</button>
        </Sheet>
      )}
      {feedback && (
        <Sheet title="Send Feedback" onClose={() => setFeedback(false)}>
          <FeedbackForm onDone={() => setFeedback(false)} />
        </Sheet>
      )}
      {changeSheet && (
        <Sheet title="Request a Change" onClose={() => setChangeSheet(false)}>
          <label className="v2-field">What to change
            <select className="np-input" value={change.what} onChange={(e) => setChange({ ...change, what: e.target.value })}>
              {["Name", "State", "WhatsApp number", "Gender", "Creator type", "Niches", "Other"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="v2-field">Change it to<input className="np-input" value={change.to} onChange={(e) => setChange({ ...change, to: e.target.value })} placeholder="New value" /></label>
          <label className="v2-field">Why <span className="pf-opt">Optional</span><textarea className="np-input" rows={2} value={change.why} onChange={(e) => setChange({ ...change, why: e.target.value })} placeholder="e.g. I changed my number" /></label>
          <button type="button" className="np-btn" disabled={!change.to.trim()} onClick={() => { setChangeSheet(false); setChange({ what: "WhatsApp number", to: "", why: "" }); toast("Sent. We'll WhatsApp you within 1 working day."); }}>Send to support</button>
        </Sheet>
      )}
      {waSheet && (
        <Sheet title="Verify with WhatsApp" onClose={() => setWaSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>Free and takes 10 seconds. Confirms {cc} {local && prettyNum(cc, local)} has WhatsApp.</p>
          <ol className="cr2-steps">
            <li><i>1</i><span><b>Tap Open WhatsApp.</b> The message is ready.</span></li>
            <li><i>2</i><span><b>Send it</b> without changes.</span></li>
            <li><i>3</i><span><b>Done.</b> Come back here.</span></li>
          </ol>
          <div className="cr2-wamsg">REZEKII verify 482 913<br />Please send this message as it is.</div>
          <button type="button" className="np-btn cr2-wabtn" disabled={verifying} onClick={verifyNow}>
            <Icon name="whatsapp" size={18} /> {verifying ? "Waiting for your message…" : "Open WhatsApp"}
          </button>
          <span className="v2-small" style={{ textAlign: "center" }}>We never send you a code.</span>
        </Sheet>
      )}

      {unlink && (
        <Sheet title="Unlink TikTok Shop?" onClose={() => setUnlink(false)}>
          <ul className="cr2-danger" style={{ margin: 0, paddingLeft: 30 }}>
            <li>We stop reading your TikTok Shop data now.</li>
            <li>Scans, earnings and payouts are removed. Data deleted within 30 days.</li>
            <li>Added products keep their rate until the campaign ends.</li>
          </ul>
          <button type="button" className="np-btn cr2-delbtn" onClick={() => { setLinked(false); setUnlink(false); toast("TikTok Shop unlinked"); }}>Unlink TikTok Shop</button>
          <button type="button" className="btn-outline" onClick={() => setUnlink(false)}>Keep it linked</button>
        </Sheet>
      )}

      {emailSheet && (
        <Sheet title="Change Email" onClose={() => setEmailSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>Now: {email}. Confirm with the link we send.</p>
          <label className="v2-field">
            New email
            <input type="email" className="np-input" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button
            type="button"
            className="np-btn"
            disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)}
            onClick={() => { setEmail(newEmail); setEmailSheet(false); toast(`Link sent to ${newEmail}`); }}
          >
            Send link
          </button>
        </Sheet>
      )}

      {delSheet && (
        <Sheet title="Delete Account" onClose={() => setDelSheet(false)}>
          <div className="cr2-danger">
            <b>This can&apos;t be undone.</b>
            <ul>
              <li>Your profile, connections and credits are removed.</li>
              <li>Finish samples in progress ({active}) first, or they&apos;re marked undelivered.</li>
              <li>TikTok still pays commission it owes you.</li>
            </ul>
          </div>
          <label className="v2-field">
            Type DELETE to confirm
            <input className="np-input" value={delText} onChange={(e) => setDelText(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="np-btn cr2-delbtn" disabled={delText !== "DELETE"} onClick={() => { setDelSheet(false); toast("Preview only: nothing was deleted"); }}>
            Delete my account
          </button>
          <button type="button" className="btn-outline" onClick={() => setDelSheet(false)}>Keep my account</button>
        </Sheet>
      )}

      {pwSheet && (
        <Sheet title={hasPw ? "Change Password" : "Set a Password"} onClose={() => setPwSheet(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>{hasPw ? `For signing in with ${email}.` : `Sign in with ${email} too.`}</p>
          {hasPw && (
            <label className="v2-field">
              Current password
              <input type="password" className="np-input" autoComplete="current-password" value={pw[0]} onChange={(e) => setPw([e.target.value, pw[1], pw[2]])} />
              <button type="button" className="v2-link" style={{ alignSelf: "flex-start", fontSize: 13 }} onClick={() => { setPwSheet(false); toast(`Reset link sent to ${email}`); }}>Email me a reset link</button>
            </label>
          )}
          <label className="v2-field">
            New password
            <input type="password" className="np-input" autoComplete="new-password" value={pw[1]} onChange={(e) => setPw([pw[0], e.target.value, pw[2]])} />
            <small>At least 8 characters</small>
          </label>
          <label className="v2-field">
            Type it again
            <input type="password" className="np-input" autoComplete="new-password" value={pw[2]} onChange={(e) => setPw([pw[0], pw[1], e.target.value])} />
            {pw[2] && pw[1] !== pw[2] && <small className="cr2-red">Doesn&apos;t match</small>}
          </label>
          <button
            type="button"
            className="np-btn"
            disabled={(hasPw && !pw[0]) || pw[1].length < 8 || pw[1] !== pw[2]}
            onClick={() => { setHasPw(true); setPw(["", "", ""]); setPwSheet(false); toast(hasPw ? "Password changed. Other devices are signed out." : "Password set"); }}
          >
            {hasPw ? "Change password" : "Save password"}
          </button>
        </Sheet>
      )}
    </div>
  );
}
