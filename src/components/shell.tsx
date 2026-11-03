"use client";

import { useWho } from "@/components/demo";
import { FeedbackForm } from "@/components/feedback-form";
import { DailyStory } from "@/components/daily-story";
import { STORY_SEEN, storyDayKey, storyReleased, storySeen, type SampleDay, type StoryPage } from "@/lib/daily-story";
import { SUPPORT } from "@/lib/support";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useDemo } from "./demo";
import { Portal, Sheet } from "./ui";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { LevelFace } from "./level-face";
import { ACCOUNT_TABS, OPEN_ACCOUNT_MENU, tabFor } from "@/lib/account-tabs";
import { useSideScroll } from "./side-scroll";
import { useScrollMemory } from "@/lib/keep";
import { BetaWait } from "./beta-wait";
import { ACCOUNT, HOME, MENUS, pageFor, sectionFor, type AppKind } from "@/lib/menus";
import { CREATOR, MY_SAMPLES, REFERRAL_REWARD, SELLER } from "@/lib/mock";
import { useUnreadNotes } from "@/lib/live-notes";
import { useNoteChime } from "@/lib/note-chime";
import { PullRefresh } from "@/components/pull-refresh";
import { loadWallet } from "@/lib/live-rewards";
import { LangSwitch, useT } from "@/lib/i18n/client";

const LEVEL: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

const WHO: Record<AppKind, { name: string; initials: string; label: string; photo?: string; sub: string }> = {
  creator: { name: CREATOR.first, initials: CREATOR.initials, label: "Account", photo: CREATOR.photo, sub: `${CREATOR.level} creator` },
  seller: { name: SELLER.shop, initials: "SL", label: "Account", sub: "Seller account" },
  admin: { name: "Aina (Ops)", initials: "AI", label: "Settings", sub: "Techwide admin" },
};

/** The preview strip: sample data notice, and quick jumps between the three apps. */
export function DemoStrip() {
  const { linked, setLinked, bronze, setBronze, live, me } = useDemo();
  // Techwide's admins only (owner, 2 Nov 2026: the beta is public, so creators and sellers don't see the preview strip).
  if (me?.role !== "admin") return null;
  return (
    <div className="v2-demo">
      <div className="site-wrap">
        {/* Signed in, every screen shows her real data (owner, 31 Oct 2026); the sample switches are for the signed-out preview. */}
        <span>{live ? "Rezekii 2.0 preview · your real data" : "Rezekii 2.0 preview · sample data, nothing is saved"}</span>
        <span style={{ flex: 1 }} />
        <Link href="/">Creator Site</Link>
        <Link href="/app">Creator App</Link>
        <Link href="/seller">Seller Site</Link>
        <Link href="/seller/app">Seller App</Link>
        <Link href="/admin">Admin</Link>
        <Link href="/tour">All Pages</Link>
        <Link href="/compare">Compare Views</Link>
        {!live && (
          <>
            <button type="button" className="v2-demo-toggle" onClick={() => setLinked(!linked)}>
              {linked ? "Show as not linked" : "Show as linked"}
            </button>
            <button type="button" className="v2-demo-toggle" onClick={() => setBronze(!bronze)}>
              {bronze ? "Show as Silver" : "Show as Bronze"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** The desktop layout mock-ups to pick from (owner, 31 Oct 2026); wide screens only. */
/** The always-visible Invite button: referral is how Rezekii spreads. */
const INVITE = { creator: "/app/account#referral", seller: "/seller/app/rewards/referral", admin: "" } as const;

/**
 * Signed-in frame. Desktop (owner, 31 Oct 2026: layout A, made for desktop): a top menu bar with every section (pointing at
 * one lists its pages), the open section's pages as tabs below it, and pages using the screen's width. Phones keep the page
 * switcher and the tab bar.
 */
/** Invite button icon (owner, 29 Oct 2026, option A): a green gift box with a gold ribbon that wiggles, sparkles and glows. */
function Chest() {
  return (
    <svg className="v2-gift" width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
      <g className="ch-box" stroke="#04512f" strokeWidth="2.2" strokeLinejoin="round">
        <rect x="8" y="20" width="32" height="22" rx="4" fill="#00c073" />
        <rect x="6" y="14" width="36" height="8" rx="3" fill="#22dc95" />
        <rect x="21" y="14" width="6" height="28" fill="#fff3c4" />
        <path d="M24 14c-3-6-11-7-11-2s8 2 11 2zM24 14c3-6 11-7 11-2s-8 2-11 2z" fill="#fff3c4" />
      </g>
    </svg>
  );
}

export function Shell({ app, children, banner }: { app: AppKind; children: React.ReactNode; banner?: React.ReactNode }) {
  // Menus in her language (owner, 3 Nov 2026); Admin always reads English (its layout says so).
  const t = useT();
  const you = useWho();
  const path = usePathname();
  // Back returns to the same scroll on every page (owner, 29 Oct 2026); open sections come back through useKept.
  useScrollMemory(path);
  const section = sectionFor(app, path);
  const page = section ? pageFor(section, path) : null;
  // Each section's tab opens the page she last had open in it (owner, 3 Nov 2026: back from Missions, Publish reopened on its
  // first page). Kept for this visit only.
  const [lastPage, setLastPage] = useState<Record<string, string>>({});
  useEffect(() => {
    try { setLastPage(JSON.parse(sessionStorage.getItem("rz_last_pages") ?? "{}")); } catch {}
  }, []);
  const sectionHref = section?.href;
  useEffect(() => {
    if (!sectionHref || !page) return;
    setLastPage((m) => {
      if (m[sectionHref] === page) return m;
      const next = { ...m, [sectionHref]: page };
      try { sessionStorage.setItem("rz_last_pages", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [sectionHref, page]);
  const tabHref = (href: string) => (section?.href === href ? href : lastPage[href] ?? href);
  const signOut = () => { fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/signin?in=1"; }); };
  const { me, live } = useDemo();
  // The bell shows her real unread count when signed in (owner, 31 Oct 2026); nothing when there are none.
  const sideNotes = useUnreadNotes(app === "seller" ? "seller" : "creator", live && app !== "admin");
  useNoteChime(sideNotes);
  // Admins: the bell counts what needs fixing now (system problems and products to review), from Today (owner, 31 Oct 2026).
  const [adminAlerts, setAdminAlerts] = useState<number | null>(null);
  useEffect(() => {
    if (!live || app !== "admin") return;
    fetch("/api/v2/admin/today", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { queues?: { key: string; n: number }[] } | null) => setAdminAlerts((d?.queues ?? []).filter((q) => q.key === "system" || q.key === "review").reduce((t, q) => t + q.n, 0))).catch(() => {});
  }, [live, app, path]);
  const unreadNotes = app === "admin" ? adminAlerts : sideNotes;
  // Signed in with a Seller Center shop: the seller app shows that shop's name (owner, 30 Oct 2026).
  const shopName = app === "seller" ? me?.sellerShop : null;
  const shopInitials = (shopName ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const who = app === "creator" ? { ...WHO.creator, name: you.first, initials: you.initials, photo: you.photo, ...(live && me ? { sub: t("{level} creator", { level: t(LEVEL[me.level]) }) } : {}) } : shopName ? { ...WHO.seller, name: shopName, initials: shopInitials || "S" } : WHO[app];
  const [more, setMore] = useState(false);
  const menu = MENUS[app];
  // Where the top menu's pill sits: measured from the open section's link, again on resize.
  const menuRef = useRef<HTMLDivElement>(null);
  // Sub-menu (owner, 28 Oct 2026: felt stuck): the open page scrolls into view, and a mouse wheel or drag scrolls it sideways too.
  const subRef = useRef<HTMLElement>(null);
  useSideScroll(subRef, `${section?.href} ${page}`, "a.on");
  // Page switcher (owner, 29 Oct 2026, option G): on phones the open page's name sits in the top bar and lists the section's pages.
  const [pgOpen, setPgOpen] = useState(false);
  useLayoutEffect(() => setPgOpen(false), [path]);
  // Closes on a tap anywhere outside it or on Escape (owner, 1 Nov 2026). The old backdrop was trapped inside the frosted top bar.
  const pgRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pgOpen) return;
    const away = (e: PointerEvent) => { if (!pgRef.current?.contains(e.target as Node)) setPgOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPgOpen(false); };
    const moved = () => setPgOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("hashchange", moved);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); window.removeEventListener("hashchange", moved); };
  }, [pgOpen]);
  // My Account uses the same switcher for its sections (owner, 29 Oct 2026); the open one lives in the address (#wallet).
  const acctPage = app === "creator" && path === ACCOUNT[app];
  const [acctTab, setAcctTab] = useState("profile");
  useLayoutEffect(() => {
    if (!acctPage) return;
    const read = () => setAcctTab(tabFor(window.location.hash.slice(1)) ?? "profile");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [acctPage]);
  const pick: { title: string; items: { href: string; label: string; on: boolean; hash?: string }[] } | null =
    section && section.pages.length > 1
      ? { title: t(section.label), items: section.pages.map(([href, label]) => ({ href, label, on: page === href })) }
      : acctPage
        ? { title: t("My Account"), items: ACCOUNT_TABS.map(([k, label]) => ({ href: `${ACCOUNT[app]}#${k}`, label, on: acctTab === k, hash: k })) }
        : null;
  // Account panel (owner, 29 Oct 2026, option B): on phones the avatar opens every account section in a side panel.
  const [acctOpen, setAcctOpen] = useState(false);
  // Daily Story (owner, 30 Oct 2026): her photo glows while today's story is new; tapping it plays the story.
  const [story, setStory] = useState(false);
  const [storyNew, setStoryNew] = useState(false);
  const [storyDay, setStoryDay] = useState<SampleDay>("good");
  // Signed in: her story, read once; a creator with nothing yet has none (owner, 31 Oct 2026), so her photo just opens My Account.
  const [storyPages, setStoryPages] = useState<StoryPage[] | null>(null);
  useEffect(() => {
    if (!live || app !== "creator") return;
    fetch("/api/v2/story", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { pages?: StoryPage[] } | null) => setStoryPages(d?.pages ?? [])).catch(() => setStoryPages([]));
  }, [live, app]);
  const hasStory = app === "creator" && (!live || !!storyPages?.length);
  useLayoutEffect(() => {
    if (app !== "creator") return;
    setStoryDay(new URLSearchParams(window.location.search).get("day") === "slow" ? "slow" : "good");
    try { setStoryNew(localStorage.getItem(STORY_SEEN) !== storyDayKey()); } catch { setStoryNew(true); }
  }, [app]);
  // Her real story comes out one page at a time (owner, 2 Nov 2026): the photo glows again whenever a new page is out.
  useEffect(() => {
    if (!live || app !== "creator" || !storyPages?.length) return;
    const check = () => setStoryNew(storySeen() < storyReleased(storyPages.length));
    check();
    const t = window.setInterval(check, 60_000);
    return () => window.clearInterval(t);
  }, [live, app, storyPages, story]);
  const ring = hasStory ? (storyNew ? " story new" : " story") : "";
  useLayoutEffect(() => {
    const open = () => setAcctOpen(true);
    window.addEventListener(OPEN_ACCOUNT_MENU, open);
    return () => window.removeEventListener(OPEN_ACCOUNT_MENU, open);
  }, []);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const box = menuRef.current;
      const on = box?.querySelector<HTMLAnchorElement>(".v2-mi > a.on");
      setPill(box && on ? { left: on.getBoundingClientRect().left - box.getBoundingClientRect().left, width: on.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [section?.href]);
  // Creator phone bar (owner, 28 Oct 2026): Home moves to the middle as a TikTok-style Scan button, since the scanner is on Home.
  const phoneTabs = app === "admin" ? menu.slice(0, 4) : app === "creator" ? [menu[1], menu[2], menu[0], ...menu.slice(3)] : menu;
  const isScan = (href: string) => app === "creator" && href === menu[0].href;
  const found = phoneTabs.findIndex((s) => s.href === section?.href);
  const navIndex = found >= 0 ? (isScan(phoneTabs[found].href) ? -1 : found) : app === "admin" && menu.slice(4).some((s) => s.href === section?.href) ? phoneTabs.length : -1;
  // Beta (owner, 2 Nov 2026): an account Techwide hasn't let in yet sees only "You're on the List", on each app separately.
  const betaSide = app === "seller" ? "seller" : "creator";
  if (live && me && me.role !== "admin" && app !== "admin" && me.beta?.[betaSide]?.status !== "approved") return <BetaWait side={betaSide} state={me.beta?.[betaSide] ?? null} />;
  return (
    <>
      <DemoStrip />
      <div className="v2-shellgrid" data-app={app}>
      <div className="v2-frame">
      <header className="v2-top" data-app={app}>
        <nav className="site-nav site-wrap" aria-label={t("Main menu")}>
          <Link href={HOME[app]} className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          {app !== "creator" && <span className="v2-workspace">{app === "seller" ? t("Seller") : "Admin"}</span>}
          {pick && (
            <span className="v2-pgpick" ref={pgRef}>
              <button type="button" aria-haspopup="menu" aria-expanded={pgOpen} onClick={() => setPgOpen((o) => !o)}>
                <small>{pick.title}</small>
                <b><span>{t(pick.items.find((x) => x.on)?.label ?? "") || pick.title}</span><AiSpark label={pick.items.find((x) => x.on)?.label ?? ""} /><Icon name="updown" size={14} width={2.4} /></b>
              </button>
              {/* Always there, so it can fade and slide both ways (owner, 1 Nov 2026). */}
              <span className={`v2-pgmenu${pgOpen ? " open" : ""}`} role="menu" aria-label={t("{section} pages", { section: pick.title })} aria-hidden={!pgOpen}>
                    {pick.items.map((x) => (
                      <Link
                        key={x.href}
                        href={x.href}
                        role="menuitem"
                        className={x.on ? "on" : undefined}
                        aria-current={x.on ? "page" : undefined}
                        // An account section on the same page changes the address hash, so the page switches section.
                        onClick={(e) => { if (x.hash) { e.preventDefault(); window.location.hash = x.hash; } setPgOpen(false); }}
                      >
                        {/* AI-made pages carry the AI mark so the feature stands out (owner, 29 Oct 2026). */}
                        <span>{t(x.label)}</span><AiSpark label={x.label} />{x.on && <Icon name="check" size={16} />}
                      </Link>
                    ))}
              </span>
            </span>
          )}
          <div className="v2-menu" ref={menuRef}>
            {/* The same green pill as the phone tab bar, sliding to the open section (owner, 28 Oct 2026). */}
            {pill && <span className="v2-menu-ind" aria-hidden="true" style={{ left: pill.left, width: pill.width }} />}
            {menu.map((s) => (
              <span key={s.href} className="v2-mi">
                <Link href={tabHref(s.href)} className={section?.href === s.href ? "on" : undefined} aria-current={section?.href === s.href ? "page" : undefined}>
                  <span className="v2-mi-ic"><Icon name={s.icon} size={18} /></span>
                  {s.label === "Marketplace" ? <><span className="v2-long">{t("Marketplace")}</span><span className="v2-short">{t("Market")}</span></> : t(s.label)}
                  {s.pages.length > 1 && <i className="v2-mi-chev" aria-hidden="true" />}
                </Link>
                {/* Desktop (owner, 31 Oct 2026): pointing at a section lists its pages, so any page is one click away. */}
                {s.pages.length > 1 && (
                  <span className="v2-mi-drop" role="menu" aria-label={t("{section} pages", { section: t(s.label) })}>
                    {s.pages.map(([href, label]) => (
                      <Link key={href} href={href} role="menuitem" className={page === href ? "on" : undefined}>{t(label)}<AiSpark label={label} /></Link>
                    ))}
                  </span>
                )}
              </span>
            ))}
          </div>
          {!section && (path.startsWith(ACCOUNT[app]) || path.includes("/notifications")) && (
            <span className="v2-crumb"><b>{path.includes("/notifications") ? t("Notifications") : app === "admin" ? "System" : t("My Account")}</b></span>
          )}
          {section && (
            <span className="v2-crumb">
              <b>{t(section.label)}</b>
              {page && page !== section.href && <><Icon name="arrow" size={14} /><span>{t(section.pages.find(([h]) => h === page)?.[1] ?? "")}</span></>}
            </span>
          )}
          <span className="site-spacer" />
          {app !== "admin" && (
            <Link
              href={INVITE[app]}
              className="v2-invite"
              aria-label={t("Invite friends and earn credits")}
              onClick={(e) => {
                // Already on My account: switch to the Referral section without leaving the page.
                if (app === "creator" && path === "/app/account") { e.preventDefault(); window.location.hash = "referral"; window.scrollTo({ top: 0, behavior: "smooth" }); }
              }}
            >
              {/* Option D (owner, 29 Oct 2026): the pill shows what an invite earns, on phones too. */}
              <Chest />
              <span>+{REFERRAL_REWARD.inviter}</span>
            </Link>
          )}
          <Link href={app === "admin" ? "/admin" : app === "seller" ? "/seller/app/notifications" : "/app/notifications"} className="v2-iconbtn" aria-label={t("Notifications")}>
            <Icon name="bell" size={20} />
            {live ? !!unreadNotes && <b>{unreadNotes > 99 ? "99+" : unreadNotes}</b> : <b>3</b>}
          </Link>
          {/* Admins switch between the dashboards from the top bar on a computer (owner, 3 Nov 2026); phones use the account panel. */}
          {me?.role === "admin" && (
            <Link href={app === "admin" ? "/app" : "/admin"} className="v2-dashswitch">
              <Icon name={app === "admin" ? "home" : "shield"} size={16} /> {app === "admin" ? "Creator Dashboard" : t("Admin Dashboard")}
            </Link>
          )}
          {/* Admin has no account panel, so Sign Out sits in the top bar (owner, 3 Nov 2026). */}
          {app === "admin" && live && <button type="button" className="v2-dashswitch" onClick={signOut}><Icon name="back" size={16} /> Sign Out</button>}
          <Link href={ACCOUNT[app]} className={`v2-acct${ring}`} aria-label={storyNew && hasStory ? t("Watch your Daily Story") : undefined} onClick={(e) => { if (hasStory && storyNew) { e.preventDefault(); setStory(true); return; } if (app === "creator" && window.matchMedia("(max-width: 760px)").matches) { e.preventDefault(); setAcctOpen(true); } }}>
            {who.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span className="v2-av photo"><img src={who.photo} alt="" /></span>
            ) : (
              <span className="v2-av">{who.initials}</span>
            )}
            <span>{t(who.label)}</span>
          </Link>
        </nav>
      </header>
      {section && section.pages.length > 1 && (
        <div className="v2-subwrap">
          <nav ref={subRef} className="site-wrap sub-menu nv-noscroll" aria-label={t("{section} pages", { section: t(section.label) })}>
            {section.pages.map(([href, label]) => (
              <Link key={href} href={href} className={page === href ? "on" : undefined} aria-current={page === href ? "page" : undefined}>
                {t(label)}<AiSpark label={label} />
              </Link>
            ))}
          </nav>
        </div>
      )}
      <PullRefresh />
      {acctOpen && <AccountPanel onClose={() => setAcctOpen(false)} onStory={hasStory ? () => { setAcctOpen(false); setStory(true); } : undefined} />}
      {story && <DailyStory day={storyDay} pages={storyPages} onClose={() => { setStory(false); setStoryNew(false); }} />}
      <main className="site-wrap v2-main">
        {banner}
        {children}
      </main>
      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii</span>
          <span className="site-spacer" />
          {/* Phones show short labels so the footer fits one line (owner, 28 Oct 2026). */}
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer"><span className="ft-long">{t("Privacy Policy")}</span><span className="ft-short">{t("Privacy")}</span></a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer"><span className="ft-long">{t("Terms of Service")}</span><span className="ft-short">{t("Terms")}</span></a>
          <a href={`mailto:${SUPPORT.email}`} title={SUPPORT.email}><span className="ft-long">{SUPPORT.email}</span><span className="ft-short">{t("Email")}</span></a>
        </div>
      </footer>
      </div>
      </div>
      <nav className="nv-bottom" data-app={app} aria-label={t("Main menu (phone)")} style={{ ["--n" as string]: phoneTabs.length + (app === "admin" ? 1 : 0) }}>
        {/* A green pill that slides to the open tab (owner, 28 Oct 2026: make the tab bar easier to see). */}
        {navIndex >= 0 && <span className="nv-ind" aria-hidden="true" style={{ ["--i" as string]: navIndex }} />}
        {phoneTabs.map((s) =>
          isScan(s.href) ? (
            <Link key={s.href} href={`${s.href}#scan`} className={`nv-scan${section?.href === s.href ? " on" : ""}`} aria-current={section?.href === s.href ? "page" : undefined}>
              <span className="nv-scan-btn" aria-hidden="true"><Icon name="scan" size={26} /></span>
              {t("Scan")}
            </Link>
          ) : (
            <Link key={s.href} href={tabHref(s.href)} className={section?.href === s.href ? "on" : ""} aria-current={section?.href === s.href ? "page" : undefined}>
              <Icon name={s.icon} size={24} />
              {t(s.label === "Marketplace" ? "Market" : s.label)}
            </Link>
          ),
        )}
        {app === "admin" && (
          <a href="#" onClick={(e) => { e.preventDefault(); setMore(true); }} className={menu.slice(4).some((s) => s.href === section?.href) ? "on" : ""}>
            <Icon name="gear" size={24} />
            More
          </a>
        )}
      </nav>
      {more && (
        <Sheet title="Admin Menu" onClose={() => setMore(false)}>
          <div className="v2-divide">
            {/* On phones the way back to the creator app and Sign Out live here (owner, 3 Nov 2026). */}
            <Link href="/app" onClick={() => setMore(false)} className="v2-row" style={{ padding: "14px 2px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
              <Icon name="home" /> Creator Dashboard
            </Link>
            {menu.slice(4).map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setMore(false)} className="v2-row" style={{ padding: "14px 2px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
                <Icon name={s.icon} /> {s.label}
              </Link>
            ))}
            {live && <button type="button" onClick={signOut} className="v2-row" style={{ padding: "14px 2px", color: "var(--text)", background: "none", border: 0, font: "inherit", fontWeight: 700, width: "100%", textAlign: "left", cursor: "pointer" }}><Icon name="back" /> Sign Out</button>}
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Pages made by Rezekii AI; they get the AI mark in every menu, on phones and desktop (owner, 30 Oct 2026). */
const AI_PAGES = ["AI Picks", "Today's Ideas", "AI Video", "AI Competitors"];
const AiSpark = ({ label }: { label: string }) => (AI_PAGES.includes(label) ? <svg className="v2-pgai" viewBox="0 0 24 24" width="17" height="17" aria-label="AI"><path d="M11 3Q12 11 20 12Q12 13 11 21Q10 13 2 12Q10 11 11 3Z" fill="currentColor" /><path d="M19 1.5Q19.3 4.7 22.5 5Q19.3 5.3 19 8.5Q18.7 5.3 15.5 5Q18.7 4.7 19 1.5Z" fill="currentColor" /></svg> : null);

/** Every account section in a panel from the right (phones), with her photo, level and streak on top. */
function AccountPanel({ onClose, onStory }: { onClose: () => void; onStory?: () => void }) {
  const t = useT();
  const you = useWho();
  const path = usePathname();
  const { toast, linked, live, me } = useDemo();
  // Signed in: her real level and streak (owner, 31 Oct 2026).
  const level = live && me ? LEVEL[me.level] : CREATOR.level;
  const [real, setReal] = useState<number | null>(null);
  useEffect(() => {
    if (live) loadWallet("creator").then((w) => setReal(w.streak)).catch(() => {});
  }, [live]);
  // Signed in, nothing shows until her real streak loads.
  const streak = live ? real ?? "–" : CREATOR.streak;
  // Language, theme, support and feedback live here on phones (owner, 29 Oct 2026), not in Settings.
  // Theme is one icon (owner, 29 Oct 2026): each tap moves Light → Dark → Auto, and the icon shows the current one.
  const [theme, setTheme] = useState<Theme>("Auto");
  useLayoutEffect(() => setTheme(readTheme()), []);
  const nextTheme = () => {
    const next: Theme = theme === "Light" ? "Dark" : theme === "Dark" ? "Auto" : "Light";
    applyTheme(next);
    setTheme(next);
    toast(next === "Auto" ? t("Theme: Auto (follows your phone)") : t("Theme: {theme}", { theme: t(next) }));
  };
  const [feedback, setFeedback] = useState(false);
  const samples = MY_SAMPLES.filter((x) => !["Done", "Not approved"].includes(x.status)).length;
  const [hash, setHash] = useState("");
  useLayoutEffect(() => {
    setHash(window.location.hash.slice(1));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const here = (k: string) => path === "/app/account" && (tabFor(hash) ?? "profile") === k;
  /** Opens a section of My Account; on My Account itself it only changes the address. */
  const open = (k: string) => (e: React.MouseEvent) => {
    if (path === "/app/account") { e.preventDefault(); window.location.hash = k; }
    onClose();
  };
  const row = ([k, label, icon]: (typeof ACCOUNT_TABS)[number]) => (
    <Link key={k} href={`/app/account#${k}`} className={here(k) ? "on" : undefined} aria-current={here(k) ? "page" : undefined} onClick={open(k)}>
      <span className={`ap-ic ${k}`}><Icon name={icon} size={16} /></span>
      <span>{t(label)}</span>
      {k === "wallet" && !live && <small>{CREATOR.credits.toLocaleString("en-MY")}</small>}
      {k === "samples" && !live && samples > 0 && <i className="badge badge-amber">{samples}</i>}
      <Icon name="arrow" size={15} />
    </Link>
  );
  return (
    <Portal>
      <div className="ap-back" onClick={onClose} />
      {/* Compact (owner, 1 Nov 2026): the whole panel fits one phone screen, with Sign out pinned at the bottom. */}
      <aside className="ap-panel" role="dialog" aria-modal="true" aria-label={t("My Account")}>
        <div className="ap-body">
          <div className="ap-me">
            {/* Her TikTok level frame, the same as on My Account (owner, 29 Oct 2026). Her photo and name open Your Profile (owner, 3 Nov 2026). */}
            <Link href="/app/account#profile" className="ap-face" aria-label={t("Open Your Profile")} onClick={open("profile")}>
              <LevelFace lv={live ? me?.ttLevel ?? null : linked ? CREATOR.tiktokLevel : null} size={50} img={you.photo} name={you.name} />
            </Link>
            <span>
              <Link href="/app/account#profile" className="ap-name" onClick={open("profile")}><b>{you.name}</b><small>{you.handle}</small></Link>
              <span className="ap-chips">
                {/* The level opens Level, Streak & Badges; the flame opens its Streak section (owner, 1 Nov 2026). */}
                <Link href="/app/account#level" className={`lv ${level.toLowerCase()}`} title={t("{level} creator", { level: t(level) })} aria-label={t("{level} creator. Open Level, Streak & Badges", { level: t(level) })} onClick={open("level")}><Icon name="gem" size={13} /></Link>
                <Link href="/app/account#streak" className="st" title={t("{n}-day streak", { n: streak })} aria-label={t("{n}-day streak. Open your streak", { n: streak })} onClick={open("streak")}><Icon name="flame" size={13} />{streak}</Link>
                {onStory && <button type="button" className="ap-story" onClick={onStory}><Icon name="video" size={13} width={2.4} /> {t("Story")}</button>}
              </span>
            </span>
            <span className="ap-tools">
              <button type="button" className="v2-iconbtn" aria-label={t("Theme: {theme}. Tap to change", { theme: t(theme) })} onClick={nextTheme}><Icon name={theme === "Light" ? "sun" : theme === "Dark" ? "moon" : "auto"} size={18} /></button>
            </span>
          </div>
          {/* Every section shows, no More (owner, 3 Nov 2026: the panel isn't full, so nothing needs folding away). */}
          {/* Language sits with the theme on phones (owner, 3 Nov 2026: English, Bahasa Melayu, 中文). */}
          <div className="ap-lang"><LangSwitch /></div>
          <nav className="ap-list" aria-label={t("Account sections")}>
            {me?.role === "admin" && (
              <Link href="/admin" className="ap-admin" onClick={onClose}>
                <span className="ap-ic settings"><Icon name="shield" size={16} /></span>
                <span>{t("Admin Dashboard")}</span>
                <Icon name="arrow" size={15} />
              </Link>
            )}
            {ACCOUNT_TABS.map(row)}
          </nav>
          {/* Support and feedback side by side (owner, 1 Nov 2026); Contact Support opens WhatsApp. */}
          <div className="ap-help">
            <a href={SUPPORT.waLink} target="_blank" rel="noreferrer" className="ap-hbtn"><span className="ap-ic support"><Icon name="whatsapp" size={15} /></span>{t("Contact Support")}</a>
            <button type="button" className="ap-hbtn" onClick={() => setFeedback(true)}><span className="ap-ic feedback"><Icon name="edit" size={15} /></span>{t("Send Feedback")}</button>
          </div>
          {/* Legal and contact sit at the foot of the panel on phones (owner, 29 Oct 2026). */}
          <footer className="ap-foot">
            <span className="ap-links">
              <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">{t("Privacy Policy")}</a>
              <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">{t("Terms of Service")}</a>
              <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            </span>
            <small>{t("© 2026 Rezekii · Built by Techwide")}</small>
          </footer>
        </div>
        {feedback && (
          <Sheet title={t("Send Feedback")} onClose={() => setFeedback(false)}>
            <FeedbackForm onDone={() => setFeedback(false)} />
          </Sheet>
        )}
        {/* Sign out lives in the panel on phones, not in Settings (owner, 29 Oct 2026). */}
        <Link href="/signin?in=1" className="ap-signout" onClick={(e) => { if (!live) return onClose(); e.preventDefault(); fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/signin?in=1"; }); }}><Icon name="back" size={17} /> {t("Sign Out")}</Link>
      </aside>
    </Portal>
  );
}
