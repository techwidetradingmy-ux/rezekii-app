"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { CREATOR_POSTS, CREATOR_SETUP } from "@/lib/mock-publish";

/** Content calendar for creators: every post with each app's live status; edit or cancel in place. */
export default function PublishPosts() {
  return <MyPosts setup={CREATOR_SETUP} posts={CREATOR_POSTS} newPost="/app/publish" />;
}
