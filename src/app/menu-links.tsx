"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client.tsx";
import { ADMIN_MENU, CREATOR_MENU, sectionFor } from "./menus";

/** The top row of the signed-in menu, with the current section marked. */
export function MenuLinks({ admin }: { admin: boolean }) {
  const t = useT();
  const path = usePathname();
  const current = sectionFor(path, admin);
  return (
    <>
      {(admin ? ADMIN_MENU : CREATOR_MENU).map((s) => (
        <Link key={s.href} href={s.href} className={current === s ? "site-on" : undefined} aria-current={current === s ? "page" : undefined}>
          {t(s.label)}
        </Link>
      ))}
    </>
  );
}

/** A section's other pages (Marketplace: TAP products, My TAP products, Convert links, Product Lookup …), under the menu. */
export function SubMenu({ admin }: { admin: boolean }) {
  const t = useT();
  const path = usePathname();
  const s = sectionFor(path, admin);
  if (!s || s.pages.length < 2) return null;
  const here = s.pages.find(([h]) => path === h || path.startsWith(`${h}/`))?.[0];
  return (
    <div className="nv nv-page sub-wrap">
      <nav className="site-wrap sub-menu nv-noscroll" aria-label={t("{section} pages", { section: t(s.label) })}>
        {s.pages.map(([href, label]) => (
          <Link key={href} href={href} className={here === href ? "on" : undefined} aria-current={here === href ? "page" : undefined}>
            {t(label)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
