"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useDemo } from "./demo";
import { SUPPORT } from "@/lib/support";
import type { BetaState } from "@/modules/beta/access.ts";

/**
 * "You're on the List" (owner, 2 Nov 2026): a new account waits here until Techwide lets it in. Nothing else in the app opens.
 * Shown instead of the whole app frame, so no menu, bell or account panel loads for someone who isn't in yet.
 */
export function BetaWait({ side, state }: { side: "creator" | "seller"; state: BetaState | null }) {
  const { me, refreshMe } = useDemo();
  const [beta, setBeta] = useState<BetaState | null>(state);
  const [failed, setFailed] = useState(false);
  const post = (body: object) => fetch("/api/v2/beta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side, ...body }) });
  // First time on this app: join the queue (an earlier place is kept).
  useEffect(() => {
    if (state) return setBeta(state);
    post({})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("join"))))
      .then((d: { beta: BetaState | null }) => {
        if (d.beta?.status === "approved") refreshMe();
        setBeta(d.beta);
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, state]);
  const signOut = () => fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/signin?in=1"; });
  const name = me?.name?.split(" ")[0];
  const s = beta?.status;
  return (
    <div className="bw-page">
      <div className="bw-card v2-in">
        <span className="bw-brand"><Image src="/master-logo-transparent.png" alt="" width={28} height={28} priority /> Rezekii</span>
        <Image className="bw-mascot" src={s === "declined" ? "/mascot/rimau-sad.webp" : "/mascot/rimau-wave.webp"} alt="" width={150} height={183} priority />
        {!beta && !failed && <p className="v2-muted">Checking your place…</p>}
        {failed && <p className="v2-muted">Couldn't load your place. Please refresh the page.</p>}
        {s === "waiting" && (
          <>
            <h1>You&apos;re on the List{name ? `, ${name}` : ""}</h1>
            <p>Rezekii is in beta, with {beta!.cap} places for creators. We check every sign-up and let you in soon. We&apos;ll email you when you&apos;re in.</p>
            <div className="bw-stats">
              <span><b>{beta!.place}</b><small>Your Place in the Queue</small></span>
              <span><b>{beta!.taken} of {beta!.cap}</b><small>Places Taken</small></span>
            </div>
          </>
        )}
        {s === "waitlist" && (
          <>
            <h1>You&apos;re on the Waitlist{name ? `, ${name}` : ""}</h1>
            <p>
              {side === "seller"
                ? "Seller accounts open after the creator beta. You're on the seller waitlist, and we'll email you when you're in."
                : `All ${beta!.cap} beta places are taken. You're on the waitlist, and we'll email you when a place opens.`}
            </p>
            <div className="bw-stats">
              <span><b>{beta!.place}</b><small>Your Place on the Waitlist</small></span>
            </div>
          </>
        )}
        {s === "declined" && (
          <>
            <h1>We Can&apos;t Let You In Yet</h1>
            <p>{beta!.reason ? beta!.reason.replace(/[.!?]?$/, ".") : "Your sign-up wasn't approved this time."} Message us on WhatsApp if you have questions.</p>
          </>
        )}
        {(s === "waiting" || s === "waitlist") && beta!.group && (
          <a className="np-btn bw-group" href={beta!.group} target="_blank" rel="noreferrer" onClick={() => void post({ group: true })}>
            <Icon name="whatsapp" size={18} /> Join Our WhatsApp Group
          </a>
        )}
        <div className="bw-acts">
          <a className="btn-outline" href={SUPPORT.waLink} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> Contact Support</a>
          <button type="button" className="btn-outline" onClick={() => void signOut()}><Icon name="back" size={16} /> Sign Out</button>
        </div>
        {me?.email && <small className="v2-muted">Signed in as {me.email}</small>}
      </div>
    </div>
  );
}
