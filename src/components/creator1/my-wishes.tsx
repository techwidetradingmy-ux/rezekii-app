"use client";

import Link from "next/link";
import { LinkFinder, WishSteps, useWishes } from "@/components/creator1/wish";
import { commitText } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";
import { useT } from "@/lib/i18n/client";
import "@/app/creator1.css";

/**
 * My Account · Wish List (owner, 30 Oct 2026): products she asked us to get a free sample or a better rate for, and where each
 * stands with the seller. Off the app home; she adds from a product page or by pasting a link here.
 */
export function MyWishes() {
  const t = useT();
  const { wishes } = useWishes();
  return (
    <div className="v2-stack v2-in" style={{ gap: 14 }}>
      <section className="v2-card">
        <b>{t("Want a Free Sample or a Better Rate?")}</b>
        <p className="v2-muted" style={{ margin: 0 }}>{t("Paste any TikTok Shop product link. Our team takes it to the seller.")}</p>
        <LinkFinder />
      </section>
      <ul className="sc-list">
        {wishes.map((w) => (
          <li key={w.id}>
            <Link href={productHref(w.id)} className="sc-row sc-asked">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.img} alt="" />
              <span className="sc-main"><b>{w.name}</b><WishSteps w={w} /><small>{commitText(w.commit)}</small></span>
            </Link>
          </li>
        ))}
        {wishes.length === 0 && <li className="sc-empty">{t("Your wish list is empty.")}</li>}
      </ul>
    </div>
  );
}
