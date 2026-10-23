// Rename wazmrt's OWN Track H item ids (H1..H8) to zH1..zH8, so that a bare
// `H<n>` in this repo's memory unambiguously means a WORKSPACE LETTER
// (../../cmem/handoffs.md) and `zH<n>` means wazmrt's own Track H.
//
// Run:  bun rename-track-h.ts <repo-root> [--apply]
// Without --apply it only reports.
//
// ✅ APPLIED 2026-09-21 (owner-directed): 155 occurrences in 10 files. Kept as the record of
// exactly what was rewritten. ⚠️ **DO NOT --apply IT AGAIN.** Since the rename a bare `H<n>` MEANS
// a workspace letter (`INDEX.md`'s namespace note), and this script cannot tell the two apart.
// Re-applied, it would turn every "workspace letter H1" into a false `zH1`. As a dry run it is a
// census: 3 hits on 2026-09-21, all intended (the namespace note quoting the old collision twice,
// and one workspace-letter reference). Read each new hit; do not zero the count. It is a MASS token rename, so it counts
// matches rather than asserting exactly-once per site (`working-rules.md` → TOOLING's corollary is about
// targeted edits).

import { readdir, readFile, writeFile } from "node:fs/promises";

const args0 = process.argv.slice(2);
const root = args0[0];
const apply = args0.includes("--apply");
if (!root) {
  console.error("usage: rename-track-h.ts <repo-root> [--apply]");
  process.exit(2);
}

const targets: string[] = [];
for (const dir of ["cmem", "src"]) {
  for (const e of await readdir(`${root}/${dir}`, { withFileTypes: true })) {
    if (e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".zig"))) {
      targets.push(`${root}/${dir}/${e.name}`);
    }
  }
}
targets.sort();

// Word-bounded H followed by 1..8 and NOT already preceded by z/Z, and not part
// of a longer alphanumeric token. JS has no lookbehind-safe \b for the z case,
// so guard the preceding char explicitly.
const RE = /(^|[^0-9A-Za-z_])H([1-8])(?![0-9A-Za-z_])/g;

let totalHits = 0;
const perFile: Array<[string, number]> = [];

for (const path of targets) {
  const before = await readFile(path, "utf8");
  let hits = 0;
  const after = before.replace(RE, (_m, pre, n) => {
    hits++;
    return `${pre}zH${n}`;
  });
  if (hits === 0) continue;
  totalHits += hits;
  perFile.push([path.slice(root.length + 1), hits]);
  if (apply && after !== before) await writeFile(path, after);
}

for (const [f, n] of perFile) console.log(`${String(n).padStart(4)}  ${f}`);
console.log(`----  ${totalHits} occurrences in ${perFile.length} files${apply ? " (WRITTEN)" : " (dry run)"}`);
