"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { Plat } from "./seller-ui";
import { SELLER, SELLER_SOCIALS, type Platform } from "@/lib/mock-seller";

/** Accounts the shop has connected for cross-posting. Shared by New post, Calendar and Account (preview: per page). */
export function useSellerSocials() {
  const [socials, setSocials] = useState(SELLER_SOCIALS);
  const connect = (p: Platform, handle: string) => setSocials((all) => all.map((s) => (s.name === p ? { ...s, linked: true, handle } : s)));
  const disconnect = (p: Platform) => setSocials((all) => all.map((s) => (s.name === p ? { ...s, linked: false, handle: "" } : s)));
  return { socials, connect, disconnect };
}

const CHOICES: Record<Platform, string[]> = {
  Facebook: [`${SELLER.shop} (Page)`, "Seri Living Outlet (Page)"],
  Instagram: ["@seriliving.my", "@seriliving.deals"],
  Threads: ["@seriliving.my"],
};

/** Log in with the platform and let Rezekii publish for the shop (preview: nothing leaves this page). */
export function ConnectSocialSheet({ platform, onClose, onDone }: { platform: Platform; onClose: () => void; onDone: (handle: string) => void }) {
  const [pick, setPick] = useState(CHOICES[platform][0]);
  const [busy, setBusy] = useState(false);
  const via = platform === "Threads" ? "Instagram" : platform;
  return (
    <Sheet title={`Connect ${platform}`} onClose={onClose}>
      <div className="sl-tt">
        <div className="sl-tt-h" style={{ background: platform === "Facebook" ? "#1877f2" : platform === "Instagram" ? "linear-gradient(135deg,#fa7e1e,#d62976 50%,#962fbf)" : "#000000" }}>
          <Plat p={platform} /> Log in with {via}
        </div>
        <div className="sl-tt-b">
          <p>Signed in as <b style={{ color: "var(--text)" }}>{SELLER.contact}</b>. Pick the {platform === "Facebook" ? "Page" : "account"} for your shop:</p>
          <div className="sl-radio-list">
            {CHOICES[platform].map((c) => (
              <label key={c} className={`np-radio ${pick === c ? "on" : ""}`}>
                <input type="radio" name="acct" checked={pick === c} onChange={() => setPick(c)} />
                <span><b>{c}</b></span>
              </label>
            ))}
          </div>
          <ul className="sl-list">
            <li><Icon name="send" size={18} /> Publish posts{platform === "Threads" ? "" : " and reels"} for you, only when you schedule them</li>
            <li><Icon name="eye" size={18} /> See basic {platform === "Facebook" ? "Page" : "account"} info and post status</li>
          </ul>
          <div className="sl-tt-acts">
            <button type="button" className="sl-tt-no" onClick={onClose}>Cancel</button>
            <button type="button" className="sl-tt-ok" style={{ background: "#00a862", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} disabled={busy} onClick={() => { setBusy(true); window.setTimeout(() => onDone(pick), 900); }}>
              {busy ? <><span className="sl-spin" /> Connecting…</> : "Allow"}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
