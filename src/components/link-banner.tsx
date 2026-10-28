"use client";

import { useDemo } from "./demo";

/** Creator pages before TikTok Shop is linked: what linking unlocks (V1 already shows this banner). */
export function LinkBanner() {
  const { linked, setLinked } = useDemo();
  if (linked) return null;
  return (
    <div className="v2-alert">
      <span>Link TikTok Shop to see commission and scan your showcase.</span>
      <button type="button" onClick={() => setLinked(true)}>Link TikTok Shop</button>
    </div>
  );
}
