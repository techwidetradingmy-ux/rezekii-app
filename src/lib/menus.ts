import type { IconName } from "@/components/icons";

/** One feature, one section: each top-menu item holds all of its pages as a sub-menu (blueprint 5.1). */
export type Section = { href: string; label: string; icon: IconName; pages: [string, string][] };
export type AppKind = "creator" | "seller" | "admin";

export const MENUS: Record<AppKind, Section[]> = {
  creator: [
    { href: "/app", label: "Home", icon: "home", pages: [] },
    { href: "/app/market", label: "Marketplace", icon: "store", pages: [["/app/market", "Marketplace"], ["/app/market/wanted", "Community Wish List"], ["/app/links", "Convert Links"], ["/app/lookup", "Product Lookup"]] },
    {
      href: "/app/data", label: "Analytics", icon: "chart",
      pages: [["/app/data", "Overview"], ["/app/data/performance", "Performance"], ["/app/data/ai-picks", "AI Picks"], ["/app/data/risk", "Risk Check"], ["/app/data/payouts", "Payouts"]],
    },
    // Today's Ideas first (owner, 28 Oct 2026): Publish opens on what to film, then New Post, then the calendar. Comments and
    // Channel Numbers once Meta approved the app (owner, 9 Nov 2026).
    { href: "/app/publish/plan", label: "Publish", icon: "send", pages: [["/app/publish/plan", "Today's Ideas"], ["/app/publish", "New Post"], ["/app/publish/calendar", "Content Calendar"], ["/app/publish/comments", "Comments"], ["/app/publish/numbers", "Channel Numbers"], ["/app/publish/ai-video", "AI Video"]] },
    { href: "/app/rewards", label: "Missions", icon: "gift", pages: [] },
  ],
  seller: [
    { href: "/seller/app", label: "Home", icon: "home", pages: [] },
    {
      href: "/seller/app/products", label: "Products", icon: "box",
      pages: [["/seller/app/products", "Shop Products"], ["/seller/app/submit", "Register Products"], ["/seller/app/progress", "Progress"], ["/seller/app/changes", "Change or End"], ["/seller/app/wanted", "Wanted by Creators"], ["/seller/app/custom", "Custom Service"]],
    },
    {
      href: "/seller/app/results", label: "Results", icon: "chart",
      pages: [["/seller/app/results", "TAP Performance"], ["/seller/app/results/samples", "Where Samples Went"], ["/seller/app/results/competitors", "AI Competitors"]],
    },
    { href: "/seller/app/publish", label: "Publish", icon: "send", pages: [["/seller/app/publish", "New Post"], ["/seller/app/publish/calendar", "Content Calendar"], ["/seller/app/publish/comments", "Comments"], ["/seller/app/publish/numbers", "Channel Numbers"]] },
    { href: "/seller/app/rewards", label: "Rewards", icon: "gift", pages: [["/seller/app/rewards", "Missions"], ["/seller/app/rewards/referral", "Referral"], ["/seller/app/rewards/wallet", "Wallet"]] },
  ],
  admin: [
    { href: "/admin", label: "Today", icon: "home", pages: [] },
    { href: "/admin/tap", label: "TAP", icon: "kanban", pages: [["/admin/tap", "Pipeline"], ["/admin/tap/review", "Product Review"], ["/admin/tap/campaigns", "Campaigns"], ["/admin/tap/samples", "Sample Review"], ["/admin/tap/requests", "Wish List"]] },
    {
      href: "/admin/business", label: "Business", icon: "briefcase",
      pages: [["/admin/business", "My Merchants & Creators"], ["/admin/business/performance", "Live Performance"], ["/admin/business/open", "Open Campaigns"], ["/admin/business/custom", "Custom Service"]],
    },
    { href: "/admin/users", label: "Users", icon: "users", pages: [["/admin/users", "Review"], ["/admin/users/sellers", "Sellers"], ["/admin/users/creators", "Creators"], ["/admin/users/access", "Admin Access"]] },
    { href: "/admin/growth", label: "Growth", icon: "gift", pages: [["/admin/growth", "Missions"], ["/admin/growth/progress", "Progress per Person"], ["/admin/growth/referrals", "Referrals"], ["/admin/growth/waitlist", "AI Video Waitlist"]] },
    { href: "/admin/accounts", label: "Accounts", icon: "wallet", pages: [["/admin/accounts", "Ledger"], ["/admin/accounts/reconcile", "Reconciliation"]] },
    { href: "/admin/analytics", label: "Analytics", icon: "chart", pages: [["/admin/analytics", "Overview"], ["/admin/analytics/best", "TikTok Best Sellers"], ["/admin/analytics/rankings", "Rankings"]] },
    { href: "/admin/support", label: "Support", icon: "inbox", pages: [["/admin/support", "Disputes"], ["/admin/support/feedback", "Feedback Inbox"]] },
    { href: "/admin/system", label: "System", icon: "gear", pages: [["/admin/system", "Settings & Presets"], ["/admin/system/publishing", "Publishing Ops"], ["/admin/system/audit", "Audit Log"], ["/admin/system/consent", "Consent Log"]] },
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
