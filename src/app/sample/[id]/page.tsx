import { redirect } from "next/navigation";
import { currentUser } from "../../current-user";
import { Splash } from "../../splash";
import { OpenSample } from "./open-sample";

export const dynamic = "force-dynamic";

/** Opened on the creator's phone (from the QR code, or Request free sample on a phone): shows at once, then goes into TikTok. */
export default async function SampleOnPhone({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, currentUser()]);
  if (!user) redirect("/signin");
  return (
    <Splash>
      <OpenSample id={id} />
    </Splash>
  );
}
