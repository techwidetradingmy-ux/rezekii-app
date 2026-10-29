"use client";

import "@/app/seller.css";
import "@/app/product-page.css";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Title } from "@/components/ui";
import { SELLER } from "@/lib/mock";
import { UPDATED } from "@/lib/mock-seller";
import { WANTED, onBoard } from "@/lib/mock-showcase";
import { sellerProductHref } from "@/lib/product-pages";

const n = (v: number) => v.toLocaleString("en-MY");

/**
 * Wanted by Creators (owner, 29 Oct 2026): this shop's products that creators asked for on Rezekii, synced with every commitment
 * they make. Each row opens the product's page (owner, 29 Oct 2026: every product opens the same page), which shows who wants
 * it, what they already sell and what they'll give each month, with Submit to TAP, Invite Us and Add a Bonus. We negotiate for
 * the creators; no rate is promised here.
 */
export default function WantedByCreators() {
  const mine = WANTED.filter((w) => w.shop === SELLER.shop && (w.status === "New" || w.status === "Contacting")).sort((a, b) => b.creators - a.creators);
  const ranked = WANTED.filter(onBoard).sort((a, b) => b.week - a.week || b.creators - a.creators);
  const total = (k: "creators" | "videos" | "lives") => mine.reduce((s, w) => s + w[k], 0);

  return (
    <div className="v2-stack v2-in">
      <Title title="Wanted by Creators" sub={<>Products from {SELLER.shop} that creators want to promote on Rezekii, and what they&apos;ll commit. Synced {UPDATED}.</>} />

      <section className="v2-card wb-sum">
        <span><small>Creators asking</small><b>{total("creators")}</b></span>
        <span><small>Videos a month</small><b>{n(total("videos"))}</b></span>
        <span><small>LIVE a month</small><b>{total("lives")}</b></span>
      </section>

      <section className="v2-card">
        {mine.map((w) => (
          <Link key={w.id} href={sellerProductHref(w.id)} className="sl-prow wb-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.img} alt="" />
            <span className="wb-main">
              <b>{w.name}</b>
              <small>{w.creators} creators · {n(w.videos)} videos{w.lives ? `, ${w.lives} LIVE` : ""} a month</small>
              <small>{w.sold30 ? `They sold ${n(w.sold30)} of it in 30 days` : "New listing"}{onBoard(w) ? ` · #${ranked.indexOf(w) + 1} on the Community Wish List` : ""}</small>
            </span>
            <Icon name="arrow" size={16} />
          </Link>
        ))}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>Creators agreed to share their commitment and their sales of your product with you.</p>
    </div>
  );
}
