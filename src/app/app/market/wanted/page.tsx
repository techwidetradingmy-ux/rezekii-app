"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Seg, Title, Loading } from "@/components/ui";
import Link from "next/link";
import { LinkFinder, useWishes } from "@/components/creator1/wish";
import { WANTED, onBoard } from "@/lib/mock-showcase";
import { productHref, type WantedLive } from "@/lib/product-view";
import { loadBoard } from "@/lib/live-wishes";
import { useDemo } from "@/components/demo";
import "@/app/creator1.css";

type Sort = "This week" | "All time";

/**
 * Community Wish List (owner, 29 Oct 2026; renamed from Most Wanted 30 Oct 2026): products creators want on Rezekii, ranked by how many have committed. Joining means saying
 * what you'll give if it launches, never a one-tap vote. A product leaves the board once it launches on Rezekii, and everyone
 * who joined is told. Rates asked and who joined stay private.
 */
export default function MostWanted() {
  const { mine } = useWishes();
  const { live } = useDemo();
  const [sort, setSort] = useState<Sort>("This week");
  // Signed in (owner, 31 Oct 2026): the real board, every creator's wishes added up per product.
  const [real, setReal] = useState<WantedLive[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (live) loadBoard().then((d) => (d ? setReal(d) : setFailed(true)));
  }, [live]);
  const rows: { id: string; name: string; shop: string; img: string; creators: number; week: number }[] = live
    ? (real ?? []).map((w) => ({ id: w.id, name: w.name, shop: w.shop, img: w.img ?? "/avatars/blank.svg", creators: w.creators, week: w.week }))
    : WANTED.filter(onBoard);
  const board = [...rows].sort((a, b) => (sort === "This week" ? b.week - a.week : 0) || b.creators - a.creators);

  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Community Wish List" sub="Products creators want on Rezekii. Join one by saying what you'll give if it launches; we take it to the seller." />

      <section className="v2-card mw-paste">
        <b>Missing a Product?</b>
        <LinkFinder />
      </section>

      <div className="mw-bar">
        <Seg value={sort} options={["This week", "All time"] as const} onChange={setSort} />
      </div>

      {live && !real && (failed ? <p className="v2-muted" style={{ margin: 0 }}>Couldn&apos;t load the wish list. Please try again later.</p> : <Loading text="Loading the wish list…" />)}
      {live && real && !real.length && <p className="v2-muted" style={{ margin: 0 }}>No wishes yet. Paste a product link above to start one.</p>}

      <ol className="mw-list">
        {board.map((w, i) => {
          const joined = mine(w.id);
          return (
            <li key={w.id} className="mw-row">
              <span className="mw-rank">{i + 1}</span>
              <Link href={productHref(w.id)} className="mw-open">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.img} alt="" />
                <span className="sc-main">
                  <b>{w.name}</b>
                  <small>{w.shop}</small>
                  <small className="mw-stat">
                    <Icon name="users" size={13} /> {w.creators} committed
                    {sort === "This week" && w.week > 0 && <em> · +{w.week} this week</em>}
                  </small>
                </span>
              </Link>
              {joined ? (
                <span className="mw-joined"><Icon name="check" size={14} width={2.8} /> Joined</span>
              ) : (
                <Link href={productHref(w.id, { join: true })} className="btn-outline v2-btn-sm">Join</Link>
              )}
            </li>
          );
        })}
      </ol>
      <p className="v2-small" style={{ margin: 0, textAlign: "center" }}>A product leaves this list once it launches on Rezekii. Everyone who joined is told.</p>

    </div>
  );
}
