"use client";

import { useDemo } from "@/components/demo";
import { Tip } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { canConnect, canPost, WAITING, type Network } from "@/lib/platforms";

/** Whether she may start connecting an app now (open to everyone, or she's an admin). */
export function useCanConnect(): (app: Network) => boolean {
  const { me } = useDemo();
  return (app) => canConnect(app, me?.role === "admin");
}

/** Whether she may post to an app through Rezekii now. */
export function useCanPost(): (app: Network) => boolean {
  const { me } = useDemo();
  return (app) => canPost(app, me?.role === "admin");
}

/** Shown instead of Connect while the app waits for its platform's approval (owner, 3 Nov 2026), with the reason in a tip. */
export function NotYet({ app }: { app: Network }) {
  const t = useT();
  return (
    <span className="not-yet">
      <span className="badge badge-gray">{t("Not Available Yet")}</span>
      <Tip text={t(WAITING[app])} />
    </span>
  );
}
