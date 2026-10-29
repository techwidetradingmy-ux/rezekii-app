"use client";

import "@/app/seller.css";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Columns, Count, Seg, Stat, Title } from "@/components/ui";
import { Ava, Source } from "@/components/seller/seller-ui";
import { product, rm } from "@/lib/mock";
import { BY_PRODUCT, RANGES, RESULTS, TOP_CREATORS, type Range } from "@/lib/mock-seller";

/** How the shop's products are doing in Techwide's TAP campaigns: charts, top creators, per product. */
export default function Results() {
  const { toast } = useDemo();
  const [range, setRange] = useState<Range>("30 days");
  const r = RESULTS[range];
  const k = r.gmv / RESULTS["30 days"].gmv;

  return (
    <div className="v2-stack v2-in">
      <Title title="TAP Performance" sub={<Source />}>
        <button type="button" className="btn-outline" onClick={() => toast("Report saved as CSV")}><Icon name="doc" size={18} /> Export</button>
      </Title>
      <Seg value={range} options={RANGES} onChange={setRange} />

      <section className="v2-grid4" key={range} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Stat label="Sales (GMV)" value={<Count value={r.gmv} format={(n) => rm(n, 0)} />} note={r.prev ? `+${r.prev}% on the ${range} before` : "Since first product went live"} tone={r.prev ? "up" : undefined} />
        <Stat label="Units sold" value={<Count value={r.units} />} />
        <Stat label="Creators selling" value={<Count value={r.creators} />} />
        <Stat label="Videos" value={<Count value={r.videos} />} />
        <Stat label="LIVEs" value={<Count value={r.lives} />} />
        <Stat label="Commission paid" value={<Count value={r.paid} format={(n) => rm(n, 0)} />} note="Earned by creators" />
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{range === "90 days" ? "Weekly sales" : "Daily sales"}</h2>
          <span className="v2-small">{r.unit}</span>
        </div>
        <div className={r.daily.length > 20 ? "sl-cols sl-dense" : "sl-cols"}><Columns key={range} values={r.daily} labels={r.labels} /></div>
      </section>

      <div className="v2-split">
        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">Top Creators</h2><span className="v2-small">{range}</span></div>
          <div className="v2-tablewrap">
            <table className="v2-table">
              <thead>
                <tr><th>Creator</th><th>Videos</th><th>LIVEs</th><th>Units</th><th style={{ textAlign: "right" }}>Sales</th></tr>
              </thead>
              <tbody>
                {TOP_CREATORS.map((c) => (
                  <tr key={c.handle}>
                    <td><span className="v2-row" style={{ flexWrap: "nowrap", gap: 8 }}><Ava name={c.handle} /><span style={{ display: "flex", flexDirection: "column" }}><b style={{ whiteSpace: "nowrap" }}>{c.handle}</b><small className="v2-small">{c.level}</small></span></span></td>
                    <td>{Math.max(1, Math.round(c.videos * (range === "7 days" ? 0.4 : range === "90 days" ? 2.2 : 1)))}</td>
                    <td>{Math.round(c.lives * (range === "7 days" ? 0.5 : range === "90 days" ? 2 : 1))}</td>
                    <td>{Math.round(c.units * k).toLocaleString("en-MY")}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{rm(c.gmv * k, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">By Product</h2><span className="v2-small">Sales</span></div>
          <Bars key={range} rows={BY_PRODUCT.map((b) => ({ label: product(b.id).name, value: b.gmv * k, display: rm(b.gmv * k, 0) }))} />
          <div className="v2-divide">
            {BY_PRODUCT.map((b) => {
              const p = product(b.id);
              return (
                <div key={b.id} className="sl-act" style={{ gridTemplateColumns: "36px minmax(0,1fr)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                  <span><b style={{ fontSize: 14 }}>{p.name}</b><small>{Math.round(b.units * k).toLocaleString("en-MY")} units · {Math.max(1, Math.round(b.creators * Math.min(1.4, Math.max(0.6, k))))} creators · {Math.round(b.videos * k)} videos</small></span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <p className="v2-small" style={{ margin: 0 }}>TAP sales only. Numbers can change for up to 14 days (cancellations, returns).</p>
    </div>
  );
}
