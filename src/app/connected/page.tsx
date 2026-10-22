import { LangProvider } from "@/lib/i18n/client.tsx";
import { tx } from "@/lib/i18n/lang.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { Splash } from "../splash";

const MESSAGES: Record<string, { title: string; body: string; retry?: boolean }> = {
  connected: { title: tx("TikTok Shop linked"), body: tx("Your TikTok Shop account is linked and approved. Affiliate links, product lookup and showcase are ready on Rezekii.") },
  waiting: { title: tx("TikTok Shop linked"), body: tx("Techwide approves each new creator account. You'll see the result on Getting set up.") },
  waitlist: { title: tx("You're on the waitlist"), body: tx("All of Rezekii's TikTok Shop places are taken for now, so nothing was saved. When a place frees up you'll be invited to link again on Getting set up.") },
  taken: { title: tx("Already linked"), body: tx("This TikTok Shop account is already linked to a different Rezekii account.") },
  signin: { title: tx("Sign in first"), body: tx("Sign in to Rezekii, then link TikTok Shop on Getting set up."), retry: true },
  "not-allowed": { title: tx("Not part of this test"), body: tx("This TikTok account isn't in the current test, so nothing was saved.") },
  denied: { title: tx("Linking cancelled"), body: tx("You didn't approve Rezekii in TikTok Shop."), retry: true },
  expired: { title: tx("Link expired"), body: tx("This link expired or was opened in a different browser."), retry: true },
  error: { title: tx("Something went wrong"), body: tx("TikTok Shop didn't finish linking."), retry: true },
  "partner-connected": { title: tx("Partner account linked"), body: tx("Techwide's TAP campaigns are now connected to Rezekii. You can close this page.") },
  "partner-not-allowed": { title: tx("Partner account not allowed"), body: tx("This Partner Center account isn't on the test list, so nothing was saved.") },
  "seller-connected": { title: tx("Shop linked"), body: tx("Your TikTok Shop is now connected to Rezekii. You can close this page.") },
  "seller-not-allowed": { title: tx("Shop not allowed"), body: tx("This shop isn't on the test list, so nothing was saved.") },
};

export default async function Connected({ searchParams }: { searchParams: Promise<{ result?: string; id?: string }> }) {
  const [{ result, id }, lang] = await Promise.all([searchParams, getLang()]);
  const t = tFor(lang);
  const msg = MESSAGES[result ?? ""] ?? MESSAGES.error;
  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
    <Splash lang={lang}>
      <h1>{t(msg.title)}</h1>
      <p>
        {t(msg.body)}
        {result === "partner-not-allowed" && id ? t(" (TikTok's partner ID: {id})", { id }) : ""}
        {result === "seller-not-allowed" && id ? t(" (Shop: {id})", { id }) : ""}
        {msg.retry && (
          <>
            {" "}
            <a href={result === "signin" ? "/signin" : "/api/auth/tiktokshop/start"}>{result === "signin" ? t("Sign in") : t("Try again")}</a>
          </>
        )}
      </p>
      {["connected", "waiting", "waitlist", "taken"].includes(result ?? "") && (
        <p>
          <a href="/onboarding">{t("Continue")}</a>
        </p>
      )}
    </Splash>
    </LangProvider>
  );
}
