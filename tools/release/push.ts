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
// `zig build test` green. Then it pushes THE COMMIT IT CHECKED to `refs/heads/main` — by its id,
// read once at the start (round 5: the gate takes minutes, and a commit made meanwhile must not go up
// unchecked) — with `--no-follow-tags` (round 1, B1), reads `main` back with `git ls-remote`, and
// checks that origin's tags did not change — after a FAILED push too (round 2, B2), since a hook can
// publish before it fails. The version moves ONE level from the released parent version, whose
// released commit is in the bump's history (round 5).
//
// Commits between `origin/main` and the bump that were not pushed yet go up with it: CI checks
// HEAD, which contains them, so that is intended — push them first if they should be checked alone.

import { edits, next, replaceOnce } from "./bump.ts";
import { type Run, runner } from "./spawn.ts";

export { type Run, runner };

const VERSION_LINE = /^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m;

/** Every failure ends in one `REFUSED:` line, a failed git command included (review round 7). */
export function main(argv: string[], cwd = process.cwd(), run: Run = runner(cwd)): number {
  const state = { pushAttempted: false };
  try {
    return checkedPush(argv, run, state); // every read is through git, at one commit id (round 5)
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    // After `git push` ran, "REFUSED" would claim nothing happened (round 7): say what is unknown.
    if (state.pushAttempted)
      console.error(`PUSH ATTEMPTED, then: ${why}\n  origin/main may have moved and CI may be running — read it: git ls-remote origin refs/heads/main`);
    else console.error(`REFUSED: ${why}`);
    return 1;
  }
}

function checkedPush(argv: string[], run: Run, state: { pushAttempted: boolean }): number {
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
  // 🔒 Every check below reads THIS commit, and this commit is what is pushed (round 5).
  const head = git("rev-parse", "--verify", "HEAD");
  if (!run("git", ["merge-base", "--is-ancestor", "origin/main", head]).ok)
    return refuse("origin/main is not an ancestor of HEAD; merge or rebase first, never force");

  const show = (spec: string): string | null => {
    const r = run("git", ["show", spec]);
    return r.ok ? (r.raw ?? r.out) : null;
  };
  const version = show(`${head}:src/root.zig`)?.match(VERSION_LINE)?.[1];
  if (!version) return refuse("src/root.zig: no version line");
  const tag = `v${version}`;
  // The subject from the raw commit object (no `--format=%s`: `%` cannot pass through cmd.exe, spawn.ts).
  const commit = git("cat-file", "commit", head);
  const subject = (commit.split(/\r?\n\r?\n/)[1] ?? "").split(/\r?\n/)[0].trim();
  if (subject !== `bump to ${tag}`) return refuse(`HEAD is "${subject}", not the bump commit "bump to ${tag}" (bun tools/release/bump.ts <level>)`);

  // The bump commit is the four version edits and nothing else (U2; round 2, B3), compared on the
  // RAW contents (round 3, B1). A file missing from the parent is a refusal, not a crash.
  const prevRoot = show(`${head}~1:src/root.zig`);
  const prev = prevRoot?.match(VERSION_LINE)?.[1];
  if (!prev) return refuse("HEAD~1:src/root.zig is missing or has no version line; the bump commit's parent is not a release tree");
  // ONE level up from the parent (round 5): what `bump.ts` makes; a hand-made commit must match.
  const levels = (["patch", "minor", "major"] as const).map((l) => next(prev, l));
  if (!levels.includes(version)) return refuse(`v${prev} -> v${version} is not one level up (expected one of ${levels.map((v) => `v${v}`).join(", ")})`);
  // The parent is the RELEASED version, so the bump is one step from a release (round 3, B4) — and
  // that release's commit is in the bump's history (round 5), not a tag made elsewhere.
  // The whole listing: a pattern hides the peeled `^{}` line, and `^` cannot pass through cmd.exe.
  const originTags = git("ls-remote", "--tags", "origin").split("\n").map((l) => l.trim().split(/\s+/));
  const prevRef = `refs/tags/v${prev}`;
  const released = (originTags.find((l) => l[1] === `${prevRef}^{}`) ?? originTags.find((l) => l[1] === prevRef))?.[0];
  if (!released) return refuse(`the bump commit's parent is v${prev}, which was never released (no tag on origin)`);
  if (!run("git", ["merge-base", "--is-ancestor", released, head]).ok)
    return refuse(`v${prev}'s released commit ${released} is not in the bump commit's history`);
  const plan = edits(prev, version);
  const four = plan.map((e) => e[0]).sort();
  const raw = git("diff-tree", "--no-commit-id", "-r", head).split("\n").filter(Boolean);
  const changed = raw.map((l) => l.split("\t")[1]).sort();
  if (changed.join(",") !== four.join(","))
    return refuse(`the bump commit changes [${changed.join(", ")}], not exactly the four version places [${four.join(", ")}]`);
  for (const line of raw) {
    const [srcMode, dstMode] = line.slice(1).split(" ");
    if (srcMode !== dstMode) return refuse(`the bump commit changes a file mode: ${line}`);
  }
  for (const [file, old, neu] of plan) {
    const before = show(`${head}~1:${file}`);
    const after = show(`${head}:${file}`);
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

  console.log(`push: ${tag} at ${head}; running the gate`);
  const gate = run("zig", ["build", "test", "--summary", "all"], true);
  if (gate.missing) return refuse("`zig` is not on PATH");
  if (!gate.ok) return refuse("`zig build test` failed");
  // The gate built the WORKING TREE: it must still be this commit's (round 5).
  if (git("rev-parse", "--verify", "HEAD") !== head) return refuse(`HEAD moved during the gate (was ${head}); run push.ts again`);
  const dirtyAfter = git("status", "--porcelain", "--untracked-files=all");
  if (dirtyAfter) return refuse(`the tree changed during the gate:\n${dirtyAfter}`);

  if (dryRun) {
    console.log(`dry run: every guard passed; would push ${head} to refs/heads/main and no tag`);
    return 0;
  }
  const tagsBefore = git("ls-remote", "--tags", "origin");
  state.pushAttempted = true;
  const push = run("git", ["push", "--no-follow-tags", "origin", `${head}:refs/heads/main`], true);
  // Compared whether or not the push succeeded: a hook can publish a tag and then fail (B2).
  const tagsAfter = git("ls-remote", "--tags", "origin");
  if (tagsAfter !== tagsBefore) {
    console.error(`ALERT: origin's tags changed during the push — a tag was published that CI did not make:\n${tagsAfter}`);
    return 1;
  }
  const remote = git("ls-remote", "origin", "refs/heads/main").split(/\s+/)[0];
  // A failed push can still have moved main (a hook that fails after the update): say where it is.
  if (!push.ok) return refuse(`git push failed; origin's tags are unchanged, origin/main is now ${remote}${remote === head ? " (= the bump: CI will run on it)" : ""}`);
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
