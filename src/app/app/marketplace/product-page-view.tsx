"use client";

import type { TapProduct } from "@/modules/tap/catalog.ts";
import { ProductBlock, Pulled } from "./product-view";
import { Hud, useTap } from "./use-tap-actions";
import "./marketplace.css";

/** The product page body from the mockup (Product page): the same product view as the Marketplace panel, in a card. */
export function ProductPageView({ p, requested }: { p: TapProduct; requested: boolean }) {
  const tap = useTap(requested ? [p.id] : []);
  return (
    <>
      <section className="nv-up nv-card pd-wrap" aria-labelledby="mkpt">
        <Pulled asOf={p.asOf} />
        <ProductBlock p={p} tap={tap} headingId="mkpt" />
      </section>
      <Hud toast={tap.toast} />
    </>
  );
}
