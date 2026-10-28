"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useDemo } from "./demo";
import { Portal, Sheet } from "./ui";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { LevelFace } from "./level-face";
import { ACCOUNT_TABS, OPEN_ACCOUNT_MENU } from "@/lib/account-tabs";
import { useSideScroll } from "./side-scroll";
import { ACCOUNT, HOME, MENUS, pageFor, sectionFor, type AppKind } from "@/lib/menus";
import { CREATOR, MY_SAMPLES, SELLER } from "@/lib/mock";

const WHO: Record<AppKind, { name: string; initials: string; label: string; photo?: string; sub: string }> = {
  creator: { name: CREATOR.first, initials: CREATOR.initials, label: "Account", photo: CREATOR.photo, sub: `${CREATOR.level} creator` },
  seller: { name: SELLER.shop, initials: "SL", label: "Account", sub: "Seller account" },
  admin: { name: "Aina (Ops)", initials: "AI", label: "Settings", sub: "Techwide admin" },
};

/** The preview strip: sample data notice, and quick jumps between the three apps. */
export function DemoStrip() {
  const { linked, setLinked, bronze, setBronze } = useDemo();
  return (
    <div className="v2-demo">
      <div className="site-wrap">
        <span>Rezekii 2.0 preview · sample data, nothing is saved</span>
        <span style={{ flex: 1 }} />
        <Link href="/">Creator site</Link>
        <Link href="/app">Creator app</Link>
        <Link href="/seller">Seller site</Link>
        <Link href="/seller/app">Seller app</Link>
        <Link href="/admin">Admin</Link>
        <Link href="/tour">All pages</Link>
        <Link href="/compare">Compare views</Link>
        <button type="button" className="v2-demo-toggle" onClick={() => setLinked(!linked)}>
          {linked ? "Show as not linked" : "Show as linked"}
        </button>
        <button type="button" className="v2-demo-toggle" onClick={() => setBronze(!bronze)}>
          {bronze ? "Show as Silver" : "Show as Bronze"}
        </button>
      </div>
    </div>
  );
}

/** The always-visible Invite button: referral is how Rezekii spreads. */
const INVITE = { creator: "/app/account#referral", seller: "/seller/app/rewards/referral", admin: "" } as const;

/**
 * Signed-in frame. Desktop (owner, 28 Oct 2026: website first): a left side bar with every section and the open section's
 * pages, and a slim top bar. Smaller screens keep the top menu, the sub-menu and the phone tab bar.
 */
export function Shell({ app, children, banner }: { app: AppKind; children: React.ReactNode; banner?: React.ReactNode }) {
  const path = usePathname();
  const section = sectionFor(app, path);
  const page = section ? pageFor(section, path) : null;
  const who = WHO[app];
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
  // My Account uses the same switcher for its sections (owner, 29 Oct 2026); the open one lives in the address (#wallet).
  const acctPage = app === "creator" && path === ACCOUNT[app];
  const [acctTab, setAcctTab] = useState("profile");
  useLayoutEffect(() => {
    if (!acctPage) return;
    const read = () => setAcctTab(window.location.hash.slice(1) || "profile");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [acctPage]);
  const pick: { title: string; items: { href: string; label: string; on: boolean; hash?: string }[] } | null =
    section && section.pages.length > 1
      ? { title: section.label, items: section.pages.map(([href, label]) => ({ href, label, on: page === href })) }
      : acctPage
        ? { title: "My Account", items: ACCOUNT_TABS.map(([k, label]) => ({ href: `${ACCOUNT[app]}#${k}`, label, on: acctTab === k, hash: k })) }
        : null;
  // Account panel (owner, 29 Oct 2026, option B): on phones the avatar opens every account section in a side panel.
  const [acctOpen, setAcctOpen] = useState(false);
  useLayoutEffect(() => {
    const open = () => setAcctOpen(true);
    window.addEventListener(OPEN_ACCOUNT_MENU, open);
    return () => window.removeEventListener(OPEN_ACCOUNT_MENU, open);
  }, []);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const on = menuRef.current?.querySelector<HTMLAnchorElement>("a.on");
      setPill(on ? { left: on.offsetLeft, width: on.offsetWidth } : null);
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
  return (
    <>
      <DemoStrip />
      <div className="v2-shellgrid" data-app={app}>
      <aside className="v2-side" aria-label="Main menu">
        <Link href={HOME[app]} className="v2-side-brand">
          <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} /></span>
          Rezekii
          {app !== "creator" && <em>{app === "seller" ? "Seller" : "Admin"}</em>}
        </Link>
        <nav className="v2-side-nav nv-noscroll">
          {menu.map((s) => {
            const on = section?.href === s.href;
            return (
              <div key={s.href} className={`v2-side-sec${on ? " on" : ""}`}>
                <Link href={s.href} className="v2-side-item" aria-current={on && (!page || page === s.href) ? "page" : undefined}>
                  <Icon name={s.icon} size={20} />
                  <span>{s.label}</span>
                  {s.pages.length > 1 && <i className="v2-side-chev" aria-hidden="true" />}
                </Link>
                {on && s.pages.length > 1 && (
                  <div className="v2-side-sub">
                    {s.pages.map(([href, label]) => (
                      <Link key={href} href={href} className={page === href ? "on" : undefined} aria-current={page === href ? "page" : undefined}>{label}</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <Link href={ACCOUNT[app]} className="v2-side-me">
          {who.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <span className="v2-av photo"><img src={who.photo} alt="" /></span>
          ) : (
            <span className="v2-av">{who.initials}</span>
          )}
          <span><b>{who.name}</b><small>{who.sub}</small></span>
          <Icon name="gear" size={18} />
        </Link>
      </aside>
      <div className="v2-frame">
      <header className="v2-top" data-app={app}>
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href={HOME[app]} className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          {app !== "creator" && <span className="v2-workspace">{app === "seller" ? "Seller" : "Admin"}</span>}
          {pick && (
            <span className="v2-pgpick">
              <button type="button" aria-haspopup="menu" aria-expanded={pgOpen} onClick={() => setPgOpen((o) => !o)}>
                <small>{pick.title}</small>
                <b>{pick.items.find((x) => x.on)?.label ?? pick.title}<Icon name="updown" size={14} width={2.4} /></b>
              </button>
              {pgOpen && (
                <>
                  <span className="v2-pgback" onClick={() => setPgOpen(false)} aria-hidden="true" />
                  <span className="v2-pgmenu" role="menu" aria-label={`${pick.title} pages`}>
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
                        <span>{x.label}</span>{AI_PAGES.includes(x.label) && <svg className="v2-pgai" viewBox="0 0 24 24" width="17" height="17" aria-label="AI"><path d="M11 3Q12 11 20 12Q12 13 11 21Q10 13 2 12Q10 11 11 3Z" fill="currentColor" /><path d="M19 1.5Q19.3 4.7 22.5 5Q19.3 5.3 19 8.5Q18.7 5.3 15.5 5Q18.7 4.7 19 1.5Z" fill="currentColor" /></svg>}{x.on && <Icon name="check" size={16} />}
                      </Link>
                    ))}
                  </span>
                </>
              )}
            </span>
          )}
          <div className="v2-menu" ref={menuRef}>
            {/* The same green pill as the phone tab bar, sliding to the open section (owner, 28 Oct 2026). */}
            {pill && <span className="v2-menu-ind" aria-hidden="true" style={{ left: pill.left, width: pill.width }} />}
            {menu.map((s) => (
              <Link key={s.href} href={s.href} className={section?.href === s.href ? "on" : undefined} aria-current={section?.href === s.href ? "page" : undefined}>
                {s.label === "Marketplace" ? <><span className="v2-long">Marketplace</span><span className="v2-short">Market</span></> : s.label}
              </Link>
            ))}
          </div>
          {!section && (path.startsWith(ACCOUNT[app]) || path.includes("/notifications")) && (
            <span className="v2-crumb"><b>{path.includes("/notifications") ? "Notifications" : app === "admin" ? "System" : "My Account"}</b></span>
          )}
          {section && (
            <span className="v2-crumb">
              <b>{section.label}</b>
              {page && page !== section.href && <><Icon name="arrow" size={14} /><span>{section.pages.find(([h]) => h === page)?.[1]}</span></>}
            </span>
          )}
          <span className="site-spacer" />
          {app !== "admin" && (
            <Link
              href={INVITE[app]}
              className="v2-invite"
              aria-label="Invite friends and earn credits"
              onClick={(e) => {
                // Already on My account: switch to the Referral section without leaving the page.
                if (app === "creator" && path === "/app/account") { e.preventDefault(); window.location.hash = "referral"; }
              }}
            >
              <Icon name="gift" size={18} />
              <span>Invite</span>
            </Link>
          )}
          <Link href={app === "admin" ? "/admin" : app === "seller" ? "/seller/app/notifications" : "/app/notifications"} className="v2-iconbtn" aria-label="Notifications">
            <Icon name="bell" size={20} />
            <b>3</b>
          </Link>
          <Link href={ACCOUNT[app]} className="v2-acct" onClick={(e) => { if (app === "creator" && window.matchMedia("(max-width: 760px)").matches) { e.preventDefault(); setAcctOpen(true); } }}>
            {who.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <span className="v2-av photo"><img src={who.photo} alt="" /></span>
            ) : (
              <span className="v2-av">{who.initials}</span>
            )}
            <span>{who.label}</span>
          </Link>
        </nav>
      </header>
      {section && section.pages.length > 1 && (
        <div className="v2-subwrap">
          <nav ref={subRef} className="site-wrap sub-menu nv-noscroll" aria-label={`${section.label} pages`}>
            {section.pages.map(([href, label]) => (
              <Link key={href} href={href} className={page === href ? "on" : undefined} aria-current={page === href ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      {acctOpen && <AccountPanel onClose={() => setAcctOpen(false)} />}
      <main className="site-wrap v2-main">
        {banner}
        {children}
      </main>
      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Rezekii</span>
          <span className="site-spacer" />
          {/* Phones show short labels so the footer fits one line (owner, 28 Oct 2026). */}
          <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy<span className="ft-long"> Policy</span></a>
          <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms<span className="ft-long"> of Service</span></a>
          <a href="mailto:support@rezekii.com" title="support@rezekii.com"><span className="ft-long">support@rezekii.com</span><span className="ft-short">Support</span></a>
        </div>
      </footer>
      </div>
      </div>
      <nav className="nv-bottom" data-app={app} aria-label="Main menu (phone)" style={{ ["--n" as string]: phoneTabs.length + (app === "admin" ? 1 : 0) }}>
        {/* A green pill that slides to the open tab (owner, 28 Oct 2026: make the tab bar easier to see). */}
        {navIndex >= 0 && <span className="nv-ind" aria-hidden="true" style={{ ["--i" as string]: navIndex }} />}
        {phoneTabs.map((s) =>
          isScan(s.href) ? (
            <Link key={s.href} href={`${s.href}#scan`} className={`nv-scan${section?.href === s.href ? " on" : ""}`} aria-current={section?.href === s.href ? "page" : undefined}>
              <span className="nv-scan-btn" aria-hidden="true"><Icon name="scan" size={26} /></span>
              Scan
            </Link>
          ) : (
            <Link key={s.href} href={s.href} className={section?.href === s.href ? "on" : ""} aria-current={section?.href === s.href ? "page" : undefined}>
              <Icon name={s.icon} size={24} />
              {s.label === "Marketplace" ? "Market" : s.label}
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
        <Sheet title="Admin menu" onClose={() => setMore(false)}>
          <div className="v2-divide">
            {menu.slice(4).map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setMore(false)} className="v2-row" style={{ padding: "14px 2px", color: "var(--text)", textDecoration: "none", fontWeight: 700 }}>
                <Icon name={s.icon} /> {s.label}
              </Link>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Pages made by Rezekii AI; they get the AI mark in the page switcher. */
const AI_PAGES = ["AI Picks", "Today's Ideas", "AI Competitors"];

/** Every account section in a panel from the right (phones), with her photo, level and streak on top. */
function AccountPanel({ onClose }: { onClose: () => void }) {
  const path = usePathname();
  const { toast, linked } = useDemo();
  // Language, theme, support and feedback live here on phones (owner, 29 Oct 2026), not in Settings.
  // Theme is one icon (owner, 29 Oct 2026): each tap moves Light → Dark → Auto, and the icon shows the current one.
  const [theme, setTheme] = useState<Theme>("Auto");
  useLayoutEffect(() => setTheme(readTheme()), []);
  const nextTheme = () => {
    const t: Theme = theme === "Light" ? "Dark" : theme === "Dark" ? "Auto" : "Light";
    applyTheme(t);
    setTheme(t);
    toast(t === "Auto" ? "Theme: Auto (follows your phone)" : `Theme: ${t}`);
  };
  const [feedback, setFeedback] = useState(false);
  const [topic, setTopic] = useState("Idea");
  const [msg, setMsg] = useState("");
  const samples = MY_SAMPLES.filter((x) => !["Done", "Not approved"].includes(x.status)).length;
  const [hash, setHash] = useState("");
  useLayoutEffect(() => {
    setHash(window.location.hash.slice(1));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  const here = (k: string) => path === "/app/account" && (hash || "profile") === k;
  return (
    <Portal>
      <div className="ap-back" onClick={onClose} />
      <aside className="ap-panel" role="dialog" aria-modal="true" aria-label="My Account">
        <div className="ap-me">
          {/* Her TikTok level frame, the same as on My Account (owner, 29 Oct 2026). */}
          <LevelFace lv={linked ? CREATOR.tiktokLevel : null} size={56} img={CREATOR.photo} name={CREATOR.name} />
          <span>
            <b>{CREATOR.name}</b><small>{CREATOR.handle}</small>
            <span className="ap-chips">
              <i className={`lv ${CREATOR.level.toLowerCase()}`} title={`${CREATOR.level} creator`} aria-label={`${CREATOR.level} creator`}><Icon name="gem" size={13} /></i>
              <i className="st" title={`${CREATOR.streak}-day streak`} aria-label={`${CREATOR.streak}-day streak`}><Icon name="flame" size={13} />{CREATOR.streak}</i>
            </span>
          </span>
          <span className="ap-tools">
            <button type="button" className="v2-iconbtn" aria-label={`Theme: ${theme}. Tap to change`} onClick={nextTheme}><Icon name={theme === "Light" ? "sun" : theme === "Dark" ? "moon" : "auto"} size={18} /></button>
            <button type="button" className="v2-iconbtn" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
          </span>
        </div>
        <nav className="ap-list" aria-label="Account sections">
          {ACCOUNT_TABS.map(([k, label, icon]) => (
            <Link key={k} href={`/app/account#${k}`} className={here(k) ? "on" : undefined} aria-current={here(k) ? "page" : undefined} onClick={(e) => { if (path === "/app/account") { e.preventDefault(); window.location.hash = k; } onClose(); }}>
              <span className={`ap-ic ${k}`}><Icon name={icon} size={17} /></span>
              <span>{label}</span>
              {k === "wallet" && <small>{CREATOR.credits.toLocaleString("en-MY")}</small>}
              {k === "samples" && samples > 0 && <i className="badge badge-amber">{samples}</i>}
              <Icon name="arrow" size={15} />
            </Link>
          ))}
        </nav>
        <div className="ap-list ap-prefs">
          <a href="mailto:support@rezekii.com" className="ap-row"><span className="ap-ic support"><Icon name="inbox" size={17} /></span><span>Contact support</span><Icon name="arrow" size={15} /></a>
          <button type="button" className="ap-row" onClick={() => setFeedback(true)}><span className="ap-ic feedback"><Icon name="edit" size={17} /></span><span>Send feedback</span><Icon name="arrow" size={15} /></button>
        </div>
        {feedback && (
          <Sheet title="Send feedback" onClose={() => setFeedback(false)}>
            <div className="v2-chips">
              {["Idea", "Something's broken", "Question"].map((t) => (
                <button key={t} type="button" className={`v2-chip ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>{t}</button>
              ))}
            </div>
            <textarea className="np-input" rows={4} placeholder="What can we improve?" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Your feedback" />
            <button type="button" className="np-btn" disabled={!msg.trim()} onClick={() => { setMsg(""); setFeedback(false); toast("Thanks! Message sent"); }}><Icon name="send" size={17} /> Send</button>
          </Sheet>
        )}
        {/* Sign out lives in the panel on phones, not in Settings (owner, 29 Oct 2026). */}
        <Link href="/signin" className="ap-signout" onClick={onClose}><Icon name="back" size={17} /> Sign out</Link>
        {/* Legal and contact sit at the foot of the panel on phones (owner, 29 Oct 2026). */}
        <footer className="ap-foot">
          <span className="ap-links">
            <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
            <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
            <a href="mailto:support@rezekii.com">Support</a>
          </span>
          <small>© 2026 Rezekii · Built by Techwide</small>
        </footer>
      </aside>
    </Portal>
  );
}
