import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { getLang } from "@/lib/i18n/server";
import { cleanSub, removeSubscription, saveSubscription } from "@/modules/notifications/push.ts";

export const dynamic = "force-dynamic";

/** Phone Notifications turned on: { side, subscription } saves this device for her, in this device's language. */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { side?: unknown; subscription?: unknown };
  const sub = cleanSub(b.subscription);
  if (!sub) return NextResponse.json({ error: "This browser's push address isn't one we can use." }, { status: 400 });
  try {
    await saveSubscription(user.id, b.side === "seller" ? "seller" : "creator", sub, await getLang(), req.headers.get("user-agent"));
  } catch (err) {
    console.error("[push] save", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Didn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Phone Notifications turned off: { endpoint } forgets this device for her. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof b.endpoint !== "string" || !b.endpoint || b.endpoint.length > 1000) return NextResponse.json({ error: "Say which device." }, { status: 400 });
  try {
    await removeSubscription(user.id, b.endpoint);
  } catch (err) {
    console.error("[push] remove", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Didn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
