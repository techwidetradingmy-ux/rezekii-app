import { redirect } from "next/navigation";
import { sampleLink } from "@/modules/tap/samples.ts";
import { currentUser } from "../../current-user";
import { Splash } from "../../splash";

export const dynamic = "force-dynamic";

/** Opened on the creator's phone from the QR code: makes a fresh TikTok sample request link and goes to the TikTok app. */
export default async function SampleOnPhone({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, currentUser()]);
  if (!user) redirect("/signin");
  const r = await sampleLink(user.id, id);
  if (r.ok) redirect(r.deeplink);
  return (
    <Splash>
      <h1>Couldn&apos;t open the sample request</h1>
      <p>{r.error} <a href={`/app/marketplace/${id}`}>Back to the product</a></p>
    </Splash>
  );
}
