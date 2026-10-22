"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client.tsx";
import { tx } from "@/lib/i18n/lang.ts";

type Reply = { ok: boolean; status: number; d: { deeplink?: string; error?: string } };
const ask = (id: string): Promise<Reply> =>
  fetch("/api/tap/samples", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: id }) })
    .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, d })));

/**
 * Makes a fresh TikTok sample request link for this phone and opens it in the TikTok app. When TikTok doesn't answer (a 5xx),
 * it asks once more after a few seconds before showing the problem.
 */
export function OpenSample({ id }: { id: string }) {
  const t = useT();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      let r = await ask(id);
      if (!r.ok && r.status >= 500 && live) {
        await new Promise((done) => setTimeout(done, 3000));
        r = await ask(id);
      }
      if (!live) return;
      if (r.ok && r.d.deeplink) window.location.replace(r.d.deeplink);
      else setError(r.d.error || tx("TikTok didn't open the sample request. Please try again."));
    })().catch(() => live && setError(tx("Couldn't reach Rezekii. Check your connection and try again.")));
    return () => { live = false; };
  }, [id]);
  return error ? (
    <>
      <h1>{t("Couldn't open the sample request")}</h1>
      <p>{t(error)} <a href={`/app/marketplace/${id}`}>{t("Back to the product")}</a></p>
    </>
  ) : (
    <>
      <h1>{t("Opening TikTok's sample request…")}</h1>
      <p>{t("Submit it in TikTok. It then shows in My Samples.")}</p>
    </>
  );
}
