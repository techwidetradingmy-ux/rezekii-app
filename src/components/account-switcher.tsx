"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { useDemo } from "@/components/demo";
import { useT } from "@/lib/i18n/client";
import { signOut } from "@/lib/sign-out";

type Account = { id: string; name: string; sub: string | null; photo: string | null; current: boolean };
export type SwitchApp = "creator" | "seller" | "admin";

/** Where each app opens after switching (a switched-to account may not be an admin, so Admin opens the creator app). */
const HOME: Record<SwitchApp, string> = { creator: "/app", seller: "/seller/app", admin: "/app" };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "R";

/**
 * Switch Account (owner, 4 Nov 2026): every account signed in on this device, the one in use ticked. Tap one to switch
 * without signing in again; Add Account signs in to another; each other account can be signed out from here. Up to 5.
 */
export function AccountSwitcher({ app, onClose, home }: { app: SwitchApp; onClose: () => void; home?: string }) {
  const t = useT();
  const { toast } = useDemo();
  const [list, setList] = useState<Account[] | null>(null);
  const [max, setMax] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/accounts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("list"))))
      .then((d: { accounts: Account[]; max: number }) => { setList(d.accounts); setMax(d.max); })
      .catch(() => { setList([]); toast(t("Couldn't load your accounts. Please try again.")); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const call = (body: { to?: string; remove?: string }) =>
    fetch("/api/auth/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => (r.ok ? r : Promise.reject(new Error("switch"))));
  const switchTo = (a: Account) => {
    if (a.current || busy) return;
    setBusy(a.id);
    call({ to: a.id })
      .then(() => { window.location.href = home ?? HOME[app]; })
      .catch(() => { setBusy(null); toast(t("Couldn't switch. Please try again.")); });
  };
  const remove = (a: Account) => {
    if (busy) return;
    setBusy(a.id);
    call({ remove: a.id })
      .then(() => { setList((l) => (l ?? []).filter((x) => x.id !== a.id)); toast(t("Signed out of {name}", { name: a.name })); })
      .catch(() => toast(t("That didn't work. Please try again.")))
      .finally(() => setBusy(null));
  };
  const back = home ?? (app === "seller" ? "/seller/app" : null);
  const addHref = `/signin?in=1&add=1${back ? `&next=${encodeURIComponent(back)}` : ""}`;

  return (
    <Sheet title={t("Switch Account")} onClose={onClose}>
      <div className="as-list">
        {list === null && <p className="v2-muted as-wait">{t("Loading…")}</p>}
        {list?.map((a) => (
          <div key={a.id} className={`as-row${a.current ? " on" : ""}`}>
            <button type="button" className="as-pick" onClick={() => switchTo(a)} disabled={!!busy} aria-current={a.current ? "true" : undefined}>
              <span className="as-face">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.photo ? <img src={a.photo} alt="" /> : initials(a.name)}
              </span>
              <span className="as-who">
                <b>{a.name}</b>
                {a.sub && <small>{a.sub}</small>}
              </span>
              {a.current ? <span className="as-tick" aria-label={t("In Use")}><Icon name="check" size={16} width={2.6} /></span> : busy === a.id ? <span className="as-spin" aria-hidden="true" /> : null}
            </button>
            {!a.current && (
              <button type="button" className="as-remove" onClick={() => remove(a)} disabled={!!busy} aria-label={t("Sign Out of {name}", { name: a.name })} title={t("Sign Out of This Account")}>
                <Icon name="x" size={15} />
              </button>
            )}
          </div>
        ))}
        {list !== null && list.length < max && (
          <a href={addHref} className="as-row as-add">
            <span className="as-face"><Icon name="plus" size={18} /></span>
            <span className="as-who"><b>{t("Add Account")}</b></span>
          </a>
        )}
        {list !== null && list.length >= max && <p className="v2-small as-full">{t("Up to {n} accounts on one device. Sign out of one to add another.", { n: max })}</p>}
      </div>
      {list !== null && list.length > 1 && (
        <button type="button" className="as-all" disabled={!!busy} onClick={() => signOut({ all: true, out: app === "seller" ? "/seller" : "/signin?in=1" })}>
          <Icon name="back" size={16} /> {t("Sign Out of All Accounts")}
        </button>
      )}
    </Sheet>
  );
}
