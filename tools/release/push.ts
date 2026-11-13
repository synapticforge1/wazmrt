// tools/release/push.ts — the one release command (workspace `release-process.md` § 5, U4).
// It pushes `main` and NOTHING ELSE: CI checks that commit, then CI makes the tag and the Release
// page (owner's order, 2026-11-10). 🚫 No local tag, ever; never `git tag -f`, never a forced push.
//
//   bun tools/release/push.ts [--dry-run]
//
// Guards, all before the push: a clean tree (untracked files count); on `main`; `origin/main` is an
// ancestor of HEAD (fetched first); HEAD is the bump commit `bump to vX.Y.Z` for `src/root.zig`'s
// version, and it is EXACTLY the four version edits — each file at the parent with its one edit
// applied equals the file at HEAD, no mode changed, nothing else (review round 2, B3); the tag
// vX.Y.Z exists neither on origin nor locally; the push URL is the URL the read-back reads;
// `zig build test` green. Then it pushes `refs/heads/main` alone, with `--no-follow-tags` (round 1,
// B1), reads `main` back with `git ls-remote`, and checks that origin's tags did not change — after
// a FAILED push too (round 2, B2), since a hook can publish before it fails.
//
// Commits between `origin/main` and the bump that were not pushed yet go up with it: CI checks
// HEAD, which contains them, so that is intended — push them first if they should be checked alone.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { edits, replaceOnce } from "./bump.ts";

// `out` is trimmed for convenience; `raw` is the stdout exactly as written, for comparing file
// CONTENTS (review round 3, B1: a trimmed comparison could not see whitespace at either end).
export type Run = (cmd: string, args: string[], inherit?: boolean) => { ok: boolean; out: string; err: string; missing?: boolean; raw?: string };

export function runner(cwd: string): Run {
  return (cmd, args, inherit = false) => {
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
    const missing = (r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
    return { ok: r.status === 0, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim(), missing, raw: r.stdout ?? "" };
  };
}

const VERSION_LINE = /^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m;

export function main(argv: string[], cwd = process.cwd(), run: Run = runner(cwd)): number {
  const git = (...args: string[]) => {
    const r = run("git", args);
    if (!r.ok) throw new Error(`git ${args.join(" ")}: ${r.err}`);
    return r.out;
  };
  const refuse = (why: string) => {
    console.error(`REFUSED: ${why}`);
    return 1;
  };
  const dryRun = argv.includes("--dry-run");

  const dirty = git("status", "--porcelain", "--untracked-files=all");
  if (dirty) return refuse(`the tree is not clean (untracked files count):\n${dirty}`);
  if (git("rev-parse", "--abbrev-ref", "HEAD") !== "main") return refuse("not on main");
  git("fetch", "origin");
  if (!run("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"]).ok)
    return refuse("origin/main is not an ancestor of HEAD; merge or rebase first, never force");

  const version = readFileSync(join(cwd, "src/root.zig"), "utf8").match(VERSION_LINE)?.[1];
  if (!version) return refuse("src/root.zig: no version line");
  const tag = `v${version}`;
  const subject = git("log", "-1", "--format=%s");
  if (subject !== `bump to ${tag}`) return refuse(`HEAD is "${subject}", not the bump commit "bump to ${tag}" (bun tools/release/bump.ts <level>)`);

  // The bump commit is the four version edits and nothing else (U2; round 2, B3), compared on the
  // RAW contents (round 3, B1). A file missing from the parent is a refusal, not a crash.
  const show = (spec: string): string | null => {
    const r = run("git", ["show", spec]);
    return r.ok ? (r.raw ?? r.out) : null;
  };
  const prevRoot = show("HEAD~1:src/root.zig");
  const prev = prevRoot?.match(VERSION_LINE)?.[1];
  if (!prev) return refuse("HEAD~1:src/root.zig is missing or has no version line; the bump commit's parent is not a release tree");
  // The parent is the RELEASED version, so the bump is one step from a release (round 3, B4):
  // `bump.ts` checks this; a hand-made bump commit must too.
  if (!git("ls-remote", "--tags", "origin", `refs/tags/v${prev}`))
    return refuse(`the bump commit's parent is v${prev}, which was never released (no tag on origin)`);
  const plan = edits(prev, version);
  const four = plan.map((e) => e[0]).sort();
  const raw = git("diff-tree", "--no-commit-id", "-r", "HEAD").split("\n").filter(Boolean);
  const changed = raw.map((l) => l.split("\t")[1]).sort();
  if (changed.join(",") !== four.join(","))
    return refuse(`the bump commit changes [${changed.join(", ")}], not exactly the four version places [${four.join(", ")}]`);
  for (const line of raw) {
    const [srcMode, dstMode] = line.slice(1).split(" ");
    if (srcMode !== dstMode) return refuse(`the bump commit changes a file mode: ${line}`);
  }
  for (const [file, old, neu] of plan) {
    const before = show(`HEAD~1:${file}`);
    const after = show(`HEAD:${file}`);
    if (before === null || after === null) return refuse(`${file} is missing from the bump commit or its parent`);
    let expected: string;
    try {
      expected = replaceOnce(before, old, neu, file);
    } catch (err) {
      return refuse(`the bump commit's parent: ${err instanceof Error ? err.message : err}`);
    }
    if (after !== expected) return refuse(`${file}: the bump commit changes more than the version line`);
  }

  // Origin first: `git fetch` copies origin's tags down, so a local tag is usually origin's (B6).
  if (git("ls-remote", "--tags", "origin", `refs/tags/${tag}`)) return refuse(`${tag} already exists on origin; a published tag never moves`);
  if (git("tag", "-l", tag)) return refuse(`a local tag ${tag} exists (not on origin); CI makes the tag — delete the local one`);
  const fetchUrl = git("remote", "get-url", "origin");
  const pushUrl = git("remote", "get-url", "--push", "origin");
  if (pushUrl !== fetchUrl) return refuse(`origin's push URL (${pushUrl}) is not its fetch URL (${fetchUrl}); the read-back would read another repository`);

  console.log(`push: ${tag} at ${git("rev-parse", "HEAD")}; running the gate`);
  const gate = run("zig", ["build", "test", "--summary", "all"], true);
  if (gate.missing) return refuse("`zig` is not on PATH");
  if (!gate.ok) return refuse("`zig build test` failed");

  if (dryRun) {
    console.log(`dry run: every guard passed; would push refs/heads/main (${git("rev-parse", "HEAD")}) and no tag`);
    return 0;
  }
  const tagsBefore = git("ls-remote", "--tags", "origin");
  const push = run("git", ["push", "--no-follow-tags", "origin", "refs/heads/main:refs/heads/main"], true);
  // Compared whether or not the push succeeded: a hook can publish a tag and then fail (B2).
  const tagsAfter = git("ls-remote", "--tags", "origin");
  if (tagsAfter !== tagsBefore) {
    console.error(`ALERT: origin's tags changed during the push — a tag was published that CI did not make:\n${tagsAfter}`);
    return 1;
  }
  if (!push.ok) return refuse("git push origin main failed (origin's tags are unchanged)");
  const head = git("rev-parse", "HEAD");
  const remote = git("ls-remote", "origin", "refs/heads/main").split(/\s+/)[0];
  if (remote !== head) return refuse(`read-back: origin/main is ${remote}, expected ${head}`);
  console.log(`pushed main = ${head} (read back with ls-remote; origin's tags unchanged). CI now checks it, tags ${tag} and makes the Release page.`);
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
