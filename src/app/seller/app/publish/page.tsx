"use client";

import { Title, Loading } from "@/components/ui";
import { Composer } from "@/components/publish/composer";
import { useEditId } from "@/components/publish/post-edits";
import { SELLER_SETUP } from "@/lib/mock-publish";
import { useLiveSetup } from "@/lib/live-publish";
import { useT } from "@/lib/i18n/client";

/** New post for sellers: the same composer as creators, with the shop's channels and brands. Signed in, real ones (31 Oct 2026). */
export default function SellerNewPost() {
  const t = useT();
  const editId = useEditId();
  const setup = useLiveSetup(SELLER_SETUP, "seller");
  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title={editId ? t("Edit Post") : t("Cross-Channel Posting")} sub={t("Post one video to TikTok, Facebook, Instagram and Threads.")} />
      {setup === "wait" ? <Loading text={t("Loading your channels…")} /> : setup === "error" ? <p className="v2-muted">{t("Couldn't load your channels. Please refresh.")}</p> : <Composer key={setup.live ?? "sample"} setup={setup} />}
    </div>
  );
}
