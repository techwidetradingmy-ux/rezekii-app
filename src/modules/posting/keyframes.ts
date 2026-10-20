/**
 * How far apart a video's full frames (keyframes) are, read from the MP4's index without decoding it (C7c). Videos straight
 * from AI generators can have one full frame in the whole clip; Facebook and Threads then show them broken (mixed with
 * other footage), so New post warns. Runs in the browser: only the index ("moov") is read, not the whole file.
 */
export type KeyframeInfo = { seconds: number; keyframes: number; maxGapSec: number };

/** A gap longer than this between full frames gets the warning (Meta asks for one every 2 seconds). */
export const KEYFRAME_GAP_MAX = 5;

type Box = { type: string; start: number; end: number };
const fourcc = (v: DataView, o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));

/** The boxes between from and to; start is where each box's content begins. */
function boxes(v: DataView, from: number, to: number): Box[] {
  const out: Box[] = [];
  for (let o = from; o + 8 <= to; ) {
    let size = v.getUint32(o), head = 8;
    if (size === 1) [size, head] = [Number(v.getBigUint64(o + 8)), 16];
    else if (size === 0) size = to - o;
    if (size < head || o + size > to) break;
    out.push({ type: fourcc(v, o + 4), start: o + head, end: o + size });
    o += size;
  }
  return out;
}
const inside = (v: DataView, b: Box | undefined, ...path: string[]): Box | undefined =>
  path.reduce<Box | undefined>((box, type) => box && boxes(v, box.start, box.end).find((x) => x.type === type), b);

/** The keyframe spacing of the first video track in a "moov" box's content, or null when it can't be read. */
export function keyframesInMoov(v: DataView): KeyframeInfo | null {
  for (const trak of boxes(v, 0, v.byteLength).filter((b) => b.type === "trak")) {
    const mdia = inside(v, trak, "mdia"), hdlr = inside(v, mdia, "hdlr");
    if (!hdlr || fourcc(v, hdlr.start + 8) !== "vide") continue;
    const mdhd = inside(v, mdia, "mdhd"), stbl = inside(v, mdia, "minf", "stbl"), stsz = inside(v, stbl, "stsz");
    if (!mdhd || !stsz) return null;
    const v1 = v.getUint8(mdhd.start) === 1;
    const timescale = v.getUint32(mdhd.start + (v1 ? 20 : 12));
    const duration = v1 ? Number(v.getBigUint64(mdhd.start + 24)) : v.getUint32(mdhd.start + 16);
    const samples = v.getUint32(stsz.start + 8);
    if (!timescale || !duration || !samples) return null;
    const seconds = duration / timescale, perFrame = seconds / samples;
    // No sync-sample table: every frame is a full frame.
    const stss = inside(v, stbl, "stss");
    if (!stss) return { seconds, keyframes: samples, maxGapSec: perFrame };
    const count = v.getUint32(stss.start + 4);
    const keys = Array.from({ length: count }, (_, i) => v.getUint32(stss.start + 8 + i * 4));
    const gaps = keys.map((k, i) => ((keys[i + 1] ?? samples + 1) - k) * perFrame);
    return { seconds, keyframes: count, maxGapSec: Math.max(keys[0] ? (keys[0] - 1) * perFrame : 0, ...gaps) };
  }
  return null;
}

/** Reads only the MP4's index from the file (top-level boxes, then "moov"); null when it isn't a readable MP4. */
export async function readKeyframes(file: Blob): Promise<KeyframeInfo | null> {
  for (let o = 0; o + 8 <= file.size; ) {
    const h = new DataView(await file.slice(o, o + 16).arrayBuffer());
    let size = h.getUint32(0), head = 8;
    if (size === 1 && h.byteLength >= 16) [size, head] = [Number(h.getBigUint64(8)), 16];
    else if (size === 0) size = file.size - o;
    if (size < head) return null;
    if (fourcc(h, 4) === "moov") return keyframesInMoov(new DataView(await file.slice(o + head, o + size).arrayBuffer()));
    o += size;
  }
  return null;
}
