"use client";

import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx } from "@/lib/i18n/lang.ts";
import { Emblem, type Level } from "../../emblems";
import { BLESS, cardImage, cardImages, cardVideo, DESIGNS } from "./share-card";
import { SHARE_APPS } from "./share-apps";
import { Hud, useToast } from "../marketplace/use-tap-actions";

const NAMES: Record<Level, string> = { bronze: tx("Bronze"), silver: tx("Silver"), gold: tx("Gold") };

/** The mockup's "Share your proud moment" window: a level-up card as a 5-second video or an image, in 3 designs. */
export function ShareSheet({ level, handle, username, bless, onBless, onClose }: { level: Level; handle: string; username: string | null; bless: number; onBless: () => void; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const [fmt, setFmt] = useState<"video" | "image">("video");
  const [design, setDesign] = useState(0);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState("");
  const { toast, flash } = useToast();
  const levelName = t(NAMES[level]);
  const [caption, setCaption] = useState(t("Alhamdulillah, I just reached {level} on Rezekii! 🎉 Thank you to everyone who watched and bought. #RezekiiCreator #TikTokShopMY", { level: levelName }));
  const blessing = t(BLESS[bless % BLESS.length]);
  const link = `https://rezekii.com/c/${encodeURIComponent(username ?? "")}`;
  const month = new Date().toLocaleDateString(dateLocale(lang), { month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  const chip = t("✦ LEVEL UP · {month}", { month: month.toUpperCase() });
  const hi = t("Congratulations,");
  const now = t("You're now {level}", { level: levelName });
  const vid = fmt === "video";

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  /** Makes the image or video from the card drawing. */
  async function makeFile(): Promise<File> {
    const imgs = await cardImages(level);
    const font = getComputedStyle(document.body).fontFamily;
    const input = { design, level, handle, blessing, words: { chip, hi, now }, font, ...imgs };
    return vid ? cardVideo(input) : cardImage(input);
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function go(app: string) {
    if (busy) return;
    const text = `${caption} ${link}`;
    const web: Record<string, string> = {
      WhatsApp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      Telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(caption)}`,
      X: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(link)}`,
    };
    setBusy(app);
    try {
      const file = await makeFile();
      // On a phone the system share menu takes the file and the caption, so any app works.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (web[app]) {
        window.open(web[app], "_blank", "noopener");
        return;
      }
      download(file);
      const where = app === "More" ? t("any app") : app;
      flash(vid ? t("Video saved. Open {app} and post it with your caption.", { app: where }) : t("Image saved. Open {app} and post it with your caption.", { app: where }));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // closed the share menu
      flash(err instanceof Error ? t(err.message) : t("Could not share. Please try again."), false);
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (busy) return;
    setBusy("save");
    try {
      download(await makeFile());
      flash(vid ? t("Video saved") : t("Image saved"));
    } catch (err) {
      flash(err instanceof Error ? t(err.message) : t("Could not save. Please try again."), false);
    } finally {
      setBusy("");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      flash(t("Link copied: {link}", { link: link.replace("https://", "") }));
    } catch {
      flash(link.replace("https://", ""));
    }
  }

  return (
    <>
      <button type="button" className="lv-dimshare" aria-label={t("Close sharing")} onClick={close} />
      <div className={`lv-share ${closing ? "out" : ""}`} role="dialog" aria-modal="true" aria-labelledby="lvsh">
        <span className="nv-grab" aria-hidden="true" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h3 id="lvsh" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t("Share your proud moment")}</h3>
          <button type="button" className="nv-link" onClick={close}>{t("Done")}</button>
        </div>
        <div className="lv-shgrid">
          <div className="lv-shleft">
            <div className={`lv-story ${vid ? "vid" : ""} ${["dsA", "dsB", "dsC"][design]}`} role="img" aria-label={t("Celebration story {kind} ({design} design): Rezekii logo, Congratulations, {handle}, you are now {level}. {blessing}", { kind: vid ? t("video") : t("image"), design: t(DESIGNS[design]).toLowerCase(), handle, level: levelName, blessing })}>
              {vid && <span className="lv-vbar" aria-hidden="true"><span /></span>}
              <span className="st-bub" aria-hidden="true" style={{ width: 90, height: 90, left: -24, top: 40, background: "radial-gradient(circle, rgba(179,107,214,.35), transparent 70%)" }} />
              <span className="st-bub" aria-hidden="true" style={{ width: 120, height: 120, right: -40, top: 180, background: "radial-gradient(circle, rgba(125,132,184,.35), transparent 70%)", animationDelay: "1.2s" }} />
              <span className="st-bub" aria-hidden="true" style={{ width: 70, height: 70, left: 30, bottom: 60, background: "radial-gradient(circle, rgba(255,122,168,.3), transparent 70%)", animationDelay: "2.1s" }} />
              <span className="st-chip st-t">{chip}</span>
              <span className="em-wrap" style={{ position: "relative", display: "inline-flex" }}><Emblem level={level} size={84} animate /></span>
              <span className="st-hi st-t">{hi}</span>
              <strong className="st-name st-t">{handle}</strong>
              <span className="st-lvl st-t">{now}</span>
              <span className="st-quote">“{blessing}”</span>
              <span className="st-cobrand">
                <span className="st-cb-side">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/master-logo-transparent.png" alt="" className="st-cb-logo" />
                  <span className="st-cb-txt"><b>Rezekii</b><small>rezekii.com</small></span>
                </span>
                <span className="st-cb-side st-cb-tt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="st-cb-plogo" src="/tiktok-shop-partner-logo.png" alt="TikTok Shop Partner" />
                </span>
              </span>
            </div>
          </div>
          <div className="lv-shright">
            <div className="lv-shsegs">
              <div className="nv-seg" role="group" aria-label={t("Share as")} style={{ width: 300, maxWidth: "100%", alignSelf: "center" }}>
                <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: `translateX(${vid ? 0 : 100}%)` }} />
                {([["video", tx("Video · 5 sec")], ["image", tx("Image")]] as const).map(([k, label]) => <button key={k} type="button" className={fmt === k ? "on" : ""} aria-pressed={fmt === k} onClick={() => setFmt(k)}>{t(label)}</button>)}
              </div>
              <div className="nv-seg" role="group" aria-label={t("Card design")} style={{ width: 330, maxWidth: "100%", alignSelf: "center" }}>
                <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${design * 100}%)` }} />
                {DESIGNS.map((label, i) => <button key={label} type="button" className={design === i ? "on" : ""} aria-pressed={design === i} onClick={() => setDesign(i)}>{t(label)}</button>)}
              </div>
            </div>
            <div className="lv-bless">
              <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">✨</span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{t("Blessing on your card")}</strong>
                <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>{blessing}</span>
              </span>
              <button type="button" className="nv-btn2 nv-sm nv-press" onClick={onBless} style={{ flexShrink: 0 }}>{t("Another")}</button>
            </div>
            <label className="nv-label" htmlFor="lvcap">{t("Caption")}</label>
            <textarea id="lvcap" className="nv-input" rows={2} value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 300))} />
            <div className="lv-apps" role="group" aria-label={t("Share to")}>
              {SHARE_APPS.map(([label, bg, d, fill, stroke, sw]) => (
                <button key={label} type="button" className="lv-app" onClick={() => go(label)} aria-busy={busy === label}>
                  <span className="ic" style={{ background: bg }}>
                    {busy === label ? <span className="nv-spin" aria-hidden="true" /> : <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  {t(label)}
                </button>
              ))}
            </div>
            <div className="lv-acts">
              <button type="button" className="lv-act nv-press" onClick={copyLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></svg>
                {t("Copy link")}
              </button>
              <button type="button" className="lv-act nv-press" onClick={save} disabled={busy === "save"}>
                {busy === "save" ? <span className="nv-spin" aria-hidden="true" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>}
                {busy === "save" && vid ? t("Making the video…") : vid ? t("Save video") : t("Save image")}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              {vid
                ? t("Shares a 5-second celebration video, made on your phone: great for TikTok, Instagram Reels and WhatsApp Status. On a phone, Share opens your phone's own share menu, so any app works.")
                : t("On a phone, Share opens your phone's own share menu with the image attached, so any app works.")}{" "}
              {t("The image and link show your level, never your sales.")}
            </p>
          </div>
        </div>
      </div>
      <Hud toast={toast} />
    </>
  );
}
