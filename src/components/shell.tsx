"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { useDemo } from "./demo";
import { Sheet } from "./ui";
import { ACCOUNT, HOME, MENUS, pageFor, sectionFor, type AppKind } from "@/lib/menus";
import { CREATOR, SELLER } from "@/lib/mock";

const WHO: Record<AppKind, { name: string; initials: string; label: string }> = {
  creator: { name: CREATOR.first, initials: CREATOR.initials, label: "Account" },
  seller: { name: SELLER.shop, initials: "SL", label: "Account" },
  admin: { name: "Aina (Ops)", initials: "AI", label: "Settings" },
};

/** The preview strip: sample data notice, and quick jumps between the three apps. */
export function DemoStrip() {
  const { linked, setLinked } = useDemo();
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
        <button type="button" className="v2-demo-toggle" onClick={() => setLinked(!linked)}>
          {linked ? "Show as not linked" : "Show as linked"}
        </button>
      </div>
    </div>
  );
}

/** Signed-in frame, the rezekii.com skeleton: top menu (sections), sub-menu (a section's pages), footer, phone tab bar. */
export function Shell({ app, children, banner }: { app: AppKind; children: React.ReactNode; banner?: React.ReactNode }) {
  const path = usePathname();
  const section = sectionFor(app, path);
  const page = section ? pageFor(section, path) : null;
  const who = WHO[app];
  const [more, setMore] = useState(false);
  const menu = MENUS[app];
  const phoneTabs = app === "admin" ? menu.slice(0, 4) : menu;
  return (
    <>
      <DemoStrip />
      <header className="v2-top" data-app={app}>
        <nav className="site-nav site-wrap" aria-label="Main">
          <Link href={HOME[app]} className="site-brand">
            <span>
              <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
            </span>
            Rezekii
          </Link>
          {app !== "creator" && <span className="v2-workspace">{app === "seller" ? "Seller" : "Admin"}</span>}
          <div className="v2-menu">
            {menu.map((s) => (
              <Link key={s.href} href={s.href} className={section?.href === s.href ? "on" : undefined} aria-current={section?.href === s.href ? "page" : undefined}>
                {s.label}
              </Link>
            ))}
          </div>
          <span className="site-spacer" />
          {app === "creator" && (
            <span className="lang-switch" role="group" aria-label="Language">
              <button type="button" aria-pressed="true">EN</button>
              <button type="button" aria-pressed="false">中文</button>
            </span>
          )}
          <Link href={app === "admin" ? "/admin" : app === "seller" ? "/seller/app/notifications" : "/app/notifications"} className="v2-iconbtn" aria-label="Notifications">
            <Icon name="bell" size={20} />
            <b>3</b>
          </Link>
          <Link href={ACCOUNT[app]} className="v2-acct">
            <span className="v2-av">{who.initials}</span>
            <span>{who.label}</span>
          </Link>
        </nav>
      </header>
      {section && section.pages.length > 1 && (
        <div className="v2-subwrap">
          <nav className="site-wrap sub-menu nv-noscroll" aria-label={`${section.label} pages`}>
            {section.pages.map(([href, label]) => (
              <Link key={href} href={href} className={page === href ? "on" : undefined} aria-current={page === href ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <main className="site-wrap v2-main">
        {banner}
        {children}
      </main>
      <footer className="site-foot">
        <div className="site-wrap">
          <span>© 2026 Techwide Marketing Sdn Bhd (202001017785)</span>
          <span className="site-spacer" />
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">support@rezekii.com</a>
        </div>
      </footer>
      <nav className="nv-bottom" aria-label="Main menu (phone)">
        {phoneTabs.map((s) => (
          <Link key={s.href} href={s.href} className={section?.href === s.href ? "on" : ""} aria-current={section?.href === s.href ? "page" : undefined}>
            <Icon name={s.icon} size={24} />
            {s.label === "Marketplace" ? "Market" : s.label}
          </Link>
        ))}
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
