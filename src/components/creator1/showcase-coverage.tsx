"use client";

import Link from "next/link";
import { ON_REZEKII, SHOWCASE_TOTAL } from "@/lib/mock-showcase";

const pct = (n: number) => Math.round((n / SHOWCASE_TOTAL) * 100);

/** A ring showing how much of her showcase is on Rezekii. */
export function CoverageRing({ size = 56 }: { size?: number }) {
  const p = pct(ON_REZEKII);
  return (
    <span className="sc-ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="17" fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx="21" cy="21" r="17" fill="none" stroke="#00c073" strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(2, p)} 100`} transform="rotate(-90 21 21)" />
      </svg>
      <b>{p}%</b>
    </span>
  );
}

/**
 * Home card (owner, 29 Oct 2026): how much of her showcase is on Rezekii, and a way in to ask for the rest.
 */
export function CoverageCard() {
  return (
    <Link href="/app/showcase" className="v2-card sc-card">
      <CoverageRing />
      <span className="sc-main">
        <b>Showcase on Rezekii</b>
        <small>{ON_REZEKII} of {SHOWCASE_TOTAL.toLocaleString("en-MY")} products</small>
      </span>
      <span className="sc-go">Request</span>
    </Link>
  );
}
