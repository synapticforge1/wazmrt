// Letter H3 — measure a Markdown file's structure: every `##`/`###` heading with its line number and
// the BYTES under it, so the cut is planned against numbers, not impressions.
//
//   bun h3-sections.ts <file.md>

import { readFileSync } from "node:fs";

const [file] = process.argv.slice(2);
const lines = readFileSync(file, "utf8").split("\n");
const enc = new TextEncoder();
type Sec = { line: number; level: number; title: string; bytes: number };
const secs: Sec[] = [{ line: 1, level: 0, title: "(preamble)", bytes: 0 }];
let inFence = false;
for (const [i, l] of lines.entries()) {
  if (/^```/.test(l)) inFence = !inFence;
  const m = !inFence && /^(#{2,3}) (.*)$/.exec(l);
  if (m) secs.push({ line: i + 1, level: m[1].length, title: m[2], bytes: 0 });
  secs[secs.length - 1].bytes += enc.encode(l + "\n").length;
}
const total = secs.reduce((n, s) => n + s.bytes, 0);
console.log(`${file}: ${total} bytes, ${lines.length} lines, ${secs.length - 1} headings\n`);
console.log("  line   bytes   heading");
for (const s of secs) {
  const indent = s.level === 3 ? "    " : "";
  console.log(`${String(s.line).padStart(6)} ${String(s.bytes).padStart(7)}   ${indent}${s.title.slice(0, 110)}`);
}
