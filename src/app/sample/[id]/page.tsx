import { redirect } from "next/navigation";
import { currentUser } from "@/app/current-user";
import { OpenSample } from "./open-sample";
import "../../public-card.css";

export const dynamic = "force-dynamic";

/**
 * Opened on the creator's phone (from the QR code a computer shows, or Request free sample on a phone): makes a fresh TikTok
 * sample request and goes into TikTok. As on rezekii.com; /api/tap/samples hands out this address as `phoneUrl`.
 */
export default async function SampleOnPhone({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, currentUser()]);
  if (!user) redirect("/signin");
  return (
    <main className="pc-page" style={{ textAlign: "center" }}>
      <OpenSample id={id} />
    </main>
  );
}
