import type { T } from "../../lib/i18n/lang.ts";

/**
 * Why a post (or a TikTok Shop step) failed, in her language (owner, 3 Nov 2026). The reason is made in English, and saved
 * that way when a post fails, so it's read back from that: Rezekii's own wording is translated (whole lines, with the channel
 * or app name kept), and what TikTok or Meta said stays as they said it. Lines it doesn't know stay as they are.
 */
export function errorLine(t: T, text: string): string {
  const exact = t(text);
  if (exact !== text) return exact;
  let m: RegExpExecArray | null;
  if ((m = /^(.+) needs reconnecting in Rezekii \(Posts → Channels\)\.$/.exec(text)))
    return m[1] === "This channel" ? t("This channel needs reconnecting in Rezekii (Posts → Channels).") : t("{channel} needs reconnecting in Rezekii (Posts → Channels).", { channel: m[1] });
  if ((m = /^A call took too long and was stopped \((.*)\)\.$/.exec(text))) return t("A call took too long and was stopped ({error}).", { error: m[1] });
  if ((m = /^Instagram couldn't process the video \((.+)\)\.$/.exec(text))) return t("Instagram couldn't process the video ({status}).", { status: m[1] });
  if ((m = /^Instagram couldn't process the photos \((.+)\)\.$/.exec(text))) return t("Instagram couldn't process the photos ({status}).", { status: m[1] });
  if ((m = /^TikTok says this account can't post right now \((.*)\)\.$/.exec(text))) return t("TikTok says this account can't post right now ({error}).", { error: m[1] });
  if ((m = /^TikTok refused the post: (.*) \(([^()]*)\)\.$/.exec(text))) return t("TikTok refused the post: {error} ({code}).", { error: m[1], code: m[2] });
  if ((m = /^TikTok couldn't publish it: (.*)\.$/.exec(text))) return t("TikTok couldn't publish it: {reason}.", { reason: m[1] === "no reason given" ? t("no reason given") : m[1] });
  if ((m = /^TikTok didn't renew the sign-in \((.*)\)\. Continue with TikTok again\.$/.exec(text))) return t("TikTok didn't renew the sign-in ({error}). Continue with TikTok again.", { error: m[1] });
  if ((m = /^TikTok didn't answer: (.*)$/.exec(text))) return t("TikTok didn't answer: {error}", { error: m[1] });
  if ((m = /^TikTok error (-?\d+)$/.exec(text))) return t("TikTok error {code}", { code: m[1] });
  if ((m = /^TikTok could not make the link right now \((.*)\)\. Please try again\.$/.exec(text))) return t("TikTok could not make the link right now ({code}). Please try again.", { code: m[1] });
  return text;
}
