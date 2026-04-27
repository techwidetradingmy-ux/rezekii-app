"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Megaphone, TrendingUp, User } from "lucide-react";

const tabs = [
  { label: "Home",        href: "/home",          icon: Home },
  { label: "Marketplace", href: "/marketplace",   icon: ShoppingBag },
  { label: "Campaign",    href: "/campaign",      icon: Megaphone },
  { label: "Earnings",    href: "/earnings",      icon: TrendingUp },
  { label: "Profile",     href: "/profile",       icon: User },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#d8f0e4] z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-[49px]">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full tap-target"
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 1.8}
                color={isActive ? "#00c073" : "#9aa5b1"}
              />
              <span
                className="text-[10px] font-[500] leading-none"
                style={{ color: isActive ? "#00c073" : "#9aa5b1" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
