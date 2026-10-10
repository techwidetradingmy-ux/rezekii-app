import { Splash } from "../splash";

const MESSAGES: Record<string, { title: string; body: string; retry?: boolean }> = {
  connected: { title: "TikTok Shop linked", body: "Your account is connected to Rezekii. You can close this page." },
  "not-allowed": { title: "Not part of this test", body: "This TikTok account isn't in the current test, so nothing was saved." },
  denied: { title: "Linking cancelled", body: "You didn't approve Rezekii in TikTok Shop.", retry: true },
  expired: { title: "Link expired", body: "This link expired or was opened in a different browser.", retry: true },
  error: { title: "Something went wrong", body: "TikTok Shop didn't finish linking.", retry: true },
};

export default async function Connected({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const msg = MESSAGES[result ?? ""] ?? MESSAGES.error;
  return (
    <Splash>
      <h1>{msg.title}</h1>
      <p>
        {msg.body}
        {msg.retry && (
          <>
            {" "}
            <a href="/api/auth/tiktokshop/start">Try again</a>
          </>
        )}
      </p>
    </Splash>
  );
}
