"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { SELLER_POSTS_V2, SELLER_SETUP } from "@/lib/mock-publish";
import { useLivePosts, useLiveSetup } from "@/lib/live-publish";

/** Content calendar for sellers: the same page as creators, with the shop's channels. Signed in, the real posts (31 Oct 2026). */
export default function SellerPosts() {
  const setup = useLiveSetup(SELLER_SETUP, "seller");
  const posts = useLivePosts(SELLER_POSTS_V2);
  if (setup === "wait" || posts === "wait") return <div className="v2-stack v2-in"><p className="v2-muted">Loading your posts…</p></div>;
  if (setup === "error" || posts === "error") return <div className="v2-stack v2-in"><p className="v2-muted">Couldn&apos;t load your posts. Please refresh.</p></div>;
  return <MyPosts key={setup.live ?? "sample"} setup={setup} posts={posts} newPost="/seller/app/publish" />;
}
