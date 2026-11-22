"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { PlatformIcon } from "@/components/creator2/bits";
import { AccountFace } from "@/components/publish/account-face";
import { useT } from "@/lib/i18n/client";

export type ShopeeChan = { key: string; app: string; name: string; sub: string; status: "active" | "reconnect"; role?: "seller" | "affiliate"; initials?: string; color?: string; photo?: string | null };

/**
 * Shopee accounts in Connections (owner, 21 Nov 2026, from rezekii.com's Shopee build): a shop or an affiliate account, each
 * with Rename (Rezekii only), Reconnect and Disconnect, and Connect for each kind. `from` sends Shopee's sign-in back here.
 */
export function ShopeeAccounts({ chans, from, row, size = 34, reload }: { chans: ShopeeChan[]; from: "account" | "seller-account"; row: string; size?: number; reload: () => void }) {
  const t = useT();
  const { toast } = useDemo();
  const [naming, setNaming] = useState<{ key: string; text: string } | null>(null);
  const mine = chans.filter((c) => c.app === "shopee");
  const connect = (role: "seller" | "affiliate") => { window.location.href = `/api/auth/shopee/start?role=${role}&from=${from}`; };
  const id = (c: ShopeeChan) => c.key.replace("shopee:", "");
  const disconnect = async (c: ShopeeChan) => {
    const r = await fetch(`/api/shopee/connections/${id(c)}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return toast(t("Couldn't disconnect. Try again."));
    toast(t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
    reload();
  };
  const rename = async () => {
    if (!naming) return;
    const c = mine.find((x) => x.key === naming.key);
    const r = await fetch(`/api/shopee/connections/${c ? id(c) : ""}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: naming.text }) }).catch(() => null);
    if (!r?.ok) return toast(t("Couldn't rename. Try again."));
    setNaming(null);
    reload();
  };
  return (
    <>
      {mine.map((c) => (
        <div key={c.key} className={row}>
          {/* The shop's own logo when Shopee gave one (owner, 22 Nov 2026). */}
          {c.photo ? <AccountFace icon="Shopee" photo={c.photo} initials={c.initials ?? "S"} color={c.color ?? "#ee4d2d"} size={size} /> : <PlatformIcon name="Shopee" size={size} />}
          {naming?.key === c.key ? (
            <span className="cr2-conn shp-name">
              <input className="np-input" value={naming.text} maxLength={60} autoFocus aria-label={t("Name in Rezekii")} onChange={(e) => setNaming({ key: c.key, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void rename(); if (e.key === "Escape") setNaming(null); }} />
              <small>{t("Only in Rezekii. Leave it empty for its usual name.")}</small>
            </span>
          ) : <span className="cr2-conn"><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? ` · ${t("needs reconnecting")}` : ""}</small></span>}
          <span className="cr2-connbtns">
            {naming?.key === c.key ? (
              <>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => void rename()}>{t("Save")}</button>
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => setNaming(null)}>{t("Cancel")}</button>
              </>
            ) : (
              <>
                {c.status === "reconnect" && <button type="button" className="np-btn v2-btn-sm" onClick={() => connect(c.role ?? "affiliate")}><Icon name="refresh" size={15} /> {t("Reconnect")}</button>}
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => setNaming({ key: c.key, text: c.name })}>{t("Rename")}</button>
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => void disconnect(c)}>{t("Disconnect")}</button>
              </>
            )}
          </span>
        </div>
      ))}
      {(["seller", "affiliate"] as const).map((role) => {
        const has = mine.some((c) => c.role === role);
        const label = role === "seller" ? t("Shopee Shop") : t("Shopee Affiliate");
        return (
          <Fragment key={role}>
            <div className={row}>
              <PlatformIcon name="Shopee" size={size} />
              <span className="cr2-conn"><b>{has ? t("Add Another {account}", { account: label }) : label}</b><small>{role === "seller" ? t("Post Shopee Videos with your own products under them") : t("Post Shopee Videos from your affiliate account")}</small></span>
              <button type="button" className={has ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"} onClick={() => connect(role)}>{t("Connect")}</button>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
