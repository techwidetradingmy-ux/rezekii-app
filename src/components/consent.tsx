"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo, type Role } from "@/components/demo";
import { Sheet } from "@/components/ui";

/** The versions a person agrees to; saved with their consent record. */
export const VERSIONS = { terms: "1.0", privacy: "1.0", date: "28 Oct 2026" };

/** What each side lets Rezekii read from TikTok Shop, in the words shown before linking. */
export const SCOPES: Record<Role, string[]> = {
  creator: ["Showcase products and their commission rates", "Affiliate orders and commission", "Payouts and settlements", "Your TikTok Shop creator level", "Sample requests and their status"],
  seller: ["Shop and product information", "Orders and sales for products in TAP", "The affiliate campaigns you submit"],
};
const WHY: Record<Role, string> = {
  creator: "To show your earnings and payouts, find better commission, count your missions, and work out the extra you earn through Techwide.",
  seller: "To fill in your products for you, run the TAP campaigns you submit, and show you where your samples went and what they sold.",
};

/**
 * Asked before TikTok Shop is linked (blueprint, PDPA): what Rezekii reads, why, what it never does, how to unlink, and
 * a tick for the Terms and Privacy Policy. The record of who agreed, when, to which versions and permissions is saved.
 */
export function ConsentSheet({ role, onAgree, onClose }: { role: Role; onAgree: () => void; onClose: () => void }) {
  const [tick, setTick] = useState(false);
  return (
    <Sheet title={role === "creator" ? "Before you link TikTok Shop" : "Before you connect Seller Center"} onClose={onClose}>
      <div className="cs-block">
        <b><Icon name="eye" size={17} /> What Rezekii reads</b>
        <ul>{SCOPES[role].map((s) => <li key={s}>{s}</li>)}</ul>
      </div>
      <div className="cs-block">
        <b><Icon name="spark" size={17} /> Why</b>
        <p>{WHY[role]}</p>
      </div>
      <div className="cs-block">
        <b><Icon name="shield" size={17} /> What we never do</b>
        <ul>
          <li>Show your {role === "creator" ? "earnings or orders" : "sales"} to {role === "creator" ? "sellers or other creators" : "other sellers or creators"} without asking you first</li>
          <li>Sell your data, or use it for anything not listed here</li>
          <li>Post, change prices or handle orders on your behalf</li>
        </ul>
      </div>
      <div className="cs-block">
        <b><Icon name="refresh" size={17} /> Unlink any time</b>
        <p>In My account, Connections. We stop reading straight away and delete your TikTok Shop data within 30 days, except records the law asks us to keep.</p>
      </div>
      <label className="cs-tick">
        <input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} />
        <span>
          I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> (v{VERSIONS.terms}) and the{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a> (v{VERSIONS.privacy}), and let Rezekii read the TikTok Shop data above.
        </span>
      </label>
      <button type="button" className="np-btn" disabled={!tick} onClick={onAgree}>
        Agree and {role === "creator" ? "link TikTok Shop" : "connect"}
      </button>
      <button type="button" className="btn-outline" onClick={onClose}>Not now</button>
      <p className="v2-small" style={{ margin: 0 }}>We keep a record that you agreed: your account, the time, these versions and the permissions you grant on TikTok.</p>
    </Sheet>
  );
}

/** Shows the creator consent sheet whenever something asks to link TikTok Shop without a consent on record. */
export function ConsentGate() {
  const { asking, agree, cancelLink } = useDemo();
  if (!asking) return null;
  return <ConsentSheet role={asking} onAgree={agree} onClose={cancelLink} />;
}
