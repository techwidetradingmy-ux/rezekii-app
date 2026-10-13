"use client";

import { emblemSvg, type Level } from "../../emblems";

/**
 * The level-up share card from the mockup (.lv-story), drawn on a 1080×1920 canvas so it can be saved or shared as an
 * image, or recorded as a 5-second video. The mockup card is 240 px wide, so every size here is the mockup's × 4.5.
 */
export const CARD_W = 1080;
export const CARD_H = 1920;
const S = CARD_W / 240;
export const DESIGNS = ["Pastel", "Certificate", "Night"] as const;
/** The blessing line on the card and the level-up screen (from the mockup). */
export const BLESS = [
  "Rezeki tak pernah salah alamat. Today it found you.",
  "May every post bring more rezeki, and every sale bring more joy.",
  "Semoga rezeki terus melimpah dan usaha dipermudahkan.",
  "Small steps, big blessings. Keep shining, keep sharing.",
  "Your hard work became someone else's good find. Thank you for sharing it.",
];

export type CardInput = { design: number; level: Level; handle: string; blessing: string; month: string; font: string; emblem: HTMLImageElement; logo: HTMLImageElement; partner: HTMLImageElement };

const LOOK = [
  { text: "#3b2f5c", chipBg: "#ffffff", chipFg: "#7d84b8", lvl: ["#7d84b8", "#b36bd6"], quoteBg: "rgba(255,255,255,0.7)", bar: "rgba(255,255,255,0.9)", barFg: "#0d1117", ring: null as string | null },
  { text: "#4a3a14", chipBg: "#4a3a14", chipFg: "#ffe08a", lvl: ["#b8862b", "#e9c46a"], quoteBg: "rgba(255,255,255,0.6)", bar: "rgba(255,252,243,0.95)", barFg: "#4a3a14", ring: "#d9b45a" },
  { text: "#ffffff", chipBg: "#00c073", chipFg: "#04140d", lvl: ["#5fe3ab", "#25f4ee"], quoteBg: "rgba(255,255,255,0.08)", bar: "rgba(255,255,255,0.08)", barFg: "#ffffff", ring: "rgba(95,227,171,0.35)" },
];

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Loads the pictures the card needs: the level emblem, the Rezekii logo and the TikTok Shop Partner logo. */
export async function cardImages(level: Level) {
  const svg = emblemSvg(level, 378, `card-${level}`);
  const [emblem, logo, partner] = await Promise.all([
    loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`),
    loadImage("/master-logo-transparent.png"),
    loadImage("/tiktok-shop-partner-logo.png"),
  ]);
  return { emblem, logo, partner };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
/** Opacity and lift of a part that fades in between `a` and `b` and out after 0.9 of the loop (the mockup's keyframes). */
function fade(p: number, a: number, b: number): [number, number] {
  if (p >= 0.9) return [clamp01(1 - (p - 0.9) / 0.1), 0];
  if (p <= a) return [0, 12];
  const k = ease((p - a) / (b - a));
  return [k, 12 * (1 - k)];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function background(ctx: CanvasRenderingContext2D, design: number, p: number) {
  if (design === 0) {
    const g = ctx.createLinearGradient(0, 0, CARD_W * 0.42, CARD_H);
    g.addColorStop(0, "#fbf8ff");
    g.addColorStop(0.45, "#e9e6ff");
    g.addColorStop(1, "#d6dcff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // floating bubbles
    const bob = (d: number) => Math.sin((p + d) * Math.PI * 2) * 14 * S * 0.5;
    for (const [x, y, r, c, d] of [[-24 + 45, 40 + 45, 45, "179,107,214", 0], [240 + 40 - 60, 180 + 60, 60, "125,132,184", 0.24], [30 + 35, 427 - 60 - 35, 35, "255,122,168", 0.42]] as const) {
      const gr = ctx.createRadialGradient(x * S, (y + bob(d)) * S, 0, x * S, (y + bob(d)) * S, r * S);
      gr.addColorStop(0, `rgba(${c},0.35)`);
      gr.addColorStop(0.7, `rgba(${c},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
    }
  } else if (design === 1) {
    const g = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.3, 0, CARD_W / 2, CARD_H * 0.3, CARD_H * 0.75);
    g.addColorStop(0, "#fffdf7");
    g.addColorStop(1, "#f6e9cc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // the certificate's double gold frame
    ctx.strokeStyle = "#d9b45a";
    ctx.lineWidth = 3 * S;
    ctx.strokeRect(1.5 * S, 1.5 * S, CARD_W - 3 * S, CARD_H - 3 * S);
    ctx.lineWidth = 2 * S;
    ctx.strokeRect(9 * S, 9 * S, CARD_W - 18 * S, CARD_H - 18 * S);
  } else {
    const g = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.28, 0, CARD_W / 2, CARD_H * 0.28, CARD_H * 0.8);
    g.addColorStop(0, "#1e5c43");
    g.addColorStop(0.62, "#0b1a14");
    g.addColorStop(1, "#060d0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }
}

function cobrand(ctx: CanvasRenderingContext2D, c: CardInput) {
  const L = LOOK[c.design];
  const x = 10 * S, w = CARD_W - 20 * S, h = 38 * S, y = CARD_H - 10 * S - h;
  ctx.save();
  ctx.shadowColor = "rgba(13,17,23,0.14)";
  ctx.shadowBlur = 18 * S;
  ctx.shadowOffsetY = 6 * S;
  ctx.fillStyle = L.bar;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14 * S);
  ctx.fill();
  ctx.restore();
  if (L.ring) {
    ctx.strokeStyle = L.ring;
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14 * S);
    ctx.stroke();
  }
  // left: Rezekii; right (1.3× wider): the TikTok Shop Partner logo on black
  const inner = w - 8 * S - 4 * S;
  const leftW = inner / 2.3, rightW = inner - leftW;
  const lx = x + 4 * S, rx = lx + leftW + 4 * S, iy = y + 4 * S, ih = h - 8 * S;
  ctx.drawImage(c.logo, lx + 10 * S, iy + (ih - 20 * S) / 2, 20 * S, 20 * S);
  ctx.fillStyle = L.barFg;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${9 * S}px ${c.font}`;
  ctx.fillText("Rezekii", lx + 35 * S, iy + ih / 2 - 0.5 * S);
  ctx.globalAlpha = 0.72;
  ctx.font = `700 ${7 * S}px ${c.font}`;
  ctx.fillText("rezekii.com", lx + 35 * S, iy + ih / 2 + 8 * S);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.design === 2 ? "rgba(0,0,0,0.55)" : "#0d1117";
  ctx.beginPath();
  ctx.roundRect(rx, iy, rightW, ih, 10 * S);
  ctx.fill();
  const ph = 20 * S, pw = (c.partner.width / c.partner.height) * ph;
  const fit = Math.min(1, (rightW - 10 * S) / pw);
  ctx.drawImage(c.partner, rx + (rightW - pw * fit) / 2, iy + (ih - ph * fit) / 2, pw * fit, ph * fit);
}

/**
 * Draws the card at time `t` seconds of the 5-second loop (emblem drops in, then the words, then the blessing).
 * `t` of 5 or more draws the finished card, as used for the still image.
 */
export function drawCard(ctx: CanvasRenderingContext2D, c: CardInput, t: number) {
  const L = LOOK[c.design];
  const p = t >= 5 ? 0.6 : (t % 5) / 5;
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  background(ctx, c.design, p);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // sizes in mockup px: chip 21, emblem 84, "Congratulations," 17, name 23, level 28, quote box
  ctx.font = `italic 700 ${12.5 * S}px ${c.font}`;
  const quoteLines = wrap(ctx, `“${c.blessing}”`, (240 - 32 - 22) * S);
  const quoteH = (quoteLines.length * 18.75 + 16) * S;
  const parts = [21, 84, 17, 23, 28, quoteH / S];
  const total = parts.reduce((a, b) => a + b, 0) + 4 * (parts.length - 1);
  let y = (18 + (427 - 18 - 52 - total) / 2) * S;
  const cx = CARD_W / 2;

  // chip
  const [tA, tY] = fade(p, 0.24, 0.34);
  ctx.globalAlpha = tA;
  ctx.font = `900 ${9.5 * S}px ${c.font}`;
  const chip = `✦ LEVEL UP · ${c.month.toUpperCase()}`;
  const chipW = ctx.measureText(chip).width + 20 * S;
  ctx.fillStyle = L.chipBg;
  ctx.beginPath();
  ctx.roundRect(cx - chipW / 2, y + tY * S, chipW, 21 * S, 10.5 * S);
  ctx.fill();
  ctx.fillStyle = L.chipFg;
  ctx.fillText(chip, cx, y + tY * S + 10.5 * S);
  y += 25 * S;

  // emblem: drops in from above with a squash, as in the mockup's stDrop keyframes
  let eA = 1, eY = 0, eS = 1;
  if (p < 0.04) eA = 0;
  else if (p < 0.14) { const k = (p - 0.04) / 0.1; eA = k; eY = -120 * (1 - k) + 6 * k; eS = 0.4 + 0.75 * k; }
  else if (p < 0.2) { const k = (p - 0.14) / 0.06; eY = 6 - 10 * k; eS = 1.15 - 0.21 * k; }
  else if (p < 0.26) { const k = (p - 0.2) / 0.06; eY = -4 + 4 * k; eS = 0.94 + 0.06 * k; }
  else if (p >= 0.88) { const k = (p - 0.88) / 0.12; eA = 1 - k; eS = 1 - 0.08 * k; }
  ctx.globalAlpha = eA;
  const es = 84 * S * eS;
  ctx.drawImage(c.emblem, cx - es / 2, y + 42 * S - es / 2 + eY * S, es, es);
  y += 88 * S;

  ctx.globalAlpha = tA;
  ctx.fillStyle = L.text;
  ctx.globalAlpha = tA * 0.8;
  ctx.font = `700 ${13 * S}px ${c.font}`;
  ctx.fillText("Congratulations,", cx, y + 8.5 * S + tY * S);
  y += 21 * S;
  ctx.globalAlpha = tA;
  ctx.font = `900 ${19 * S}px ${c.font}`;
  ctx.fillText(c.handle, cx, y + 11.5 * S + tY * S);
  y += 27 * S;
  ctx.font = `900 ${24 * S}px ${c.font}`;
  const lvlText = `You're now ${c.level[0].toUpperCase()}${c.level.slice(1)}`;
  const lw = ctx.measureText(lvlText).width;
  const g = ctx.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0);
  g.addColorStop(0, L.lvl[0]);
  g.addColorStop(0.5, L.lvl[1]);
  g.addColorStop(1, L.lvl[0]);
  ctx.fillStyle = g;
  ctx.fillText(lvlText, cx, y + 14 * S + tY * S);
  y += 32 * S;

  const [qA, qY] = fade(p, 0.4, 0.52);
  ctx.globalAlpha = qA;
  ctx.font = `italic 700 ${12.5 * S}px ${c.font}`;
  const qw = Math.min((240 - 32) * S, Math.max(...quoteLines.map((l) => ctx.measureText(l).width)) + 22 * S);
  ctx.fillStyle = L.quoteBg;
  ctx.beginPath();
  ctx.roundRect(cx - qw / 2, y + qY * S, qw, quoteH, 14 * S);
  ctx.fill();
  if (c.design === 1) {
    ctx.strokeStyle = "#e3cf9b";
    ctx.lineWidth = 1 * S;
    ctx.stroke();
  }
  ctx.fillStyle = c.design === 2 ? "#e9fff5" : L.text;
  quoteLines.forEach((line, i) => ctx.fillText(line, cx, y + qY * S + (8 + 9.4 + i * 18.75) * S));
  ctx.globalAlpha = 1;

  cobrand(ctx, c);
}

/** The finished card as a PNG file. */
export async function cardImage(c: CardInput): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  drawCard(canvas.getContext("2d")!, c, 5);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the image."))), "image/png"));
  return new File([blob], `rezekii-${c.level}.png`, { type: "image/png" });
}

/** The 5-second card animation as a video file (MP4 where the browser can record it, otherwise WebM). */
export async function cardVideo(c: CardInput): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
  if (!type) throw new Error("This browser cannot make videos. Choose Image instead.");
  drawCard(ctx, c, 0);
  const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  rec.start();
  // A plain timer, not requestAnimationFrame: that one stops when the page is not on screen, and the video would never end.
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const t = (performance.now() - start) / 1000;
      drawCard(ctx, c, Math.min(t, 4.99));
      if (t < 5) setTimeout(frame, 1000 / 30);
      else resolve();
    };
    frame();
  });
  rec.stop();
  await done;
  const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  return new File([new Blob(chunks, { type: type.split(";")[0] })], `rezekii-${c.level}.${ext}`, { type: type.split(";")[0] });
}
