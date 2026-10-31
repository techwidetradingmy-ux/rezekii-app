"use client";

import "@/app/admin.css";
import { LiveRankings } from "@/components/admin/live-rankings";

/** Analytics › Rankings (owner, 31 Oct 2026): admins only, refreshed by hand. */
export default function Rankings() {
  return <LiveRankings />;
}
