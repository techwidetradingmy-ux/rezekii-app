"use client";

import { Fragment, useState } from "react";
import { Icon } from "@/components/icons";
import { PlatformIcon } from "@/components/creator2/bits";
import { BrandLogo } from "@/components/brand-logos";
import { AccountFace } from "@/components/publish/account-face";
import { NotYet } from "@/components/not-yet";
import { useDemo } from "@/components/demo";
import { useT } from "@/lib/i18n/client";

export type ConnApp = "tiktok" | "facebook" | "instagram" | "threads" | "shopee";
export type ConnChan = { key: string; app: ConnApp; name: string; sub: string; status: "active" | "reconnect"; role?: "seller" | "affiliate"; initials: string; color: string; photo?: string | null; via?: "facebook" };

/** How many accounts an app shows before the rest fold away (owner, 23 Nov 2026: "maximum five accounts"). */
const SHOW = 5;
const APPS: ConnApp[] = ["tiktok", "facebook", "instagram", "threads", "shopee"];
const ICON: Record<ConnApp, "TikTok" | "Facebook" | "Instagram" | "Threads" | "Shopee"> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads", shopee: "Shopee" };

/**
 * Connections (owner, 23 Nov 2026: "messy"). One Connect button that asks which app; accounts that need reconnecting at the top
 * where they can't be missed; a search box; then each app's accounts, five at most until she unfolds the rest. Each account keeps
 * its actions (Rename for Shopee, Disconnect) behind "⋯", so the list stays quiet.
 */
export function ConnectionsList({ chans, shopeeOn, igViaFacebook = false, can, onConnect, onDisconnect, reload }: {
  chans: ConnChan[];
  shopeeOn: boolean;
  /** Instagram can also be connected through Facebook, for songs on Reels (owner, 23 Nov 2026). */
  igViaFacebook?: boolean;
  can: (app: "tiktok" | "facebook" | "instagram" | "threads") => boolean;
  /** Starts connecting (or reconnecting) TikTok, Facebook, Instagram or Threads; Instagram through Facebook with `via`. */
  onConnect: (app: "tiktok" | "facebook" | "instagram" | "threads", via?: "facebook") => void;
  onDisconnect: (c: ConnChan) => Promise<void> | void;
  reload: () => void;
}) {
  const t = useT();
  const { toast } = useDemo();
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Partial<Record<ConnApp, boolean>>>({});
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ key: string; text: string } | null>(null);

  const shopee = (role: "seller" | "affiliate") => { window.location.href = `/api/auth/shopee/start?role=${role}&from=account`; };
  const reconnect = (c: ConnChan) => (c.app === "shopee" ? shopee(c.role ?? "affiliate") : onConnect(c.app, c.via));
  const label: Record<ConnApp, string> = { tiktok: "TikTok", facebook: t("Facebook Pages"), instagram: "Instagram", threads: "Threads", shopee: "Shopee" };
  const lost = chans.filter((c) => c.status === "reconnect");
  const words = q.trim().toLowerCase();
  const found = words ? chans.filter((c) => `${c.name} ${c.sub}`.toLowerCase().includes(words)) : chans;

  const rename = async () => {
    if (!naming) return;
    const r = await fetch(`/api/shopee/connections/${naming.key.replace("shopee:", "")}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: naming.text }) }).catch(() => null);
    if (!r?.ok) return toast(t("Couldn't rename. Try again."));
    setNaming(null);
    reload();
  };

  const choices: { key: string; icon: "TikTok" | "Facebook" | "Instagram" | "Threads" | "Shopee"; name: string; line: string; app?: "tiktok" | "facebook" | "instagram" | "threads"; role?: "seller" | "affiliate"; via?: "facebook" }[] = [
    { key: "tiktok", icon: "TikTok", name: "TikTok", line: t("Post videos to your TikTok"), app: "tiktok" },
    { key: "facebook", icon: "Facebook", name: t("Facebook Page"), line: t("Pick one or more Pages"), app: "facebook" },
    { key: "instagram", icon: "Instagram", name: "Instagram", line: t("Business or Creator account"), app: "instagram" },
    ...(igViaFacebook ? [{ key: "instagram-fb", icon: "Instagram" as const, name: t("Instagram (Through Facebook)"), line: t("Through its Facebook Page. Lets you add music to Reels."), app: "instagram" as const, via: "facebook" as const }] : []),
    { key: "threads", icon: "Threads", name: "Threads", line: t("Your Threads profile"), app: "threads" },
    ...(shopeeOn ? [
      { key: "shopee-affiliate", icon: "Shopee" as const, name: t("Shopee Affiliate"), line: t("Post Shopee Videos from your affiliate account"), role: "affiliate" as const },
      { key: "shopee-seller", icon: "Shopee" as const, name: t("Shopee Shop"), line: t("Post Shopee Videos with your own products under them"), role: "seller" as const },
    ] : []),
  ];

  const row = (c: ConnChan) => (
    <div key={c.key} className="cr2-cell row">
      <AccountFace icon={ICON[c.app]} photo={c.photo} initials={c.initials} color={c.color} size={34} />
      {naming?.key === c.key ? (
        <span className="cr2-conn shp-name">
          <input className="np-input" value={naming.text} maxLength={60} autoFocus aria-label={t("Name in Rezekii")} onChange={(e) => setNaming({ key: c.key, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void rename(); if (e.key === "Escape") setNaming(null); }} />
          <small>{t("Only in Rezekii. Leave it empty for its usual name.")}</small>
        </span>
      ) : <span className="cr2-conn"><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? <span className="cr2-lost"> · {t("needs reconnecting")}</span> : null}</small></span>}
      <span className="cr2-connbtns">
        {naming?.key === c.key ? (
          <>
            <button type="button" className="np-btn v2-btn-sm" onClick={() => void rename()}>{t("Save")}</button>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => setNaming(null)}>{t("Cancel")}</button>
          </>
        ) : confirm === c.key ? (
          <>
            <button type="button" className="np-btn v2-btn-sm" style={{ background: "var(--red)" }} onClick={() => { setConfirm(null); void onDisconnect(c); }}>{t("Disconnect")}</button>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => setConfirm(null)}>{t("Cancel")}</button>
          </>
        ) : menu === c.key ? (
          <>
            {c.app === "shopee" && <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setMenu(null); setNaming({ key: c.key, text: c.name }); }}>{t("Rename")}</button>}
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setMenu(null); setConfirm(c.key); }}>{t("Disconnect")}</button>
            <button type="button" className="v2-iconbtn" aria-label={t("Close")} onClick={() => setMenu(null)}><Icon name="x" size={16} /></button>
          </>
        ) : (
          <>
            {c.status === "reconnect" && <button type="button" className="np-btn v2-btn-sm" onClick={() => reconnect(c)}><Icon name="refresh" size={15} /> {t("Reconnect")}</button>}
            <button type="button" className="v2-iconbtn" aria-label={t("More options for {name}", { name: c.name })} onClick={() => { setMenu(c.key); setConfirm(null); }} style={{ fontSize: 20, lineHeight: 1 }}>⋯</button>
          </>
        )}
      </span>
    </div>
  );

  return (
    <>
      <div className="cr2-cell row">
        <span className="cr2-conn"><b>{t("{n} accounts", { n: chans.length })}</b>{lost.length ? <small className="cr2-lost">{t("{n} need reconnecting", { n: lost.length })}</small> : <small>{t("Where your posts go")}</small>}</span>
        <button type="button" className={picking ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"} aria-expanded={picking} onClick={() => setPicking((p) => !p)}>{picking ? t("Close") : <><Icon name="plus" size={15} /> {t("Connect")}</>}</button>
      </div>

      {picking && (
        <div className="cr2-cell" style={{ display: "grid", gap: 2 }}>
          <b style={{ fontSize: 15 }}>{t("Connect an Account")}</b>
          <small className="v2-muted" style={{ marginBottom: 4 }}>{t("Pick where you post")}</small>
          {choices.map((ch) => (
            <div key={ch.key} className="cr2-cell row" style={{ paddingInline: 0 }}>
              {ch.icon === "Shopee" ? <BrandLogo name="Shopee" size={30} className="cr2-pi" /> : <PlatformIcon name={ch.icon} size={30} />}
              <span className="cr2-conn"><b>{ch.name}</b><small>{ch.line}</small></span>
              {ch.app && !can(ch.app) ? <NotYet app={ch.app} /> : (
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setPicking(false); if (ch.app) onConnect(ch.app, ch.via); else if (ch.role) shopee(ch.role); }}>{t("Connect")}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {lost.length > 0 && (
        <div className="cr2-cell" style={{ display: "grid", gap: 2, background: "color-mix(in srgb, var(--red) 10%, transparent)" }}>
          <b className="cr2-lost" style={{ fontSize: 14 }}><Icon name="alert" size={15} /> {t("Needs Reconnecting")}</b>
          {lost.map((c) => (
            <div key={c.key} className="cr2-cell row" style={{ paddingInline: 0, background: "none" }}>
              <AccountFace icon={ICON[c.app]} photo={c.photo} initials={c.initials} color={c.color} size={30} />
              <span className="cr2-conn"><b>{c.name}</b><small>{c.sub}</small></span>
              <button type="button" className="np-btn v2-btn-sm" onClick={() => reconnect(c)}><Icon name="refresh" size={15} /> {t("Reconnect")}</button>
            </div>
          ))}
        </div>
      )}

      {chans.length > 8 && (
        <div className="cr2-cell">
          <input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search your {n} accounts", { n: chans.length })} aria-label={t("Search your {n} accounts", { n: chans.length })} style={{ width: "100%" }} />
        </div>
      )}

      {words && !found.length && <div className="cr2-cell"><small className="v2-muted">{t("No accounts match “{q}”.", { q: q.trim() })}</small></div>}

      {APPS.map((app) => {
        const list = found.filter((c) => c.app === app);
        if (!list.length) return null;
        const all = !!open[app] || !!words;
        const shown = all ? list : list.slice(0, SHOW);
        return (
          <Fragment key={app}>
            <div className="cr2-cell" style={{ paddingBlock: "10px 4px", background: "none" }}>
              <small className="v2-muted" style={{ fontWeight: 700, letterSpacing: "0.02em" }}>{label[app]} · {list.length}</small>
            </div>
            {shown.map(row)}
            {list.length > SHOW && !words && (
              <button type="button" className="v2-link" style={{ justifySelf: "start", padding: "6px 4px" }} aria-expanded={all} onClick={() => setOpen((o) => ({ ...o, [app]: !o[app] }))}>
                {all ? t("Show Less") : t("Show {n} More", { n: list.length - SHOW })}
              </button>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
