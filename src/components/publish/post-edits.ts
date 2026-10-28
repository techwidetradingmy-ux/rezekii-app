import { useSyncExternalStore } from "react";
import type { MyPost } from "@/lib/mock-publish";

/**
 * Editing a post opens the full New Post page (owner, 28 Oct 2026). The preview has no server, so the post being edited and
 * the saved changes travel through this browser tab.
 */
const OPEN = "rz-post-open";
const EDITS = "rz-post-edits";
const SAVED = "rz-post-saved";

/** Remember the post she tapped Edit on, for New Post to fill in. */
export function openPost(p: MyPost) {
  try { sessionStorage.setItem(OPEN, JSON.stringify(p)); } catch {}
}

/** The post being edited, if the page was opened with ?edit=<its id>. */
export function postToEdit(id: string): MyPost | null {
  try {
    const p: MyPost = JSON.parse(sessionStorage.getItem(OPEN) ?? "null");
    return p?.id === id ? p : null;
  } catch {
    return null;
  }
}

/** Keep the saved post and a message for Content Calendar to show. */
export function saveEdit(p: MyPost, message: string) {
  try {
    const all: Record<string, MyPost> = JSON.parse(sessionStorage.getItem(EDITS) ?? "{}");
    sessionStorage.setItem(EDITS, JSON.stringify({ ...all, [p.id]: p }));
    sessionStorage.setItem(SAVED, message);
  } catch {}
}

/** Saved posts replace their old versions; returns the message once, then forgets it. */
export function takeEdits(): { edits: Record<string, MyPost>; message: string } {
  try {
    const message = sessionStorage.getItem(SAVED) ?? "";
    sessionStorage.removeItem(SAVED);
    return { edits: JSON.parse(sessionStorage.getItem(EDITS) ?? "{}"), message };
  } catch {
    return { edits: {}, message: "" };
  }
}

const noSub = () => () => {};
/** The id in ?edit=, read in the browser only (null on the server). */
export function useEditId(): string | null {
  return useSyncExternalStore(noSub, () => new URLSearchParams(window.location.search).get("edit"), () => null);
}
