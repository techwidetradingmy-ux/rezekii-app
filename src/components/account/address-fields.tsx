"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import { MY_STATES } from "@/lib/mock-creator2";
import { addressOk, useAddress, type Address } from "@/lib/address";

/** The delivery address fields, shared by sign-up, Account and the Rate Card (owner, 29 Oct 2026). */
export function AddressFields({ value, onChange, tried }: { value: Address; onChange: (a: Address) => void; tried?: boolean }) {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  const bad = (k: keyof Address) => !!tried && (k === "postcode" ? !/^\d{5}$/.test(value.postcode) : k === "state" ? !value.state : value[k].trim().length < (k === "line" ? 5 : 2));
  return (
    <div className="ad-fields">
      <label className="v2-field">Recipient<input className="np-input" autoComplete="name" placeholder="Full name" value={value.to} onChange={(e) => set("to", e.target.value)} aria-invalid={bad("to")} /></label>
      <label className="v2-field">Phone<input className="np-input" inputMode="tel" autoComplete="tel-national" placeholder="012-345 6789" value={value.phone} onChange={(e) => set("phone", e.target.value)} /></label>
      <label className="v2-field wide">Address<input className="np-input" autoComplete="street-address" placeholder="House number, street, area" value={value.line} onChange={(e) => set("line", e.target.value)} aria-invalid={bad("line")} /></label>
      <label className="v2-field">Postcode<input className="np-input" inputMode="numeric" maxLength={5} autoComplete="postal-code" placeholder="40000" value={value.postcode} onChange={(e) => set("postcode", e.target.value.replace(/\D/g, ""))} aria-invalid={bad("postcode")} /></label>
      <label className="v2-field">City<input className="np-input" autoComplete="address-level2" placeholder="Shah Alam" value={value.city} onChange={(e) => set("city", e.target.value)} aria-invalid={bad("city")} /></label>
      <label className="v2-field wide">State
        <select className="np-input" value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={bad("state")}>
          <option value="">Choose a state</option>
          {MY_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {tried && !addressOk(value) && <small className="cr1-err wide">Fill in the recipient, address, 5-digit postcode, city and state.</small>}
    </div>
  );
}

/** Asked before she saves or shares her Rate Card, when there's no delivery address yet (sellers send products to it). */
export function AddressSheet({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { toast } = useDemo();
  const [saved, save] = useAddress();
  const [draft, setDraft] = useState<Address>(saved);
  const [tried, setTried] = useState(false);
  return (
    <Sheet title="Add a Delivery Address" onClose={onClose}>
      <p className="v2-muted" style={{ margin: 0 }}>Your Rate Card needs one, so sellers can send products for paid reviews. Only Techwide and the seller you work with see it.</p>
      <AddressFields value={draft} onChange={setDraft} tried={tried} />
      <button type="button" className="np-btn" onClick={() => { setTried(true); if (!addressOk(draft)) return; save(draft); toast("Address saved"); onDone(); }}>Save Address</button>
    </Sheet>
  );
}
