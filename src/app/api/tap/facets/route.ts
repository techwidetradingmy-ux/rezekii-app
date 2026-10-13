import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { facets } from "@/modules/tap/catalog.ts";

export const dynamic = "force-dynamic";

/** Category and shop lists with counts for the Marketplace filters. The catalog changes once a day. */
export async function GET() {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(await facets(), { headers: { "cache-control": "private, max-age=600" } });
}
