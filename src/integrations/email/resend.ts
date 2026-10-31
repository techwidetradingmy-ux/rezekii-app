/**
 * Emails through Resend (owner, 31 Oct 2026: sign-in codes, password reset and admin alerts), from noreply@rezekii.com with
 * replies going to support. Free plan: 3,000 a month, 100 a day. Without RESEND_API_KEY in development the email is printed
 * to the server log instead, so the flows can be tried locally.
 */
export type Email = { to: string | string[]; subject: string; html: string; text: string };

const FROM = "Rezekii <noreply@rezekii.com>";
const REPLY_TO = "support@rezekii.com";

export async function sendEmail(m: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("Email isn't set up (RESEND_API_KEY).");
    console.log(`[email, not sent: no key] to ${[m.to].flat().join(", ")} · ${m.subject}\n${m.text}`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to: [m.to].flat(), subject: m.subject, html: m.html, text: m.text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One Rezekii email: a title, a few lines, then an optional big code and an optional button. Plain text alongside. */
export function layout(o: { title: string; lines: string[]; code?: string; button?: { label: string; href: string }; foot?: string }): { html: string; text: string } {
  const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#3b4a43">${esc(s)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f2f7f4;font-family:'Albert Sans',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f7f4;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;padding:28px">
<tr><td>
<div style="font-size:20px;font-weight:800;color:#00a862;margin-bottom:18px">Rezekii</div>
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0f1a14">${esc(o.title)}</h1>
${o.lines.map(p).join("")}
${o.code ? `<div style="margin:6px 0 18px;padding:14px;border-radius:14px;background:#e9f8f0;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#0f1a14">${esc(o.code)}</div>` : ""}
${o.button ? `<a href="${esc(o.button.href)}" style="display:inline-block;margin:4px 0 16px;padding:12px 20px;border-radius:999px;background:#00c073;color:#ffffff;font-weight:700;text-decoration:none">${esc(o.button.label)}</a>` : ""}
<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#7b8a83">${esc(o.foot ?? "Rezekii · www.rezekii.com · Questions? Reply to this email or write to support@rezekii.com.")}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [o.title, "", ...o.lines, ...(o.code ? ["", o.code, ""] : []), ...(o.button ? [`${o.button.label}: ${o.button.href}`] : []), "", o.foot ?? "Rezekii · www.rezekii.com"].join("\n");
  return { html, text };
}
