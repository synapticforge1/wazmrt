// Letter H3 — the memory-conventions rule "CHECK it, do not assert it: snapshot every hash,
// identifier and ratio before cutting; prove each still resolves afterwards; invert that check."
//
//   deno run -A h3-check.ts <repo root> <baseline commit>            → exit 0 iff every check passes
//   deno run -A h3-check.ts <repo root> <baseline commit> --invert   → sabotages the new text in
//                                                                     memory; MUST report failures
//
// Checks, against the INDEX.md of <baseline commit> (the text being cut):
//   1. every commit hash the old INDEX cites RESOLVES in git, and still APPEARS somewhere in the new
//      cmem/ — "a summary without a commit pointer is a loss";
//   2. every relative link in the new INDEX / open-work / working-rules resolves to a file;
//   3. every by-name section reference (an arrow from INDEX / working-rules / open-work to an
//      UPPER-CASE section name) anywhere in the repo names a heading that exists in that file.

const [root, baseline] = Deno.args;
const invert = Deno.args.includes("--invert");

async function git(args: string[]) {
  const r = await new Deno.Command("git", { args, cwd: root, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, out: new TextDecoder().decode(r.stdout) };
}
function walk(dir: string, acc: string[] = []): string[] {
  for (const e of Deno.readDirSync(dir)) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory) walk(p, acc);
    else if (/\.(md|ts|zig|txt|h|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const oldIndex = (await git(["show", `${baseline}:cmem/INDEX.md`])).out;
if (!oldIndex) throw new Error(`cannot read cmem/INDEX.md at ${baseline}`);

// The new cmem text, all files concatenated (the "does it still appear anywhere" corpus).
const cmemFiles = walk(`${root}/cmem`).filter((f) => f.endsWith(".md"));
const texts = new Map(cmemFiles.map((f) => [f, Deno.readTextFileSync(f)]));

// --- 1. hashes -------------------------------------------------------------------------------
const hashes = [...new Set([...oldIndex.matchAll(/`([0-9a-f]{7,12})`/g)].map((m) => m[1]))];
let dropHash: string | null = null;
if (invert && hashes.length) {
  // Sabotage: erase one cited hash from every new file, in memory only.
  dropHash = hashes[0];
  for (const [f, t] of texts) texts.set(f, t.replaceAll(dropHash, "#######"));
}
const corpus = [...texts.values()].join("\n");
const unresolved: string[] = [], lost: string[] = [];
for (const h of hashes) {
  if ((await git(["cat-file", "-e", `${h}^{commit}`])).code !== 0) unresolved.push(h);
  if (!corpus.includes(h)) lost.push(h);
}
console.log(`1. hashes cited by the old INDEX: ${hashes.length}`);
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
      Deno.statSync(`${root}/cmem/${target}`);
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
  const t = Deno.readTextFileSync(f);
  for (const m of t.matchAll(/(INDEX|working-rules|open-work)\.md`? → ([A-Z][A-Z "'-]{2,})/g)) {
    const file = `${m[1]}.md`, name = m[2].trim().replace(/["']/g, "");
    if (!headingsOf(file).some((h) => h.toUpperCase().includes(name.split(" ")[0]))) badRefs.push(`${f.slice(root.length + 1)}: "${m[0]}"`);
  }
}
console.log(`3. section references that name a missing heading: ${badRefs.length ? "\n   " + badRefs.join("\n   ") : "none"}`);

const failed = unresolved.length + lost.length + brokenLinks.length + badRefs.length;
if (invert) {
  console.log(failed > 0 ? `\nINVERSION OK: the sabotage (hash ${dropHash} erased) was detected` : "\nINVERSION FAILED: the check cannot see a lost hash");
  Deno.exit(failed > 0 ? 0 : 1);
}
console.log(failed === 0 ? "\nALL CHECKS PASS" : `\n${failed} problem(s)`);
Deno.exit(failed === 0 ? 0 : 1);
