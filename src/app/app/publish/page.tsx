"use client";

import { Title } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { useEditId } from "@/components/publish/post-edits";
import { CREATOR_SETUP } from "@/lib/mock-publish";
import { useLiveSetup } from "@/lib/live-publish";

/** New post for creators: V1's composer, shared with sellers. Signed in, her real channels and credits (owner, 31 Oct 2026). */
export default function PublishNew() {
  const editId = useEditId();
  const setup = useLiveSetup(CREATOR_SETUP, "creator");
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title={editId ? "Edit Post" : "Cross-Channel Posting"} sub="One video to TikTok, Facebook, Instagram and Threads" />
      {setup === "wait" ? <p className="v2-muted">Loading your channels…</p> : setup === "error" ? <p className="v2-muted">Couldn&apos;t load your channels. Please refresh.</p> : <Composer key={setup.live ?? "sample"} setup={setup} />}
    </div>
  );
}
