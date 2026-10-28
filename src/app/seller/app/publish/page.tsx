"use client";

import { Title } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { SELLER_SETUP } from "@/lib/mock-publish";

/** New post for sellers: the same composer as creators, with the shop's channels and brands. */
export default function SellerNewPost() {
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Cross-Channel Posting" sub="Post one video to TikTok, Facebook, Instagram and Threads." />
      <Composer setup={SELLER_SETUP} />
    </div>
  );
}
