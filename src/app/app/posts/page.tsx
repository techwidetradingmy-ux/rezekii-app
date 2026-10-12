import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../current-user";
import { SiteFooter, SiteNav } from "../../site";
import { PostsView } from "./posts-view";

export const metadata: Metadata = { title: "My posts · Rezekii" };
export const dynamic = "force-dynamic";

export default async function MyPostsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return (
    <>
      <SiteNav variant="plain" />
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>My posts</span></nav>
        <h1>My posts</h1>
        <PostsView />
      </main>
      <SiteFooter />
    </>
  );
}
