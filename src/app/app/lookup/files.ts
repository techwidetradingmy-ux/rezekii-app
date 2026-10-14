/**
 * Product Lookup files (browser only): product links read from an uploaded CSV, TXT, JSON, XLSX or XLS file, and the results saved
 * as CSV, XLSX, JSON or TXT. XLSX is a zip of XML files: written here with stored (uncompressed) entries, and read with the
 * browser's own DecompressionStream, so no spreadsheet library is needed (owner, 14 Oct 2026).
 */

type Cell = string | number | null | undefined;

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** A zip of the given files, stored without compression. */
function zip(files: [string, string][]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const data = enc.encode(text);
    const fn = enc.encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [8, 0, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, fn.length, 2]].forEach(([at, v, size]) => (size === 4 ? local.setUint32(at, v, true) : local.setUint16(at, v, true)));
    parts.push(new Uint8Array(local.buffer), fn, data);
    const dir = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, fn.length, 2], [42, offset, 4]].forEach(([at, v, size]) => (size === 4 ? dir.setUint32(at, v, true) : dir.setUint16(at, v, true)));
    central.push(new Uint8Array(dir.buffer), fn);
    offset += 30 + fn.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, offset, 4]].forEach(([at, v, s]) => (s === 4 ? end.setUint32(at, v, true) : end.setUint16(at, v, true)));
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const col = (i: number) => { let s = ""; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

/** One-sheet XLSX (first row = headings, bold). */
function xlsx(rows: Cell[][]): Blob {
  const sheet = rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      const ref = `${col(ci)}${ri + 1}`;
      const style = ri === 0 ? ' s="1"' : "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
      return v === null || v === undefined || v === "" ? "" : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
    }).join("")}</row>`)
    .join("");
  return zip([
    ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ["xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>'],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`],
  ]);
}

const csvCell = (v: Cell) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export type ExportFormat = "csv" | "xlsx" | "json" | "txt";

/** Saves the rows (first row = headings) in the chosen format. */
export function saveRows(format: ExportFormat, base: string, rows: Cell[][]) {
  const [head, ...body] = rows;
  const records = body.map((r) => Object.fromEntries(head.map((h, i) => [String(h), r[i] ?? null])));
  const blob =
    format === "xlsx" ? xlsx(rows)
      : format === "json" ? new Blob([JSON.stringify(records, null, 2)], { type: "application/json" })
        : format === "txt" ? new Blob([records.map((rec) => Object.entries(rec).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}: ${v}`).join("\n")).join("\n\n------------------------------\n\n")], { type: "text/plain;charset=utf-8" })
          : new Blob([`﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The text of each entry in a zip whose name passes `want` (deflated or stored). */
async function unzipText(buf: ArrayBuffer, want: (name: string) => boolean): Promise<string[]> {
  const v = new DataView(buf);
  let end = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) return [];
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true);
  const dec = new TextDecoder();
  const out: string[] = [];
  for (let n = 0; n < count && p + 46 <= buf.byteLength; n++) {
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nlen));
    p += 46 + nlen + xlen + clen;
    if (!want(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = new Uint8Array(buf, start, csize);
    if (method === 0) out.push(dec.decode(data));
    else if (method === 8 && typeof DecompressionStream !== "undefined") out.push(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text());
  }
  return out;
}

/** TikTok product links and bare product IDs found in any text, in order, without repeats. */
export function linksFromText(text: string): string[] {
  const found: string[] = [];
  const clean = text.replace(/&amp;/g, "&");
  for (const m of clean.matchAll(/https?:\/\/[^\s"'<>,;|\]]+|\b17\d{17}\b/g)) {
    const s = m[0].replace(/[).]+$/, "");
    if (/^\d+$/.test(s) || /(^|\.)tiktok\.com\b|tiktokshop|tokopedia/i.test(s)) found.push(s);
  }
  return [...new Set(found)];
}

/** Product links in an uploaded CSV, TXT, JSON, XLSX or XLS file. */
export async function linksFromFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return linksFromText((await unzipText(await file.arrayBuffer(), (n) => /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(n))).join("\n"));
  if (name.endsWith(".xls")) {
    // Old binary Excel keeps text as Latin-1 or UTF-16: read the bytes both ways.
    const bytes = new Uint8Array(await file.arrayBuffer());
    return linksFromText(`${new TextDecoder("latin1").decode(bytes)}\n${new TextDecoder("utf-16le").decode(bytes)}`);
  }
  return linksFromText(await file.text());
}
