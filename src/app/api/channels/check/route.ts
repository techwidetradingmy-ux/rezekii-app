import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { checkTikTokConnection, userTikTokOpenId } from "@/modules/posting/store.ts";
import { checkShopee, getShopee } from "@/modules/shopee/connections.ts";
import { checkAccount, getAccount } from "@/modules/social/accounts.ts";
import { isTikTokKey, openIdOf } from "@/modules/social/picker.ts";

export const dynamic = "force-dynamic";

/** Check now (Channels): asks the app whether one of the user's channels still works; answers "active" or "reconnect". */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key) return NextResponse.json({ error: "Which channel?" }, { status: 400 });
  try {
    if (isTikTokKey(key)) {
      const openId = await userTikTokOpenId(user.id, openIdOf(key));
      if (openId !== openIdOf(key)) return NextResponse.json({ error: "That channel isn't connected." }, { status: 404 });
      return NextResponse.json({ status: await checkTikTokConnection(openId) });
    }
    if (key.startsWith("shopee:")) {
      const c = /^shopee:[0-9a-f-]{36}$/.test(key) ? await getShopee(key.slice(7), user.id) : null;
      if (!c) return NextResponse.json({ error: "That channel isn't connected." }, { status: 404 });
      return NextResponse.json({ status: await checkShopee(c) });
    }
    if (!/^[0-9a-f-]{36}$/.test(key)) return NextResponse.json({ error: "Which channel?" }, { status: 400 });
    const acc = await getAccount(key, user.id);
    if (!acc) return NextResponse.json({ error: "That channel isn't connected." }, { status: 404 });
    return NextResponse.json({ status: await checkAccount(acc) });
  } catch (err) {
    console.error("[channels] check failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The app didn't answer. Try again in a minute." }, { status: 502 });
  }
}
