import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { NewPostForm } from "./new-post-form";

export const metadata: Metadata = { title: "New post · Rezekii" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main app-narrow">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>New post</span></nav>
        <h1>New post</h1>
        {user.tiktok_username ? (
          <NewPostForm />
        ) : (
          <section className="card">
            <h2>Connect TikTok first</h2>
            <p>Rezekii posts to your own TikTok account. Sign in with TikTok to connect it.</p>
            <Link href="/api/auth/tiktok/start" className="np-btn">Continue with TikTok</Link>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
