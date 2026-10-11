import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "../current-user";
import { Emblem } from "../emblems";
import { SiteFooter, SiteNav } from "../site";

export const metadata: Metadata = { title: "Today · Rezekii" };
export const dynamic = "force-dynamic";

/** First signed-in page. Posting, calendar and the marketplace are added here next. */
export default async function AppHome() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const name = user.display_name || (user.tiktok_username ? `@${user.tiktok_username}` : user.email) || "there";
  return (
    <>
      <SiteNav variant="plain" />
      <main className="site-wrap app-main">
        <section className="card app-hello">
          {user.avatar_url ? (
            // TikTok and Google avatars come from many CDN hosts, so a plain img is simpler than whitelisting them all.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" width={64} height={64} className="app-avatar" />
          ) : (
            <span className="app-avatar app-avatar-blank" aria-hidden="true">{name.replace("@", "").slice(0, 1).toUpperCase()}</span>
          )}
          <div className="app-who">
            <h1>Welcome, {name}</h1>
            <p>
              {user.role === "admin" ? "Techwide admin" : "Creator"}
              {user.tiktok_username && <> · TikTok @{user.tiktok_username} connected</>}
              {!user.tiktok_username && user.email && <> · {user.email}</>}
            </p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn-outline">Sign out</button>
          </form>
        </section>
        {user.role === "creator" && (
          <section className="card app-level">
            <Emblem level="bronze" size={56} />
            <div>
              <h2>You&apos;re Bronze</h2>
              <p>Every creator starts here. Your sales and samples will show here once posting and campaign products are switched on.</p>
            </div>
          </section>
        )}
        <section className="card">
          <h2>Coming next</h2>
          <p>New post, Calendar, Drafts and the campaign marketplace are being built now. You&apos;ll see them here.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
