// tools/release/push.ts — the one release command (workspace `release-process.md` § 5, U4).
// It pushes `main` and NOTHING ELSE: CI checks that commit, then CI makes the tag and the Release
// page (owner's order, 2026-11-10). 🚫 No local tag, ever; never `git tag -f`, never a forced push.
//
//   bun tools/release/push.ts [--dry-run]
//
// Guards, all before the push: a clean tree (untracked files count); on `main`; `origin/main` is an
// ancestor of HEAD (fetched first); HEAD is the bump commit `bump to vX.Y.Z` for `src/root.zig`'s
// version; the tag vX.Y.Z exists neither locally nor on origin; `zig build test` green. Then it
// pushes `main` and reads it back with `git ls-remote`.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[], inherit = false): { ok: boolean; out: string; err: string } {
  const r = spawnSync(cmd, args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
  return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() };
}

function git(...args: string[]): string {
  const r = run("git", args);
  if (!r.ok) throw new Error(`git ${args.join(" ")}: ${r.err}`);
  return r.out;
}

function refuse(why: string): number {
  console.error(`REFUSED: ${why}`);
  return 1;
}

function main(argv: string[]): number {
  const dryRun = argv.includes("--dry-run");
  const dirty = git("status", "--porcelain", "--untracked-files=all");
  if (dirty) return refuse(`the tree is not clean (untracked files count):\n${dirty}`);
  if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") return refuse("not on main");
  git("fetch", "origin");
  if (!run("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"]).ok)
    return refuse("origin/main is not an ancestor of HEAD; merge or rebase first, never force");

  const version = readFileSync("src/root.zig", "utf8").match(/^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m)?.[1];
  if (!version) return refuse("src/root.zig: no version line");
  const tag = `v${version}`;
  const subject = git("log", "-1", "--format=%s");
  if (subject !== `bump to ${tag}`) return refuse(`HEAD is "${subject}", not the bump commit "bump to ${tag}" (bun tools/release/bump.ts <level>)`);
  if (git("tag", "-l", tag)) return refuse(`a local tag ${tag} exists; CI makes the tag — delete the local one`);
  if (git("ls-remote", "--tags", "origin", `refs/tags/${tag}`)) return refuse(`${tag} already exists on origin; a published tag never moves`);

  console.log(`push: ${tag} at ${git("rev-parse", "HEAD")}; running the gate`);
  if (!run("zig", ["build", "test", "--summary", "all"], true).ok) return refuse("`zig build test` failed");

  if (dryRun) {
    console.log(`dry run: every guard passed; would push main (${git("rev-parse", "HEAD")}) and no tag`);
    return 0;
  }
  const push = run("git", ["push", "origin", "main"], true);
  if (!push.ok) return refuse("git push origin main failed");
  const head = git("rev-parse", "HEAD");
  const remote = git("ls-remote", "origin", "refs/heads/main").split(/\s+/)[0];
  if (remote !== head) return refuse(`read-back: origin/main is ${remote}, expected ${head}`);
  console.log(`pushed main = ${head} (read back with ls-remote). CI now checks it, tags ${tag} and makes the Release page.`);
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(main(Bun.argv.slice(2)));
  } catch (err) {
    console.error(`push.ts: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
