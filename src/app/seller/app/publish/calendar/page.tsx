"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { SELLER_POSTS_V2, SELLER_SETUP } from "@/lib/mock-publish";

/** Content calendar for sellers: the same page as creators, with the shop's channels. */
export default function SellerPosts() {
  return <MyPosts setup={SELLER_SETUP} posts={SELLER_POSTS_V2} newPost="/seller/app/publish" />;
}
