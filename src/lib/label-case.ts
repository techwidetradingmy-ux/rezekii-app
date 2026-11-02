/**
 * Title Case for a short label shown on screen (owner's fixed rule): "Not approved" → "Not Approved". For values that are also
 * saved or compared as data (statuses, feedback types, dispute kinds), so only the text on screen changes. Small joining words
 * stay lower case unless they come first; words with capitals inside (TikTok, LIVE) are left as they are.
 */
const SMALL = new Set(["a", "an", "the", "and", "or", "but", "nor", "for", "of", "to", "in", "on", "at", "by", "with", "as", "per", "vs", "via", "from", "into", "is"]);

export const labelCase = (s: string) =>
  s
    .split(" ")
    .map((w, i) => (/[A-Z]/.test(w.slice(1)) || (i > 0 && SMALL.has(w.toLowerCase())) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
