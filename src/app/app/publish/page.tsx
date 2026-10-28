"use client";

import { Title } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { useEditId } from "@/components/publish/post-edits";
import { CREATOR_SETUP } from "@/lib/mock-publish";

/** New post for creators: V1's composer, shared with sellers. */
export default function PublishNew() {
  const editId = useEditId();
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title={editId ? "Edit Post" : "Cross-Channel Posting"} sub="One video to TikTok, Facebook, Instagram and Threads" />
      <Composer setup={CREATOR_SETUP} />
    </div>
  );
}
