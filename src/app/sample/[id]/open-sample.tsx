"use client";

import { useEffect, useState } from "react";

/** Makes a fresh TikTok sample request link for this phone and opens it in the TikTok app. */
export function OpenSample({ id }: { id: string }) {
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id }) })
      .then((r) => r.json().then((d: { deeplink?: string; error?: string }) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!live) return;
        if (ok && d.deeplink) window.location.replace(d.deeplink);
        else setError(d.error || "TikTok didn't open the sample request. Please try again.");
      })
      .catch(() => live && setError("Couldn't reach Rezekii. Check your connection and try again."));
    return () => { live = false; };
  }, [id]);
  return error ? (
    <>
      <h1>Couldn&apos;t open the sample request</h1>
      <p>{error} <a href={`/app/marketplace/${id}`}>Back to the product</a></p>
    </>
  ) : (
    <>
      <h1>Opening TikTok&apos;s sample request…</h1>
      <p>Submit it in TikTok. It then shows in My Samples.</p>
    </>
  );
}
