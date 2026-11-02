"use client";

import "@/app/admin.css";
import { LivePerformance } from "@/components/admin/live-performance";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Columns, Count, Title } from "@/components/ui";
import { Chips, Meta, Spark } from "@/components/admin/bits";
import { DAYS14, MERCHANT_PERF } from "@/lib/mock-admin";
import { rm, short } from "@/lib/mock";

/** Live collaboration performance per merchant: what to show a merchant when you call them. */
export default function BusinessPerformance() {
  const { toast, live } = useDemo();
  const [shop, setShop] = useState(MERCHANT_PERF[0].shop);
  // Signed in (owner, 31 Oct 2026): real results per merchant.
  if (live) return <LivePerformance />;
  const m = MERCHANT_PERF.find((x) => x.shop === shop) ?? MERCHANT_PERF[0];
  const trend = m.daily[m.daily.length - 1] >= m.daily[0];

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Live Performance" sub="How each merchant's products are doing with our creators.">
        <button type="button" className="ad-btn-ghost" onClick={() => toast(`Report sent to ${shop}`)}><Icon name="share" size={16} /> Send Report</button>
      </Title>

      <Chips label="Merchant" value={shop} onChange={setShop} options={MERCHANT_PERF.map((x) => [x.shop] as [string])} />

      <div className="v2-grid4 ad-stats" key={shop}>
        <div className="v2-stat"><small>GMV through TAP</small><b><Count value={m.gmv} format={(n) => rm(n, 0)} /></b><em className={trend ? "up" : "down"}>{trend ? "Growing" : "Slowing"} over 14 days</em></div>
        <div className="v2-stat"><small>Units sold</small><b><Count value={m.units} /></b></div>
        <div className="v2-stat"><small>Creators selling</small><b><Count value={m.creators} /></b></div>
        <div className="v2-stat"><small>Videos</small><b><Count value={m.videos} /></b></div>
        <div className="v2-stat"><small>LIVE sessions</small><b><Count value={m.lives} /></b></div>
      </div>

      <div className="v2-split">
        <section className="v2-card" key={`d-${shop}`}>
          <div className="v2-card-h">
            <h2 className="v2-h2">GMV per Day (RM Thousand)</h2>
          </div>
          <Columns values={m.daily} labels={DAYS14.map((d, i) => (i % 2 === 0 ? d : ""))} />
          <Meta range="15–28 Oct" source="TikTok Partner data, updated daily" updated="Today 06:00" />
        </section>
        <section className="v2-card" key={`c-${shop}`}>
          <div className="v2-card-h">
            <h2 className="v2-h2">Top Creators</h2>
          </div>
          <Bars rows={m.top.map(([h, v]) => ({ label: h, value: v, display: rm(v, 0) }))} />
          <Meta range="Last 30 days" source="TikTok Partner data" updated="Today 06:00" />
        </section>
      </div>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">All Merchants</h2>
          <span className="v2-small">Last 30 days</span>
        </div>
        <div className="v2-tablewrap">
          <table className="v2-table ad-table">
            <thead>
              <tr><th>Merchant</th><th className="num">GMV</th><th className="num">Units</th><th className="num">Creators</th><th className="num">Videos</th><th className="num">LIVE</th><th>14 days</th></tr>
            </thead>
            <tbody>
              {MERCHANT_PERF.map((x) => (
                <tr key={x.shop} className="click" onClick={() => setShop(x.shop)} style={x.shop === shop ? { outline: "2px solid #00c073", outlineOffset: -2 } : undefined}>
                  <td><b>{x.shop}</b></td>
                  <td className="num">{rm(x.gmv, 0)}</td>
                  <td className="num">{short(x.units)}</td>
                  <td className="num">{x.creators}</td>
                  <td className="num">{x.videos}</td>
                  <td className="num">{x.lives}</td>
                  <td style={{ width: 120, minWidth: 100 }}><Spark values={x.daily} tone={x.daily[13] >= x.daily[0] ? "up" : "down"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Meta range="Last 30 days" source="TikTok Partner data · GMV is not our revenue" updated="Today 06:00" />
      </section>
    </div>
  );
}
