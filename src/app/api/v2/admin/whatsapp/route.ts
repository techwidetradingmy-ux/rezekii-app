import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { chatMessages, listChats, reply } from "@/modules/whatsapp/inbox.ts";
import { waAccounts, waMedia, waNumbers, waReady, waSubscribe, waSubscribed } from "@/integrations/meta/whatsapp.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store" };
const ID = /^\d{5,20}$/;
const why = (err: unknown) => (err instanceof Error ? err.message : "please try again");

/**
 * WhatsApp Inbox for admins (owner, 23 Nov 2026). GET ?part=chats | ?part=numbers | ?chat=<number id>&contact=<number> (marks it
 * seen) | ?media=<id> (a file a customer sent). POST { number, contact, text } replies; { subscribe: account } lets Rezekii get
 * that account's messages.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const media = q.get("media");
  if (media) {
    if (!ID.test(media)) return NextResponse.json({ error: "No such file." }, { status: 400 });
    try {
      const f = await waMedia(media);
      return new NextResponse(f.data, { headers: { "content-type": f.type, "cache-control": "private, max-age=3600" } });
    } catch (err) {
      return NextResponse.json({ error: why(err) }, { status: 502 });
    }
  }
  const chat = q.get("chat");
  const contact = q.get("contact");
  if (chat || contact) {
    if (!chat || !contact || !ID.test(chat) || !ID.test(contact)) return NextResponse.json({ error: "Choose a chat." }, { status: 400 });
    return NextResponse.json({ items: await chatMessages(chat, contact) }, { headers: NO_STORE });
  }
  if (q.get("part") === "numbers") {
    if (!waReady()) return NextResponse.json({ ready: false, numbers: [], accounts: [] }, { headers: NO_STORE });
    try {
      const [numbers, accounts] = await Promise.all([waNumbers(), Promise.all(waAccounts().map(async (id) => ({ id, on: await waSubscribed(id) })))]);
      return NextResponse.json({ ready: true, numbers, accounts }, { headers: NO_STORE });
    } catch (err) {
      return NextResponse.json({ ready: true, numbers: [], accounts: [], error: `Meta didn't answer: ${why(err)}` }, { headers: NO_STORE });
    }
  }
  return NextResponse.json({ ready: waReady(), items: await listChats() }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { number?: unknown; contact?: unknown; text?: unknown; subscribe?: unknown };
  if (typeof b.subscribe === "string") {
    if (!waAccounts().includes(b.subscribe)) return NextResponse.json({ error: "Choose one of our WhatsApp accounts." }, { status: 400 });
    try {
      await waSubscribe(b.subscribe);
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ error: `Meta didn't turn it on: ${why(err)}` }, { status: 502 });
    }
  }
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 4096) : "";
  if (typeof b.number !== "string" || typeof b.contact !== "string" || !ID.test(b.number) || !ID.test(b.contact)) return NextResponse.json({ error: "Choose a chat." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  const r = await reply(b.number, b.contact, text, actorName(user.email));
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
}
