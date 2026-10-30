import { randomBytes, timingSafeEqual } from "node:crypto";

export const STATE_COOKIE = "tts_state";
export const STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth/tiktokshop",
  maxAge: 30 * 60, // TikTok's code is valid 30 minutes
};

export const newState = () => randomBytes(24).toString("base64url");

export function stateMatches(received: string | null, saved: string | undefined): boolean {
  if (!received || !saved || received.length !== saved.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(saved));
}
