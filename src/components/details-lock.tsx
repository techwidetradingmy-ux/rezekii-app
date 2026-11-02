"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

/**
 * Today's Ideas and AI Picks need her details (owner, 31 Oct 2026): until they're complete, this says what's missing and opens
 * the right place to fill it in. `what` is the page's English name ("AI Picks") and shows in her language.
 */
export function DetailsLock({ missing, what }: { missing: "profile" | "race"; what: string }) {
  const t = useT();
  return (
    <div className="dl-lock">
      <span className="dl-ic"><Icon name="lock" size={20} /></span>
      <span>
        <b>{t("Complete your details to unlock {what}", { what: t(what) })}</b>
        <small>{missing === "race" ? t("Add your race in My Account. Rezekii uses your details to analyse your account and match products to you.") : t("Rezekii uses your details (country, gender, race, birthday, niches) to analyse your account and match products to you.")}</small>
      </span>
      <Link href={missing === "race" ? "/app/account" : "/signin?details=1&next=" + encodeURIComponent(typeof window === "undefined" ? "/app" : window.location.pathname)} className="np-btn v2-btn-sm">{missing === "race" ? t("Add Race") : t("Complete Details")}</Link>
    </div>
  );
}
