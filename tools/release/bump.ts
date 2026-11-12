// tools/release/bump.ts — the bump, as its own commit, made by the tooling (workspace
// `release-process.md` § 5, U2 / U3). The level is the OWNER's and is an argument; there is no default.
//
//   bun tools/release/bump.ts <patch|minor|major>
//
// Refuses a dirty tree (untracked files count) and any branch but `main`. Moves the version in the
// four places (`cmem/releasing.md` → WHERE THE NUMBER LIVES), each edit matching EXACTLY once, then
// runs `zig build test`: the surface gate inside it refuses a level below the floor, and
// `version_agreement` refuses places that disagree. On any failure the four files are restored.
// It commits `bump to vX.Y.Z` and pushes nothing (that is `push.ts`). Set ZIG_LOCAL_CACHE_DIR to an
// NTFS path when the repo is on the exFAT drive (`cmem/working-rules.md`).

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

export type Level = "patch" | "minor" | "major";

export function next(version: string, level: Level): string {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`not a version: ${version}`);
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (level === "major") return `${maj + 1}.0.0`;
  if (level === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

/** The four places, each as [file, the old text, the new text]. */
export function edits(from: string, to: string): [string, string, string][] {
  return [
    ["src/root.zig", `pub const version: [:0]const u8 = "${from}";`, `pub const version: [:0]const u8 = "${to}";`],
    ["build.zig.zon", `.version = "${from}",`, `.version = "${to}",`],
    ["include/wazmrt.h", `/* e.g. "${from}";`, `/* e.g. "${to}";`],
    ["cmem/overview.md", `(name .wazmrt, v${from},`, `(name .wazmrt, v${to},`],
  ];
}

/** Replace `old` with `neu` in `text`, refusing anything but exactly one match. */
export function replaceOnce(text: string, old: string, neu: string, file: string): string {
  const count = text.split(old).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one "${old}", found ${count}`);
  return text.replace(old, neu);
}

function git(...args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

function main(argv: string[]): number {
  const level = argv[0] as Level;
  if (!["patch", "minor", "major"].includes(level)) {
    console.error("usage: bun tools/release/bump.ts <patch|minor|major>   (the level is the owner's; no default)");
    return 2;
  }
  const dirty = git("status", "--porcelain", "--untracked-files=all");
  if (dirty) {
    console.error(`REFUSED: the tree is not clean (untracked files count):\n${dirty}`);
    return 1;
  }
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") {
    console.error(`REFUSED: on ${branch}; a release is bumped on main, after the merge (U2)`);
    return 1;
  }
  const from = readFileSync("src/root.zig", "utf8").match(/^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m)?.[1];
  if (!from) throw new Error("src/root.zig: no version line");
  const to = next(from, level);
  const plan = edits(from, to);

  // Compute every edit before writing any, so a mismatch leaves all four files untouched.
  const written = plan.map(([file, old, neu]) => [file, replaceOnce(readFileSync(file, "utf8"), old, neu, file)] as const);
  for (const [file, text] of written) writeFileSync(file, text);
  console.log(`bump: ${from} -> ${to} (${level}) in ${plan.map((p) => p[0]).join(", ")}`);

  const gate = spawnSync("zig", ["build", "test", "--summary", "all"], { stdio: "inherit" });
  if (gate.status !== 0) {
    git("checkout", "--", ...plan.map((p) => p[0]));
    console.error(`REFUSED: \`zig build test\` failed with ${to}; the four places are restored. A surface refusal is answered by a bigger level, never by editing a snapshot.`);
    return 1;
  }
  for (const [file] of plan) {
    if (readFileSync(file, "utf8").includes(`"${from}"`) && file !== "cmem/overview.md") {
      console.error(`REFUSED: ${file} still names ${from}`);
      return 1;
    }
  }
  git("add", "--", ...plan.map((p) => p[0]));
  git("commit", "-m", `bump to v${to}`);
  console.log(`committed: ${git("log", "--oneline", "-1")}  (nothing pushed; next: bun tools/release/push.ts)`);
  return 0;
}

if (import.meta.main) process.exit(main(Bun.argv.slice(2)));
