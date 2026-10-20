import { test } from "node:test";
import assert from "node:assert/strict";
import { keyframesInMoov, readKeyframes } from "./keyframes.ts";

// A tiny MP4 index: box(type, ...contents) and big-endian numbers.
const u32 = (...n: number[]) => { const b = new Uint8Array(n.length * 4); const v = new DataView(b.buffer); n.forEach((x, i) => v.setUint32(i * 4, x)); return b; };
const ascii = (s: string) => new TextEncoder().encode(s);
const join = (parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const box = (type: string, ...parts: Uint8Array[]) => { const body = join(parts); return join([u32(body.length + 8), ascii(type), body]); };
const trak = (handler: string, seconds: number, frames: number, keys: number[] | null) =>
  box("trak", box("mdia",
    box("mdhd", u32(0, 0, 0, 1000, seconds * 1000)),
    box("hdlr", u32(0, 0), ascii(handler)),
    box("minf", box("stbl", box("stsz", u32(0, 0, frames)), ...(keys ? [box("stss", u32(0, keys.length, ...keys))] : []))),
  ));
const moov = (...traks: Uint8Array[]) => { const b = join(traks); return new DataView(b.buffer); };

test("C7c: a video with one full frame in 10 seconds is found (Google Flow downloads); the sound track is skipped", () => {
  assert.deepEqual(keyframesInMoov(moov(trak("soun", 10, 470, null), trak("vide", 10, 240, [1]))), { seconds: 10, keyframes: 1, maxGapSec: 10 });
});

test("C7c: full frames every 2 seconds are fine; no sync table means every frame is a full frame", () => {
  assert.equal(keyframesInMoov(moov(trak("vide", 10, 240, [1, 49, 97, 145, 193])))?.maxGapSec, 2);
  assert.equal(keyframesInMoov(moov(trak("vide", 10, 240, null)))?.keyframes, 240);
  assert.equal(keyframesInMoov(moov(trak("soun", 10, 470, null))), null);
});

test("C7c: only the index is read from the file, wherever it sits (here after the video data)", async () => {
  const file = new Blob([box("ftyp", ascii("isom")), box("mdat", new Uint8Array(4096)), box("moov", trak("vide", 10, 240, [1]))]);
  assert.equal((await readKeyframes(file))?.maxGapSec, 10);
  assert.equal(await readKeyframes(new Blob([ascii("not a video at all")])), null);
});
