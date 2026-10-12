"use client";

import { useState } from "react";

const RATES = [8, 10, 15];
const rm = (v: number) => "RM" + Math.round(v).toLocaleString("en-US");

/** "Money on the table": what a creator earns on the Open Plan rate vs Rezekii Silver (Open Plan + 1%). */
export function HomeCalculator({ silverHow }: { silverHow: string }) {
  const [sales, setSales] = useState(100000);
  const [rate, setRate] = useState(10);
  const extra = sales / 100;
  const coins = Math.max(1, Math.min(12, Math.round(Math.log10(Math.max(extra, 10)) * 3 - 3)));
  return (
    <div className="hm-calc">
      <label htmlFor="hm-sales" className="hm-calc-label">
        If you sell <span>{rm(sales)}</span> a month
      </label>
      <input id="hm-sales" type="range" min={1000} max={300000} step={1000} value={sales} onChange={(e) => setSales(Number(e.target.value))} className="hm-range" />
      <div className="hm-rates" role="group" aria-label="Example Open Plan rate">
        <span>Open Plan rate:</span>
        {RATES.map((r) => (
          <button key={r} type="button" className={r === rate ? "hm-rate on" : "hm-rate"} aria-pressed={r === rate} onClick={() => setRate(r)}>
            {r}%
          </button>
        ))}
      </div>
      <div className="hm-bars">
        <div className="hm-bar">
          <span>Normal creator</span>
          <span className="hm-meter"><span className="hm-fill hm-fill-gray" style={{ width: `${(rate / (rate + 1)) * 100}%` }} /></span>
          <strong>{rm((sales * rate) / 100)}</strong>
        </div>
        <div className="hm-bar hm-bar-rz">
          <span>Rezekii Silver</span>
          <span className="hm-meter"><span className="hm-fill" style={{ width: "100%" }} /></span>
          <strong>{rm((sales * (rate + 1)) / 100)}</strong>
        </div>
      </div>
      <div className="hm-lost" role="status">
        <span className="hm-coins" aria-hidden="true">
          {Array.from({ length: coins }, (_, i) => (
            <span key={i} className="hm-coin" style={{ bottom: 6 + i * 6, animationDelay: `${i * 70}ms` }} />
          ))}
        </span>
        <span className="hm-lost-text">
          <strong>{rm(extra)}</strong>
          <b>left on the table every month</b>
          <small>That&apos;s {rm(extra * 12)} a year, from sales you&apos;re already making.</small>
        </span>
      </div>
      <p className="hm-fine">Example only. Open Plan rates differ by product. The extra 1% applies to Techwide campaign links at Silver ({silverHow}).</p>
    </div>
  );
}
