"use client";

import "@/app/seller.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import { loadShop } from "@/lib/live";
import { loadBoard } from "@/lib/live-wishes";
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
type Row = { id: string; name: string; img: string; creators: number; videos: number; lives: number; sold30: number; rank: number | null };

export default function WantedByCreators() {
  const { live, me } = useDemo();
  // Signed in (owner, 31 Oct 2026): her own shop's products on the real wish list board.
  const [real, setReal] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!live) return;
    Promise.all([loadBoard(), loadShop()]).then(([board, shop]) => {
      if (!board || !shop) return setFailed(true);
      const ids = new Set(shop.items.map((p) => p.id));
      const ranked = [...board].sort((a, b) => b.week - a.week || b.creators - a.creators);
      setReal(board.filter((w) => ids.has(w.id)).map((w) => ({ id: w.id, name: w.name, img: w.img ?? "/avatars/blank.svg", creators: w.creators, videos: w.videos, lives: w.lives, sold30: 0, rank: ranked.indexOf(w) + 1 })));
    }).catch(() => setFailed(true));
  }, [live]);
  const ranked = WANTED.filter(onBoard).sort((a, b) => b.week - a.week || b.creators - a.creators);
  const mine: Row[] = live
    ? real ?? []
    : WANTED.filter((w) => w.shop === SELLER.shop && (w.status === "New" || w.status === "Contacting"))
        .sort((a, b) => b.creators - a.creators)
        .map((w) => ({ id: w.id, name: w.name, img: w.img, creators: w.creators, videos: w.videos, lives: w.lives, sold30: w.sold30, rank: onBoard(w) ? ranked.indexOf(w) + 1 : null }));
  const total = (k: "creators" | "videos" | "lives") => mine.reduce((s, w) => s + w[k], 0);
  const shop = live ? me?.sellerShop ?? "your shop" : SELLER.shop;

  return (
    <div className="v2-stack v2-in">
      <Title title="Wanted by Creators" sub={live ? <>Products from {shop} that creators want to promote on Rezekii, and what they&apos;ll commit.</> : <>Products from {shop} that creators want to promote on Rezekii, and what they&apos;ll commit. Synced {UPDATED}.</>} />

      <section className="v2-card wb-sum">
        <span><small>Creators asking</small><b>{total("creators")}</b></span>
        <span><small>Videos a month</small><b>{n(total("videos"))}</b></span>
        <span><small>LIVE a month</small><b>{total("lives")}</b></span>
      </section>

      <section className="v2-card">
        {live && !real && <p className="v2-muted" style={{ margin: 0 }}>{failed ? "Couldn't load this list. Please try again later." : "Loading…"}</p>}
        {live && real && !real.length && <p className="v2-muted" style={{ margin: 0 }}>No creators have asked for your products yet. When they do, you&apos;ll see what they commit here.</p>}
        {mine.map((w) => (
          <Link key={w.id} href={sellerProductHref(w.id)} className="sl-prow wb-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.img} alt="" />
            <span className="wb-main">
              <b>{w.name}</b>
              <small>{w.creators} creators · {n(w.videos)} videos{w.lives ? `, ${w.lives} LIVE` : ""} a month</small>
              <small>{live ? "" : w.sold30 ? `They sold ${n(w.sold30)} of it in 30 days` : "New listing"}{w.rank ? `${live ? "" : " · "}#${w.rank} on the Community Wish List` : ""}</small>
            </span>
            <Icon name="arrow" size={16} />
          </Link>
        ))}
      </section>
      <p className="v2-small" style={{ margin: 0 }}>{live ? "Creators agreed to share what they'll commit with you." : "Creators agreed to share their commitment and their sales of your product with you."}</p>
    </div>
  );
}
