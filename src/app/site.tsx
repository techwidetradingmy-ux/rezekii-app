import Image from "next/image";
import Link from "next/link";
import { currentUser } from "./current-user";
import { BottomNav } from "./bottom-nav";
import { NavAccount } from "./nav-account";

export const COMPANY = "Techwide Marketing Sdn Bhd";
export const COMPANY_NO = "202001017785";
export const SUPPORT_EMAIL = "support@rezekii.com";

export { TikTokLogo } from "./tiktok-logo";

/** The signed-in menus from the mockup: creators', and Techwide admins'. */
export const CREATOR_LINKS: [string, string][] = [["/app", "Today"], ["/app/marketplace", "Marketplace"], ["/app/posts", "My posts"], ["/app/levels", "Levels"], ["/app/rankings", "Rankings"], ["/app/accounts", "My accounts"]];
export const ADMIN_LINKS: [string, string][] = [
  ["/app/admin", "Today"], ["/app/admin/calendar", "Calendar"], ["/app/new", "New post"], ["/app/admin/drafts", "Drafts"], ["/app/admin/accounts", "Accounts"],
  ["/app/admin/creators", "Creators"], ["/app/rankings", "Rankings"], ["/app/admin/tap", "TAP"], ["/app/admin/stats", "Stats"], ["/app/admin/settings", "Settings"],
];

/** Top bar. "hero" sits on the homepage band; "plain" is for legal pages; "app" is the signed-in menu. Signed-in people get "My account" instead of "Sign in". */
export async function SiteNav({ variant, staticPage = false }: { variant: "hero" | "plain" | "app"; staticPage?: boolean }) {
  // The homepage stays static (served from the CDN); its account button is checked in the browser.
  const clientAccount = variant === "hero" || staticPage;
  const user = clientAccount ? null : await currentUser();
  const nav = (
    <nav className={`site-nav site-wrap${variant === "app" ? " site-nav-app" : ""}`} aria-label="Main">
      <Link href="/" className="site-brand">
        <span>
          <Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority />
        </span>
        Rezekii
      </Link>
      <span className="site-spacer" />
      {variant === "hero" ? (
        <>
          <a href="#earn">Earn more</a>
          <a href="#compare">Compare</a>
          <a href="#levels">Levels</a>
          <a href="#faq">FAQ</a>
        </>
      ) : variant === "app" ? (
        (user?.role === "admin" ? ADMIN_LINKS : CREATOR_LINKS).map(([href, label]) => (
          <Link key={href} href={href}>{label}</Link>
        ))
      ) : (
        <>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </>
      )}
      {clientAccount ? (
        <NavAccount />
      ) : user ? (
        <Link href={variant !== "app" ? "/app" : user.role === "admin" ? "/app/admin/settings" : "/app/accounts"} className="site-signin site-account">
          {user.avatar_url ? (
            // Avatars come from many TikTok and Google CDN hosts, so a plain img (as on /app).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" width={26} height={26} />
          ) : null}
          My account
        </Link>
      ) : (
        <Link href="/signin" className="site-signin">
          Sign in
        </Link>
      )}
    </nav>
  );
  if (variant === "hero") return nav;
  return (
    <>
      <header className="site-plainnav">{nav}</header>
      {variant === "app" && user && <BottomNav admin={user.role === "admin"} />}
    </>
  );
}

/** Footer with the legal links TikTok's review requires to be visible on every page. */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-wrap">
        <span>
          © 2026 {COMPANY} ({COMPANY_NO})
        </span>
        <span className="site-spacer" />
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  );
}
