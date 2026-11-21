import type { NextConfig } from "next";

/**
 * Rezekii's old addresses (rezekii.com before 21 Nov 2026), sent to where the same thing lives now, so links people kept or
 * shared still open (owner, 21 Nov 2026: "move everything to rezekii.com"). Temporary (307) for now.
 */
const OLD: [string, string][] = [
  ["/app/new", "/app/publish"],
  ["/app/posts", "/app/publish/calendar"],
  ["/app/comments", "/app/publish/comments"],
  ["/app/numbers", "/app/publish/numbers"],
  ["/app/accounts", "/app/account"],
  ["/app/marketplace", "/app/market"],
  ["/app/marketplace/:id", "/app/product/:id"],
  ["/app/my-tap", "/app/market"],
  ["/app/sales", "/app/data"],
  ["/app/levels", "/app/account"],
  ["/app/levels/benefits", "/app/account"],
  ["/app/rankings", "/app"],
  ["/app/golden-sellers", "/app"],
  ["/app/admin", "/admin"],
  ["/app/admin/creators", "/admin/users/creators"],
  ["/app/admin/accounts", "/admin/posting/accounts"],
  ["/app/admin/settings", "/admin/system"],
  ["/app/admin/samples", "/admin/tap/samples"],
  ["/app/admin/tap", "/admin/tap"],
  ["/app/admin/calendar", "/admin/posting"],
  ["/app/admin/drafts", "/admin/posting/drafts"],
  ["/app/admin/community", "/admin/posting/numbers"],
  ["/app/admin/stats", "/admin/posting/stats"],
  ["/onboarding", "/app"],
  ["/connected", "/app/account"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
