"use client";

import { EarningsDay } from "@/lib/mock-data";

interface EarningsChartProps {
  data: EarningsDay[];
  metric?: "gmv" | "commission";
}

export default function EarningsChart({ data, metric = "commission" }: EarningsChartProps) {
  const values = data.map((d) => (metric === "gmv" ? d.gmv : d.commission));
  const maxVal = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1.5 h-[100px] w-full px-1">
      {data.map((day, i) => {
        const val = values[i];
        const heightPct = Math.max((val / maxVal) * 100, 4);
        const isToday = i === data.length - 1;

        return (
          <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-t-[4px] transition-all duration-[320ms] ease-[cubic-bezier(.2,.7,.2,1)]"
              style={{
                height: `${heightPct}%`,
                background: isToday
                  ? "#00c073"
                  : "rgba(0,192,115,0.35)",
                maxWidth: "28px",
                margin: "0 auto",
              }}
            />
            <span className="text-[9px] text-[#9aa5b1] font-[500]">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
