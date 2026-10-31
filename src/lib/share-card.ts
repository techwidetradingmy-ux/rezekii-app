"use client";

/**
 * The share card as a real file (owner, 1 Nov 2026): the picture from /api/v2/share-card, and a 5-second video made from it in
 * the browser (a slow zoom with a light sweeping across). Both go to the phone's share menu, or are saved.
 */

/** "1 day", "16 days". */
export const daysText = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export async function cardImage(url: string): Promise<File> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("card");
  return new File([await r.blob()], "rezekii-moment.png", { type: "image/png" });
}

/** A 5-second video of the card: MP4 where the browser can record it, else WebM. */
export async function cardVideo(image: File, seconds = 5): Promise<File> {
  const bmp = await createImageBitmap(image);
  const scale = Math.min(1, 720 / bmp.width);
  const w = Math.round(bmp.width * scale / 2) * 2, h = Math.round(bmp.height * scale / 2) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const type = types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error("video");
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const done = new Promise<void>((res) => { rec.onstop = () => res(); });
  const start = performance.now();
  const draw = () => {
    const t = Math.min(1, (performance.now() - start) / (seconds * 1000));
    const z = 1 + 0.06 * t;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, (w - w * z) / 2, (h - h * z) / 2, w * z, h * z);
    // A light sweeping across once, halfway through.
    const sx = (t * 2.2 - 0.6) * w;
    const g = ctx.createLinearGradient(sx - w * 0.25, 0, sx + w * 0.25, h * 0.3);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (t < 1) requestAnimationFrame(draw);
    else rec.stop();
  };
  rec.start(250);
  draw();
  await done;
  const mp4 = type.startsWith("video/mp4");
  return new File(parts, `rezekii-moment.${mp4 ? "mp4" : "webm"}`, { type: mp4 ? "video/mp4" : "video/webm" });
}

/** Saves a file through the browser's download. */
export function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Opens the phone's share menu with the file and caption. "shared" only when the menu says it went out (owner, 1 Nov 2026: a
 * share counts only then); "cancelled" when she closed it; "unsupported" where the browser can't share files.
 */
export async function shareFile(file: File, text: string): Promise<"shared" | "cancelled" | "unsupported" | "failed"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return "unsupported";
  try {
    await nav.share({ files: [file], text });
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "failed";
  }
}
