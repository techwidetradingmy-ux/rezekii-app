"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import { MY_STATES } from "@/lib/mock-creator2";
import { addressOk, postcodeOk, useAddress, type Address } from "@/lib/address";
import { COUNTRIES } from "@/lib/countries";

/**
 * The delivery address fields, shared by sign-up, Account and the Rate Card (owner, 29 Oct 2026). Any country (31 Oct 2026):
 * Malaysia keeps its state list and 5-digit postcode; elsewhere the state is typed and the postcode is the local one, or none.
 */
export function AddressFields({ value, onChange, tried }: { value: Address; onChange: (a: Address) => void; tried?: boolean }) {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  const country = value.country || "MY";
  const my = country === "MY";
  const bad = (k: keyof Address) => !!tried && (k === "postcode" ? !postcodeOk(value) : k === "state" ? !value.state.trim() : value[k].trim().length < (k === "line" ? 5 : 2));
  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "60";
  return (
    <div className="ad-fields">
      <label className="v2-field">Recipient<input className="np-input" autoComplete="name" placeholder="Full name" value={value.to} onChange={(e) => set("to", e.target.value)} aria-invalid={bad("to")} /></label>
      <label className="v2-field">Phone<input className="np-input" inputMode="tel" autoComplete="tel" placeholder={my ? "+60 12-345 6789" : `+${dial} …`} value={value.phone} onChange={(e) => set("phone", e.target.value)} onFocus={() => { if (!value.phone) set("phone", `+${dial} `); }} /></label>
      <label className="v2-field wide">Country
        <select className="np-input" autoComplete="country" value={country} onChange={(e) => onChange({ ...value, country: e.target.value, state: "", postcode: "", phone: value.phone.trim() === `+${dial}` ? "" : value.phone })}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      <label className="v2-field wide">Address<input className="np-input" autoComplete="street-address" placeholder="House number, street, area" value={value.line} onChange={(e) => set("line", e.target.value)} aria-invalid={bad("line")} /></label>
      <label className="v2-field">Postcode{!my && <small> (if any)</small>}<input className="np-input" inputMode={my ? "numeric" : "text"} maxLength={my ? 5 : 10} autoComplete="postal-code" placeholder={my ? "40000" : "Postcode"} value={value.postcode} onChange={(e) => set("postcode", my ? e.target.value.replace(/\D/g, "") : e.target.value)} aria-invalid={bad("postcode")} /></label>
      <label className="v2-field">City<input className="np-input" autoComplete="address-level2" placeholder={my ? "Shah Alam" : "City"} value={value.city} onChange={(e) => set("city", e.target.value)} aria-invalid={bad("city")} /></label>
      <label className="v2-field wide">{my ? "State" : "State / Province / Region"}
        {my ? (
          <select className="np-input" value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={bad("state")}>
            <option value="">Choose a state</option>
            {MY_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <input className="np-input" autoComplete="address-level1" placeholder="State / Province / Region" value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={bad("state")} />
        )}
      </label>
      {tried && !addressOk(value) && <small className="cr1-err wide">Fill in the recipient, address, {my ? "5-digit postcode" : "postcode (if your country has one)"}, city and state.</small>}
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
