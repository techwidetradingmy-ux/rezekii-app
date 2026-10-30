import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { adminSamples } from "@/modules/tap/samples.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Samples creators asked for on Rezekii, each with its live status from TikTok (admins only). Creators submit them in TikTok. */
export async function GET() {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  return NextResponse.json({ samples: await adminSamples() }, { headers: { "cache-control": "private, no-store" } });
}
