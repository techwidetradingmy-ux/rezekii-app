"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { useDemo } from "./demo";
import { SUPPORT } from "@/lib/support";
import { useT } from "@/lib/i18n/client";
import type { BetaState } from "@/modules/beta/access.ts";

/**
 * "You're on the List" (owner, 2 Nov 2026): a new account waits here until Techwide lets it in. Nothing else in the app opens.
 * Shown instead of the whole app frame, so no menu, bell or account panel loads for someone who isn't in yet.
 */
export function BetaWait({ side, state }: { side: "creator" | "seller"; state: BetaState | null }) {
  const { me, refreshMe, toast } = useDemo();
  const t = useT();
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
  // Declined isn't for ever (owner, 3 Nov 2026): she can ask again and goes back on the list.
  const [asking, setAsking] = useState(false);
  const applyAgain = () => {
    if (asking) return;
    setAsking(true);
    post({ again: true })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("again"))))
      .then((d: { beta: BetaState | null }) => { setBeta(d.beta); toast(t("You're back on the list. We'll look at your sign-up again.")); })
      .catch(() => toast(t("Didn't send. Please try again.")))
      .finally(() => setAsking(false));
  };
  const name = me?.name?.split(" ")[0];
  const s = beta?.status;
  return (
    <div className="bw-page">
      <div className="bw-card v2-in">
        <span className="bw-brand"><Image src="/master-logo-transparent.png" alt="" width={28} height={28} priority /> Rezekii</span>
        <Image className="bw-mascot" src={s === "declined" ? "/mascot/rimau-sad.webp" : "/mascot/rimau-wave.webp"} alt="" width={150} height={183} priority />
        {!beta && !failed && <p className="v2-muted">{t("Checking your place…")}</p>}
        {failed && <p className="v2-muted">{t("Couldn't load your place. Please refresh the page.")}</p>}
        {s === "waiting" && (
          <>
            <h1>{name ? t("You're on the List, {name}", { name }) : t("You're on the List")}</h1>
            {/* No queue numbers (owner, 3 Nov 2026: don't show how many people are waiting). */}
            <p>{t("Rezekii is in beta. We check every sign-up and let you in soon. We'll email you when you're in.")}</p>
          </>
        )}
        {s === "waitlist" && (
          <>
            <h1>{name ? t("You're on the Waitlist, {name}", { name }) : t("You're on the Waitlist")}</h1>
            <p>
              {side === "seller"
                ? t("Seller accounts open after the creator beta. You're on the seller waitlist, and we'll email you when you're in.")
                : t("All beta places are taken. You're on the waitlist, and we'll email you when a place opens.")}
            </p>
          </>
        )}
        {s === "declined" && (
          <>
            <h1>{t("We Can't Let You In Yet")}</h1>
            {/* The reason is Techwide's own words, so it shows as written. */}
            <p>{beta!.reason ? beta!.reason.replace(/[.!?]?$/, ".") : t("Your sign-up wasn't approved this time.")} {t("Message us on WhatsApp if you have questions.")}</p>
            <p>{t("Sorted it out? Apply again and we'll look at your sign-up again.")}</p>
            <button type="button" className="np-btn bw-group" disabled={asking} onClick={applyAgain}><Icon name="refresh" size={18} /> {asking ? t("Sending…") : t("Apply Again")}</button>
          </>
        )}
        {(s === "waiting" || s === "waitlist") && beta!.group && (
          <a className="np-btn bw-group" href={beta!.group} target="_blank" rel="noreferrer" onClick={() => void post({ group: true })}>
            <Icon name="whatsapp" size={18} /> {t("Join Our WhatsApp Group")}
          </a>
        )}
        <div className="bw-acts">
          <a className="btn-outline" href={SUPPORT.waLink} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /> {t("Contact Support")}</a>
          <button type="button" className="btn-outline" onClick={() => void signOut()}><Icon name="back" size={16} /> {t("Sign Out")}</button>
        </div>
        {me?.email && <small className="v2-muted">{t("Signed in as {email}", { email: me.email })}</small>}
      </div>
    </div>
  );
}
