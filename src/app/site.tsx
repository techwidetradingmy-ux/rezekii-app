import Image from "next/image";
import Link from "next/link";
import { currentUser } from "./current-user";
import { NavAccount } from "./nav-account";

export const COMPANY = "Techwide Marketing Sdn Bhd";
export const COMPANY_NO = "202001017785";
export const SUPPORT_EMAIL = "support@rezekii.com";

const TIKTOK_NOTE =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

/** TikTok's note mark with its cyan and red offset layers, for "Continue with TikTok" buttons. */
export function TikTokLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#25F4EE" transform="translate(-0.7 0.7)" d={TIKTOK_NOTE} />
      <path fill="#FE2C55" transform="translate(0.7 -0.7)" d={TIKTOK_NOTE} />
      <path fill="#ffffff" d={TIKTOK_NOTE} />
    </svg>
  );
}

/** Top bar. "hero" sits on the homepage band; "plain" is for legal pages; "app" is the signed-in menu. Signed-in people get "My account" instead of "Sign in". */
export async function SiteNav({ variant, staticPage = false }: { variant: "hero" | "plain" | "app"; staticPage?: boolean }) {
  // The homepage stays static (served from the CDN); its account button is checked in the browser.
  const clientAccount = variant === "hero" || staticPage;
  const user = clientAccount ? null : await currentUser();
  const nav = (
    <nav className="site-nav site-wrap" aria-label="Main">
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
        <>
          <Link href="/app">Today</Link>
          <Link href="/app/marketplace">TAP Marketplace</Link>
          <Link href="/app/samples">My samples</Link>
          <Link href="/app/posts">My posts</Link>
          {user?.role === "admin" && <Link href="/app/admin/samples">Sample queue</Link>}
        </>
      ) : (
        <>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </>
      )}
      {clientAccount ? (
        <NavAccount />
      ) : user ? (
        <Link href="/app" className="site-signin site-account">
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
  return variant === "hero" ? nav : <header className="site-plainnav">{nav}</header>;
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
