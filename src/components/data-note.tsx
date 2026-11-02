"use client";

import { Icon } from "@/components/icons";
import { Tip } from "@/components/ui";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, type Lang } from "@/lib/i18n/lang";

// One daily update time for everything (owner, 31 Oct 2026): 1:00 AM in Malaysia, shown in the viewer's own time.
const MYT_1AM = Date.UTC(2026, 0, 1, 17, 0);
const inMalaysia = () => Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kuala_Lumpur";
const dailyTime = (lang: Lang) => new Date(MYT_1AM).toLocaleTimeString(dateLocale(lang), { hour: "numeric", minute: "2-digit", hour12: true });
// A day ("2026-10-31") shows as the day; a moment shows with its time.
const stamp = (v: string, lang: Lang) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00+08:00`).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric" }) : new Date(v).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }));

/**
 * When the data on a page updates and how new it is: "Updates daily at 1:00 am · Latest: 31 Oct, 12:11 am". `what` is English
 * ("Products and rates from") and shows in her language, so it needs a line in a word list.
 */
export function DataNote({ latest, every, what }: { latest: string | null | undefined; every?: string; what?: string }) {
  const t = useT();
  const lang = useLang();
  const time = dailyTime(lang);
  return (
    <p className="v2-small" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <Icon name="clock" size={14} /> {every ?? (inMalaysia() ? t("Updates daily at {time}", { time }) : t("Updates daily at {time} your time", { time }))}
      {latest ? ` · ${t("{what}: {date}", { what: what ? t(what) : t("Latest"), date: stamp(latest, lang) })}` : ""}
    </p>
  );
}

/** "3:42 pm" today, "30 Oct, 3:42 pm" before, in the viewer's own time and language (`lang`, English if not given). */
export function updatedWhen(at: string, lang: Lang = "en"): string {
  const d = new Date(at);
  const loc = dateLocale(lang);
  const time = d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit", hour12: true });
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString(loc, { day: "numeric", month: "short" })}${lang === "zh" ? " " : ", "}${time}`;
}

/**
 * How new her data is, short (owner, 31 Oct 2026: "always show when the data was last updated, so creators can check it"):
 * "Updated 3:42 pm", with how it updates in the ⓘ.
 */
export function Updated({ at }: { at: string | null | undefined }) {
  const t = useT();
  const lang = useLang();
  if (!at) return null;
  const time = dailyTime(lang);
  return (
    <p className="v2-small v2-upd">
      <Icon name="clock" size={14} /> {t("Updated {when}", { when: updatedWhen(at, lang) })}
      <Tip
        label={t("How this updates")}
        text={inMalaysia()
          ? t("Rezekii reads your TikTok data as soon as you link it, again when you open this page if it's over 30 minutes old, and every day at {time}.", { time })
          : t("Rezekii reads your TikTok data as soon as you link it, again when you open this page if it's over 30 minutes old, and every day at {time} your time.", { time })}
      />
    </p>
  );
}
