"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import "@/app/creator2.css";

/**
 * Verify WhatsApp before a free sample (owner, 28 Oct 2026). The creator sends one pre-written message to Rezekii's support
 * number; the WhatsApp Business API passes it to Rezekii, which matches the code and verifies the sender's number on its own.
 * Free for the creator and for us: messages people send to a business, and our reply within 24 hours, cost nothing.
 */
export function WaGate() {
  const { waAsking, waDone, waCancel, toast } = useDemo();
  const [waiting, setWaiting] = useState(false);
  if (!waAsking) return null;
  const send = () => {
    setWaiting(true);
    toast("Opening WhatsApp…");
    window.setTimeout(() => {
      setWaiting(false);
      toast("WhatsApp verified");
      waDone();
    }, 1800);
  };
  return (
    <Sheet title="Verify Your WhatsApp First" onClose={waCancel}>
      <p className="v2-muted" style={{ margin: 0 }}>Free Samples need a verified WhatsApp. Takes 10 seconds.</p>
      <ol className="cr2-steps">
        <li><i>1</i><span><b>Tap Open WhatsApp.</b></span></li>
        <li><i>2</i><span><b>Send the message as it is.</b></span></li>
        <li><i>3</i><span><b>Come back here.</b></span></li>
      </ol>
      <div className="cr2-wamsg">REZEKII verify 482 913<br />Please send this message as it is.</div>
      <button type="button" className="np-btn cr2-wabtn" disabled={waiting} onClick={send}>
        <Icon name="whatsapp" size={18} /> {waiting ? "Waiting for your message…" : "Open WhatsApp"}
      </button>
      <button type="button" className="btn-outline" style={{ height: 46 }} onClick={waCancel}>Not now</button>
    </Sheet>
  );
}
