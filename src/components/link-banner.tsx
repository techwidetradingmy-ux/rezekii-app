"use client";

import { useDemo } from "./demo";
import { useT } from "@/lib/i18n/client";

/** Creator pages before TikTok Shop is linked: what linking unlocks (V1 already shows this banner). */
export function LinkBanner() {
  const { linked, setLinked } = useDemo();
  const t = useT();
  if (linked) return null;
  return (
    <div className="v2-alert">
      <span>{t("Link TikTok Shop to see commission and scan your showcase.")}</span>
      <button type="button" onClick={() => setLinked(true)}>{t("Link TikTok Shop")}</button>
    </div>
  );
}
