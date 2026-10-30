"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { CREATOR_POSTS, CREATOR_SETUP } from "@/lib/mock-publish";
import { useLivePosts, useLiveSetup } from "@/lib/live-publish";

/** Content calendar for creators: every post with each app's live status; edit or cancel in place. Signed in, her real posts. */
export default function PublishPosts() {
  const setup = useLiveSetup(CREATOR_SETUP, "creator");
  const posts = useLivePosts(CREATOR_POSTS);
  if (setup === "wait" || posts === "wait") return <div className="v2-stack v2-in"><p className="v2-muted">Loading your posts…</p></div>;
  if (setup === "error" || posts === "error") return <div className="v2-stack v2-in"><p className="v2-muted">Couldn&apos;t load your posts. Please refresh.</p></div>;
  return <MyPosts key={setup.live ?? "sample"} setup={setup} posts={posts} newPost="/app/publish" />;
}
