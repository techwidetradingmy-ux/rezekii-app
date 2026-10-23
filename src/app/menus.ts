/**
 * The signed-in menus (approved 14 Oct 2026): only the main sections in the top row; each section's other pages are a
 * sub-menu inside it, and settings live behind the profile photo (Account for creators, Settings for admins).
 */
export type Icon = "home" | "bag" | "chart" | "cal" | "trophy" | "users" | "tag" | "gear" | "user" | "chat";
export type Section = {
  href: string;
  label: string;
  /** Shorter label for the phone menu. */
  short: string;
  icon: Icon;
  /** The section's pages, shown as its sub-menu when there is more than one. */
  pages: [string, string][];
  /** Other paths that belong to the section (detail pages). */
  also?: string[];
};

export const CREATOR_MENU: Section[] = [
  { href: "/app", label: "Today", short: "Today", icon: "home", pages: [] },
  {
    href: "/app/marketplace", label: "Marketplace", short: "Market", icon: "bag",
    pages: [["/app/marketplace", "Marketplace"], ["/app/my-tap", "My Samples"], ["/app/links", "Convert links"], ["/app/lookup", "Product Lookup"]],
    also: ["/app/golden-sellers"],
  },
  { href: "/app/sales", label: "Sales", short: "Sales", icon: "chart", pages: [] },
  { href: "/app/posts", label: "Posts", short: "Posts", icon: "cal", pages: [["/app/posts", "My posts"], ["/app/new", "New post"]] },
  { href: "/app/rankings", label: "Rankings", short: "Ranks", icon: "trophy", pages: [] },
];
/** Behind the profile photo. */
export const CREATOR_ACCOUNT: Section = { href: "/app/accounts", label: "Account", short: "Account", icon: "user", pages: [["/app/accounts", "Account"], ["/app/levels", "Level and benefits"]] };

export const ADMIN_MENU: Section[] = [
  { href: "/app/admin", label: "Today", short: "Today", icon: "home", pages: [] },
  {
    href: "/app/admin/calendar", label: "Content", short: "Content", icon: "cal",
    pages: [["/app/admin/calendar", "Calendar"], ["/app/posts", "All channels"], ["/app/admin/drafts", "Drafts"], ["/app/new", "New post"]],
  },
  { href: "/app/admin/creators", label: "Creators", short: "Creators", icon: "users", pages: [] },
  { href: "/app/admin/tap", label: "TAP", short: "TAP", icon: "tag", pages: [["/app/admin/tap", "Campaigns"], ["/app/admin/samples", "Samples"]] },
  { href: "/app/admin/stats", label: "Stats", short: "Stats", icon: "chart", pages: [] },
  // Facebook, Instagram and Threads in one place (owner, 23 Oct 2026); Numbers first, the inboxes next.
  { href: "/app/admin/community", label: "Community", short: "Community", icon: "chat", pages: [["/app/admin/community", "Numbers"]] },
  { href: "/app/rankings", label: "Rankings", short: "Ranks", icon: "trophy", pages: [] },
];
export const ADMIN_ACCOUNT: Section = { href: "/app/admin/settings", label: "Settings", short: "Settings", icon: "gear", pages: [] };

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** The section a page belongs to (Today only matches itself, since every page sits under /app). */
export function sectionFor(path: string, admin: boolean): Section | null {
  const all = admin ? [...ADMIN_MENU, ADMIN_ACCOUNT] : [...CREATOR_MENU, CREATOR_ACCOUNT];
  return (
    all.find((s) => s.pages.some(([h]) => under(path, h)) || s.also?.some((h) => under(path, h))) ??
    all.find((s) => s.href !== "/app" && s.href !== "/app/admin" && under(path, s.href)) ??
    all.find((s) => path === s.href) ??
    null
  );
}
