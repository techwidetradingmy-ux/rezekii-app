"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MENU, CREATOR_MENU, sectionFor } from "./menus";

const ICON = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  bag: "M5 7h14l-1.5 13h-11zM9 7a3 3 0 0 1 6 0",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 21h8M9.5 17h5v4h-5z",
  plus: "M12 5v14M5 12h14",
  chart: "M4 20V11M10 20V5M16 20v-6M3 20h18",
  tag: "M20 12 12 20l-8-8V4h8zM8 8h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-5-6.7",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};
type Tab = [string, string, keyof typeof ICON];
// Phones get five tabs: admins' Stats, Rankings and Settings sit under More.
const CREATOR: Tab[] = CREATOR_MENU.map((s) => [s.href, s.short, s.icon]);
const ADMIN: Tab[] = [...ADMIN_MENU.slice(0, 4).map((s): Tab => [s.href, s.short, s.icon]), ["/app/admin/settings", "More", "gear"]];
const MORE = ["/app/admin/stats", "/app/rankings", "/app/admin/settings"];

/** The phone menu from the mockup: five tabs fixed to the bottom of the screen (phones only). */
export function BottomNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const tabs = admin ? ADMIN : CREATOR;
  const current = sectionFor(path, admin);
  const on = (t: Tab) => (t[0] === "/app/admin/settings" ? MORE.some((p) => path.startsWith(p)) : current?.href === t[0]);
  return (
    <nav className="nv-bottom" aria-label="Main menu (phone)">
      {tabs.map((t) => (
        <Link key={t[0]} href={t[0]} aria-current={on(t) ? "page" : undefined} className={on(t) ? "on" : ""}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[t[2]]} /></svg>
          {t[1]}
        </Link>
      ))}
    </nav>
  );
}
