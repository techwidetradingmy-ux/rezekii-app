import { redirect } from "next/navigation";
import { LangProvider } from "@/lib/i18n/client.tsx";
import { getLang } from "@/lib/i18n/server.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { currentUser } from "../../current-user";
import { Splash } from "../../splash";
import { OpenSample } from "./open-sample";

export const dynamic = "force-dynamic";

/** Opened on the creator's phone (from the QR code, or Request free sample on a phone): shows at once, then goes into TikTok. */
export default async function SampleOnPhone({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, currentUser()]);
  if (!user) redirect("/signin");
  const lang = await getLang();
  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
      <Splash lang={lang}>
        <OpenSample id={id} />
      </Splash>
    </LangProvider>
  );
}
