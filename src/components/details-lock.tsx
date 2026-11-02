"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * Today's Ideas and AI Picks need her details (owner, 31 Oct 2026): until they're complete, this says what's missing and opens
 * the right place to fill it in.
 */
export function DetailsLock({ missing, what }: { missing: "profile" | "race"; what: string }) {
  return (
    <div className="dl-lock">
      <span className="dl-ic"><Icon name="lock" size={20} /></span>
      <span>
        <b>Complete your details to unlock {what}</b>
        <small>{missing === "race" ? "Add your race in My Account. Rezekii uses your details to analyse your account and match products to you." : "Rezekii uses your details (country, gender, race, birthday, niches) to analyse your account and match products to you."}</small>
      </span>
      <Link href={missing === "race" ? "/app/account" : "/signin?details=1&next=" + encodeURIComponent(typeof window === "undefined" ? "/app" : window.location.pathname)} className="np-btn v2-btn-sm">{missing === "race" ? "Add Race" : "Complete Details"}</Link>
    </div>
  );
}
