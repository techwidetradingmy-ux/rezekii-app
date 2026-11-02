"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Title } from "@/components/ui";
import { ConnBanner } from "@/components/seller/seller-ui";
import { rm } from "@/lib/mock";
import { SHOP_ITEMS, TAP_INVITE as I, TODAY } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { useT } from "@/lib/i18n/client";

/**
 * The page a seller opens from Techwide's invite (owner, 28 Oct 2026): the campaign Techwide set up, the products it suggests,
 * and one button to register. Registering puts the products in the same TAP pipeline as Submit products, in sync both ways.
 */
export default function TapInvite() {
  const t = useT();
  const router = useRouter();
  const { toast, live } = useDemo();
  const open = SHOP_ITEMS.filter((p) => p.stage === "Not submitted");
  const [picked, setPicked] = useState<string[]>(I.products);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);
  // Signed in (owner, 31 Oct 2026): invites are a link to Submit Products now (see Open Campaigns in admin).
  useEffect(() => { if (live) router.replace("/seller/app/submit"); }, [live, router]);
  if (live) return null;
  const sel = open.filter((p) => picked.includes(p.id));

  if (declined) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card sl-done">
          <h2>{t("No Problem")}</h2>
          <p className="v2-muted" style={{ margin: 0, maxWidth: 440 }}>{t("We've told {name}. This link works until {date}.", { name: I.from, date: I.expires })}</p>
          <div className="v2-row" style={{ justifyContent: "center" }}>
            <button type="button" className="np-btn" onClick={() => setDeclined(false)}>{t("Look Again")}</button>
            <Link href="/seller/app/submit" className="btn-outline" style={{ height: 48 }}>{t("Submit Other Products")}</Link>
          </div>
        </section>
      </div>
    );
  }

  if (done) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card sl-done">
          <span className="sl-check"><Icon name="check" size={38} width={2.8} /></span>
          <h2>{sel.length === 1 ? t("{n} product registered", { n: 1 }) : t("{n} products registered", { n: sel.length })}</h2>
          <p className="v2-muted" style={{ margin: 0, maxWidth: 460, lineHeight: 1.55 }}>{t("We'll WhatsApp you when they're live.")}</p>
          <div className="sl-track" style={{ width: "100%", maxWidth: 520, marginTop: 6 }}>
            <div className="done"><i><Icon name="check" size={14} width={3} /></i><b>{t("Registered")}</b><small>{t("Now")}</small></div>
            <div className="now"><i /><b>{t("Our review")}</b><small>{t("Within 1 working day")}</small></div>
            <div className="later"><i /><b>{t("With TikTok")}</b><small>{t("1–3 working days")}</small></div>
            <div className="later"><i /><b>{t("Live")}</b><small>{t("Creators can apply")}</small></div>
          </div>
          <Link href="/seller/app/progress" className="np-btn">{t("See Progress")}</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="v2-stack v2-in">
      <Title title={t("You're Invited to a TAP Campaign")} sub={t("From {name}, {team} · sent {sent} · open until {date}", { name: I.from, team: I.team, sent: I.sent, date: I.expires })} />
      <ConnBanner />

      <section className="v2-card si-hero">
        <span className="si-from"><span className="v2-av">{I.from.slice(0, 2).toUpperCase()}</span><span><b>{I.from}</b><small>{I.team}</small></span></span>
        <p className="si-note">&ldquo;{I.note}&rdquo;</p>
        <h2 className="si-name">{I.name}</h2>
        <div className="si-terms">
          <span><Icon name="tag" size={18} /><b>{t("Public rate +{n}%", { n: I.raise })}</b><small>{t("For creators")}</small></span>
          <span><Icon name="gift" size={18} /><b>{t("{n} samples", { n: I.samples })}</b><small>{t("Per SKU")}</small></span>
          <span><Icon name="cal" size={18} /><b>{t("Until {date}", { date: I.end })}</b><small>{I.extend ? t("Auto-extends before it ends") : t("Ends on this date")}</small></span>
          <span><Icon name="users" size={18} /><b>{I.niche}</b><small>{t("Picked by Techwide")}</small></span>
        </div>
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">1</span><h2>{t("Products {name} suggests", { name: I.from })}</h2><span className="v2-small">{t("{n} picked", { n: sel.length })}</span></div>
        <div>
          {open.map((p) => {
            const on = picked.includes(p.id);
            return (
              <label key={p.id} className={`sl-pick ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} />
                {/* The photo and name open the product; the rest of the row ticks it. */}
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={(e) => { e.preventDefault(); router.push(sellerProductHref(p.id)); }} />
                <span className="sl-pinfo">
                  <strong><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></strong>
                  <small>{rm(p.price)}{I.products.includes(p.id) ? ` · ${t("suggested")}` : ""}</small>
                </span>
                <span className="sl-pick-rate">
                  <span className="sl-rate">{p.publicRate === null ? t("Public ?") : `${p.publicRate}%`} <Icon name="arrow" size={12} /> <b>{p.publicRate === null ? `+${I.raise}%` : `${p.publicRate + I.raise}%`}</b></span>
                  <small>{p.publicRate === null ? t("Public rate unknown") : t("Public {rate}% now", { rate: p.publicRate })}</small>
                </span>
              </label>
            );
          })}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>{t("Change rate or samples?")} <button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => toast(t("Opening WhatsApp with {name}…", { name: I.from }))}>{t("Ask {name}", { name: I.from })}</button></p>
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">2</span><h2>{t("How It Works")}</h2></div>
        <ul className="si-sync">
          <li><Icon name="refresh" size={16} /><span>{t("Changes sync to {name} and TikTok.", { name: I.from })}</span></li>
          <li><Icon name="kanban" size={16} /><span>{t("Our review, then TikTok, then live.")}</span></li>
          <li><Icon name="shield" size={16} /><span>{t("Change it later in Change or End.")}</span></li>
        </ul>
      </section>

      <div className="sl-sticky">
        <span>
          <b>{sel.length === 1 ? t("{n} product", { n: 1 }) : t("{n} products", { n: sel.length })} · +{I.raise}% · {t("{n} samples", { n: I.samples })}</b>
          {sel.length === 0 ? <span className="sl-err" style={{ fontSize: 12.5 }}>{t("Pick at least 1 product.")}</span> : <span>{t("Registers today, {date}", { date: TODAY })}</span>}
        </span>
        <span className="si-acts">
          <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setDeclined(true)}>{t("Not Now")}</button>
          <button type="button" className="np-btn" disabled={sel.length === 0} onClick={() => { setDone(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{sel.length ? t("Register {n}", { n: sel.length }) : t("Register")}</button>
        </span>
      </div>
    </div>
  );
}
