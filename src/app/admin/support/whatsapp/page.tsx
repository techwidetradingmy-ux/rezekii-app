"use client";

import "@/app/admin.css";
import { LiveWhatsApp } from "@/components/admin/live-whatsapp";

/** Customers' WhatsApp messages to Techwide's numbers, answered here (owner, 23 Nov 2026). Real data only, no sample screen. */
export default function WhatsAppInbox() {
  return <LiveWhatsApp />;
}
