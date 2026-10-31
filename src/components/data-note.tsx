"use client";

import { Icon } from "@/components/icons";

// One daily update time for everything (owner, 31 Oct 2026): 1:00 AM in Malaysia, shown in the viewer's own time.
const MYT_1AM = Date.UTC(2026, 0, 1, 17, 0);
const inMalaysia = () => Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kuala_Lumpur";
const daily = () => `${new Date(MYT_1AM).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}${inMalaysia() ? "" : " your time"}`;
// A day ("2026-10-31") shows as the day; a moment shows with its time.
const stamp = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00+08:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }));

/** When the data on a page updates and how new it is: "Updates daily at 1:00 am · Latest: 31 Oct, 12:11 am". */
export function DataNote({ latest, every, what = "Latest" }: { latest: string | null | undefined; every?: string; what?: string }) {
  return (
    <p className="v2-small" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <Icon name="clock" size={14} /> {every ?? `Updates daily at ${daily()}`}{latest ? ` · ${what}: ${stamp(latest)}` : ""}
    </p>
  );
}
