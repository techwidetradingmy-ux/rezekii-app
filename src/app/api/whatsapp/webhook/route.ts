import { NextResponse, type NextRequest } from "next/server";
import { parseWaWebhook, waSignatureOk } from "@/integrations/meta/whatsapp.ts";
import { saveWebhook } from "@/modules/whatsapp/inbox.ts";

export const dynamic = "force-dynamic";

/** Meta checks the address once when the webhook is set up: it must echo hub.challenge for our verify word. */
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const word = process.env.WHATSAPP_VERIFY_TOKEN;
  if (word && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === word) return new NextResponse(q.get("hub.challenge") ?? "", { headers: { "content-type": "text/plain" } });
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Customers' WhatsApp messages and delivery updates for our replies (owner, 23 Nov 2026). Only Meta's signed calls count. A save
 * that fails answers 500 so Meta sends it again; messages already kept aren't kept twice.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!waSignatureOk(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("Bad signature", { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad body", { status: 400 });
  }
  try {
    await saveWebhook(parseWaWebhook(payload));
  } catch (err) {
    console.error("[whatsapp] webhook", err instanceof Error ? err.message : err);
    return new NextResponse("Try again", { status: 500 });
  }
  return new NextResponse("OK");
}
