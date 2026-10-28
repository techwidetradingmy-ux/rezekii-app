"use client";

import { Title } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { CREATOR_SETUP } from "@/lib/mock-publish";

/** New post for creators: V1's composer, shared with sellers. */
export default function PublishNew() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="New Post" sub="One video to TikTok, Facebook, Instagram and Threads, written for each app" />
      <Composer setup={CREATOR_SETUP} />
    </div>
  );
}
