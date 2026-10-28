import type { IconName } from "@/components/icons";

/** One feature, one section: each top-menu item holds all of its pages as a sub-menu (blueprint 5.1). */
export type Section = { href: string; label: string; icon: IconName; pages: [string, string][] };
export type AppKind = "creator" | "seller" | "admin";

export const MENUS: Record<AppKind, Section[]> = {
  creator: [
    { href: "/app", label: "Home", icon: "home", pages: [] },
    { href: "/app/market", label: "Marketplace", icon: "bag", pages: [] },
    {
      href: "/app/data", label: "My data", icon: "chart",
      pages: [["/app/data", "Overview"], ["/app/data/videos", "Videos"], ["/app/data/products", "Products"], ["/app/data/risk", "Returns & risk"], ["/app/data/payouts", "Payouts"]],
    },
    { href: "/app/publish", label: "Publish", icon: "send", pages: [["/app/publish", "New post"], ["/app/publish/calendar", "Calendar & history"]] },
    { href: "/app/rewards", label: "Missions", icon: "gift", pages: [] },
  ],
  seller: [
    { href: "/seller/app", label: "Home", icon: "home", pages: [] },
    {
      href: "/seller/app/products", label: "Products", icon: "box",
      pages: [["/seller/app/products", "Shop products"], ["/seller/app/submit", "Submit products"], ["/seller/app/progress", "Progress"], ["/seller/app/changes", "Change or end"]],
    },
    {
      href: "/seller/app/results", label: "Results", icon: "chart",
      pages: [["/seller/app/results", "TAP performance"], ["/seller/app/results/samples", "Where samples went"], ["/seller/app/results/competitors", "AI competitors"]],
    },
    { href: "/seller/app/publish", label: "Publish", icon: "send", pages: [["/seller/app/publish", "New post"], ["/seller/app/publish/calendar", "Calendar & history"]] },
    { href: "/seller/app/rewards", label: "Rewards", icon: "gift", pages: [["/seller/app/rewards", "Missions"], ["/seller/app/rewards/referral", "Referral"], ["/seller/app/rewards/wallet", "Wallet"]] },
  ],
  admin: [
    { href: "/admin", label: "Today", icon: "home", pages: [] },
    { href: "/admin/tap", label: "TAP", icon: "kanban", pages: [["/admin/tap", "Pipeline"], ["/admin/tap/campaigns", "Campaigns"], ["/admin/tap/samples", "Sample review"]] },
    {
      href: "/admin/business", label: "Business", icon: "briefcase",
      pages: [["/admin/business", "My merchants & creators"], ["/admin/business/performance", "Live performance"], ["/admin/business/open", "Open campaigns"], ["/admin/business/custom", "Custom service"]],
    },
    { href: "/admin/users", label: "Users", icon: "users", pages: [["/admin/users", "Review"], ["/admin/users/sellers", "Sellers"], ["/admin/users/creators", "Creators"], ["/admin/users/access", "Admin access"]] },
    { href: "/admin/growth", label: "Growth", icon: "gift", pages: [["/admin/growth", "Missions"], ["/admin/growth/progress", "Progress per person"], ["/admin/growth/referrals", "Referrals"]] },
    { href: "/admin/accounts", label: "Accounts", icon: "wallet", pages: [["/admin/accounts", "Ledger"], ["/admin/accounts/reconcile", "Reconciliation"]] },
    { href: "/admin/analytics", label: "Analytics", icon: "chart", pages: [] },
    { href: "/admin/support", label: "Support", icon: "inbox", pages: [["/admin/support", "Disputes"], ["/admin/support/feedback", "Feedback inbox"]] },
    { href: "/admin/system", label: "System", icon: "gear", pages: [["/admin/system", "Settings & presets"], ["/admin/system/publishing", "Publishing ops"], ["/admin/system/audit", "Audit log"], ["/admin/system/consent", "Consent log"]] },
  ],
};

export const ACCOUNT: Record<AppKind, string> = { creator: "/app/account", seller: "/seller/app/account", admin: "/admin/system" };
export const HOME: Record<AppKind, string> = { creator: "/app", seller: "/seller/app", admin: "/admin" };

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** The section a path belongs to; Home only matches itself. */
export function sectionFor(app: AppKind, path: string): Section | null {
  const all = MENUS[app];
  return (
    all.find((s) => s.pages.some(([h]) => h !== s.href && under(path, h))) ??
    all.find((s) => s.href !== HOME[app] && under(path, s.href)) ??
    all.find((s) => path === s.href) ??
    null
  );
}

/** The sub-menu page that is open (longest match). */
export function pageFor(section: Section, path: string): string | null {
  const hits = section.pages.filter(([h]) => under(path, h)).sort((a, b) => b[0].length - a[0].length);
  return hits[0]?.[0] ?? null;
}
