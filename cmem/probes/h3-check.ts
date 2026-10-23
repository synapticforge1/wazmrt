// Letter H3 — the memory-conventions rule "CHECK it, do not assert it: snapshot every hash,
// identifier and ratio before cutting; prove each still resolves afterwards; invert that check."
//
//   bun h3-check.ts <repo root> <baseline commit>            → exit 0 iff every check passes
//   bun h3-check.ts <repo root> <baseline commit> --invert   → sabotages the new text in
//                                                                     memory; MUST report failures
//
// Checks, against the INDEX.md of <baseline commit> (the text being cut):
//   1. every commit hash the old INDEX cites RESOLVES in git, and still APPEARS somewhere in the new
//      cmem/ — "a summary without a commit pointer is a loss";
//   2. every relative link in the new INDEX / open-work / working-rules resolves to a file;
//   3. every by-name section reference (an arrow from INDEX / working-rules / open-work to an
//      UPPER-CASE section name) anywhere in the repo names a heading that exists in that file.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { output } from "./run.ts";

const args0 = process.argv.slice(2);
const [root, baseline] = args0;
const invert = args0.includes("--invert");

async function git(args: string[]) {
  const r = await output("git", { args, cwd: root, stdout: "piped", stderr: "piped" });
  return { code: r.code, out: new TextDecoder().decode(r.stdout) };
}
function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(md|ts|zig|txt|h|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const oldIndex = (await git(["show", `${baseline}:cmem/INDEX.md`])).out;
if (!oldIndex) throw new Error(`cannot read cmem/INDEX.md at ${baseline}`);

// The new cmem text, all files concatenated (the "does it still appear anywhere" corpus). The H19
// history map is left out: it lists every pre-purge id, so it would make check 1 unable to fail.
const MAP = `${root}/cmem/history-map-2026-10-23.md`;
const cmemFiles = walk(`${root}/cmem`).filter((f) => f.endsWith(".md") && f !== MAP);
const texts = new Map(cmemFiles.map((f) => [f, readFileSync(f, "utf8")]));

// 2026-10-23 (letter H19): the history was rewritten, so a baseline's text cites PRE-PURGE ids that
// no longer exist. Each is translated through the map, `| \`old\` | \`new\` | …`, to the id that
// replaced it, cut to the length the text wrote (the length the citation rewrite kept).
const renamed = new Map<string, string>();
try {
  for (const m of readFileSync(MAP, "utf8").matchAll(/^\| `([0-9a-f]+)` \| `([0-9a-f]+)` \|/gm)) renamed.set(m[1], m[2]);
} catch { /* no purge in this clone's history */ }
const current = (h: string) => {
  const hit = [...renamed].filter(([o]) => o.startsWith(h));
  return hit.length === 1 ? hit[0][1].slice(0, h.length) : h;
};

// --- 1. hashes -------------------------------------------------------------------------------
const hashes = [...new Set([...oldIndex.matchAll(/`([0-9a-f]{7,12})`/g)].map((m) => m[1]))];
let dropHash: string | null = null;
if (invert && hashes.length) {
  // Sabotage: erase one cited hash from every new file, in memory only.
  dropHash = hashes[0];
  // Both spellings: the citation may survive under its pre-purge id or the id that replaced it.
  for (const [f, t] of texts) texts.set(f, t.replaceAll(dropHash, "#######").replaceAll(current(dropHash), "#######"));
}
const corpus = [...texts.values()].join("\n");
const unresolved: string[] = [], lost: string[] = [];
let viaMap = 0;
for (const h of hashes) {
  const now = current(h);
  if (now !== h) viaMap++;
  if ((await git(["cat-file", "-e", `${now}^{commit}`])).code !== 0) unresolved.push(h);
  if (!corpus.includes(h) && !corpus.includes(now)) lost.push(h);
}
console.log(`1. hashes cited by the old INDEX: ${hashes.length}${viaMap ? ` (${viaMap} translated through the H19 history map)` : ""}`);
console.log(`   do not resolve in git: ${unresolved.length ? unresolved.join(" ") : "none"}`);
console.log(`   no longer cited anywhere in cmem/: ${lost.length ? lost.join(" ") : "none"}`);

// --- 2. links in the new top-level files -------------------------------------------------------
const brokenLinks: string[] = [];
for (const name of ["INDEX.md", "open-work.md", "working-rules.md"]) {
  const f = `${root}/cmem/${name}`;
  const t = texts.get(f);
  if (t === undefined) {
    brokenLinks.push(`${name}: FILE MISSING`);
    continue;
  }
  for (const m of t.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/.test(target)) continue; // http:, mailto:
    try {
      statSync(`${root}/cmem/${target}`);
    } catch {
      brokenLinks.push(`${name} → ${target}`);
    }
  }
}
if (invert) brokenLinks.push("(inversion) a link was expected to break"); // a check that cannot fail is no check
console.log(`2. broken links: ${brokenLinks.length ? brokenLinks.join(" · ") : "none"}`);

// --- 3. section references by name -------------------------------------------------------------
const headingsOf = (file: string) =>
  [...(texts.get(`${root}/cmem/${file}`) ?? "").matchAll(/^#{1,4} (.*)$/gm)].map((m) => m[1]);
const badRefs: string[] = [];
for (const f of walk(root).filter((p) => !p.includes("/.zig-cache/") && !p.includes("/zig-out/") && !p.includes("/.git/"))) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(INDEX|working-rules|open-work)\.md`? → ([A-Z][A-Z "'-]{2,})/g)) {
    const file = `${m[1]}.md`, name = m[2].trim().replace(/["']/g, "");
    if (!headingsOf(file).some((h) => h.toUpperCase().includes(name.split(" ")[0]))) badRefs.push(`${f.slice(root.length + 1)}: "${m[0]}"`);
  }
}
console.log(`3. section references that name a missing heading: ${badRefs.length ? "\n   " + badRefs.join("\n   ") : "none"}`);

const failed = unresolved.length + lost.length + brokenLinks.length + badRefs.length;
if (invert) {
  console.log(failed > 0 ? `\nINVERSION OK: the sabotage (hash ${dropHash} erased) was detected` : "\nINVERSION FAILED: the check cannot see a lost hash");
  process.exit(failed > 0 ? 0 : 1);
}
console.log(failed === 0 ? "\nALL CHECKS PASS" : `\n${failed} problem(s)`);
process.exit(failed === 0 ? 0 : 1);
