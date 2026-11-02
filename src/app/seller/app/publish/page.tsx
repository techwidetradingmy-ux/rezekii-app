"use client";

import { Title, Loading } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { useEditId } from "@/components/publish/post-edits";
import { SELLER_SETUP } from "@/lib/mock-publish";
import { useLiveSetup } from "@/lib/live-publish";

/** New post for sellers: the same composer as creators, with the shop's channels and brands. Signed in, real ones (31 Oct 2026). */
export default function SellerNewPost() {
  const editId = useEditId();
  const setup = useLiveSetup(SELLER_SETUP, "seller");
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title={editId ? "Edit Post" : "Cross-Channel Posting"} sub="Post one video to TikTok, Facebook, Instagram and Threads." />
      {setup === "wait" ? <Loading text="Loading your channels…" /> : setup === "error" ? <p className="v2-muted">Couldn&apos;t load your channels. Please refresh.</p> : <Composer key={setup.live ?? "sample"} setup={setup} />}
    </div>
  );
}
