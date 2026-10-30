import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { CUSTOM_STATUSES, auditList, customList, ledgerList, referralList, setCustomStatus, waitlistList, type CustomStatus } from "@/modules/admin/lists.ts";

export const dynamic = "force-dynamic";

const LISTS = { audit: auditList, custom: customList, waitlist: waitlistList, referrals: referralList, ledger: ledgerList } as const;

/** Admin lists on real data (admins only; owner, 31 Oct 2026): ?part=audit|custom|waitlist|referrals|ledger. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const part = req.nextUrl.searchParams.get("part") as keyof typeof LISTS | null;
  if (!part || !(part in LISTS)) return NextResponse.json({ error: "Say which list." }, { status: 400 });
  return NextResponse.json({ items: await LISTS[part]() }, { headers: { "cache-control": "private, no-store" } });
}

/** { custom: id, status } moves a Custom Service request along (admins only). */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { custom?: unknown; status?: unknown };
  if (typeof b.custom !== "string" || !/^[0-9a-f-]{36}$/.test(b.custom) || !CUSTOM_STATUSES.includes(b.status as CustomStatus)) return NextResponse.json({ error: "Choose a request and a status." }, { status: 400 });
  const ok = await setCustomStatus(b.custom, b.status as CustomStatus, actorName(user.email));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
}
