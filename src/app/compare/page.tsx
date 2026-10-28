"use client";

import { useEffect, useRef, useState } from "react";
import { MENUS } from "@/lib/menus";
import "./compare.css";

/** Every page, grouped, for the picker. */
const GROUPS: [string, [string, string][]][] = [
  ["Sites", [["/", "Creator site"], ["/seller", "Seller site"], ["/signin", "Sign in"]]],
  ["Creator app", [...MENUS.creator.flatMap((s) => (s.pages.length ? s.pages.map(([h, l]) => [h, `${s.label} · ${l}`] as [string, string]) : [[s.href, s.label] as [string, string]])), ["/app/account", "My account"]]],
  ["Seller app", [...MENUS.seller.flatMap((s) => (s.pages.length ? s.pages.map(([h, l]) => [h, `${s.label} · ${l}`] as [string, string]) : [[s.href, s.label] as [string, string]])), ["/seller/app/invite", "TAP invite"]]],
  ["Admin", MENUS.admin.flatMap((s) => (s.pages.length ? s.pages.map(([h, l]) => [h, `${s.label} · ${l}`] as [string, string]) : [[s.href, s.label] as [string, string]]))],
];
/** iPhone 15 screen in CSS pixels (the status bar takes the top 47), and a 1440 × 900 desktop. */
const PHONE = { w: 393, h: 852, bar: 47 };
/** Phones don't show scroll bars; hide them inside the iPhone frame (same origin, so this is allowed). */
const noBars = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
  try {
    const d = e.currentTarget.contentDocument;
    if (!d) return;
    const st = d.createElement("style");
    st.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}";
    d.head.appendChild(st);
  } catch {}
};
const DESK = { w: 1440, h: 900 };

/**
 * Compare views (owner, 28 Oct 2026): the same page as an iPhone and as a desktop screen, side by side. Pick any page; both
 * frames load it. The desktop frame is a real 1440px-wide page, scaled down to fit.
 */
export default function Compare() {
  const [path, setPath] = useState("/");
  const [key, setKey] = useState(0);
  const deskBox = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h.startsWith("/")) setPath(h);
  }, []);
  useEffect(() => {
    const fit = () => { if (deskBox.current) setScale(Math.min(1, deskBox.current.clientWidth / DESK.w)); };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const go = (p: string) => { setPath(p); window.history.replaceState(null, "", `#${p}`); };

  return (
    <div className="cmp">
      <div className="cmp-bar">
        <b>Compare views</b>
        <select value={path} onChange={(e) => go(e.target.value)} aria-label="Page">
          {GROUPS.map(([g, list]) => (
            <optgroup key={g} label={g}>
              {list.map(([h, l]) => <option key={`${g}${h}`} value={h}>{l}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={() => setKey((k) => k + 1)}>Reload both</button>
        <span className="cmp-path">{path}</span>
        <a href="/tour">All pages</a>
      </div>
      <div className="cmp-stage">
        <figure className="cmp-phone">
          <figcaption>iPhone · {PHONE.w} × {PHONE.h}</figcaption>
          <div className="cmp-bezel" style={{ width: PHONE.w + 24, height: PHONE.h + 24 }}>
            <span className="cmp-island" aria-hidden="true" />
            <div className="cmp-glass">
              <span className="cmp-status" aria-hidden="true"><b>9:41</b><i /></span>
              <iframe key={`p${key}${path}`} src={path} title="iPhone view" width={PHONE.w} height={PHONE.h - PHONE.bar} onLoad={noBars} />
            </div>
          </div>
        </figure>
        <figure className="cmp-desk" ref={deskBox}>
          <figcaption>Desktop · {DESK.w} × {DESK.h}</figcaption>
          <div className="cmp-screen" style={{ height: DESK.h * scale + 34 }}>
            <span className="cmp-dots" aria-hidden="true"><i /><i /><i /></span>
            <iframe key={`d${key}${path}`} src={path} title="Desktop view" width={DESK.w} height={DESK.h} style={{ transform: `scale(${scale})` }} />
          </div>
        </figure>
      </div>
    </div>
  );
}
