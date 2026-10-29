"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Seg, Title } from "@/components/ui";
import Link from "next/link";
import { LinkFinder, useWishes } from "@/components/creator1/wish";
import { WANTED, onBoard } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";
import "@/app/creator1.css";

type Sort = "This week" | "All time";

/**
 * Most Wanted (owner, 29 Oct 2026): products creators want on Rezekii, ranked by how many have committed. Joining means saying
 * what you'll give if it launches, never a one-tap vote. A product leaves the board once it launches on Rezekii, and everyone
 * who joined is told. Rates asked and who joined stay private.
 */
export default function MostWanted() {
  const { mine } = useWishes();
  const [sort, setSort] = useState<Sort>("This week");
  const board = WANTED.filter(onBoard).sort((a, b) => (sort === "This week" ? b.week - a.week : 0) || b.creators - a.creators);

  return (
    <div className="v2-stack v2-in" style={{ gap: 16 }}>
      <Title title="Most Wanted" sub="Products creators want on Rezekii. Join one by saying what you'll give if it launches; we take it to the seller." />

      <section className="v2-card mw-paste">
        <b>Missing a Product?</b>
        <LinkFinder />
      </section>

      <div className="mw-bar">
        <Seg value={sort} options={["This week", "All time"] as const} onChange={setSort} />
      </div>

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
