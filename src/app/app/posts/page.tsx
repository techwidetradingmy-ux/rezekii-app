import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { myPostsData } from "@/modules/posting/my-posts.ts";
import { currentUser } from "../../current-user";
import { PostsView } from "./posts-view";

export const metadata: Metadata = { title: "My posts · Rezekii" };
export const dynamic = "force-dynamic";

export default async function MyPostsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const data = await myPostsData(user.id);
  return (
    <>
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>My posts</span></nav>
        <h1>My posts</h1>
        <PostsView initialPosts={data.posts} initialStats={data.stats} now={data.now} />
      </main>
    </>
  );
}
