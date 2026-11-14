// tools/release/bump.ts — the bump, as its own commit, made by the tooling (workspace
// `release-process.md` § 5, U2 / U3). The level is the OWNER's and is an argument; there is no default.
//
//   bun tools/release/bump.ts <patch|minor|major>
//
// Refuses a dirty tree (untracked files count), any branch but `main`, and a current version that
// was never released (a second bump would skip a number). Moves the version in the four places
// (`cmem/releasing.md` → WHERE THE NUMBER LIVES), each edit matching EXACTLY once, then runs
// `zig build test`: the surface gate inside it refuses a level below the floor, and
// `version_agreement` refuses places that disagree. 🔒 On ANY failure after the first write the four
// files are restored, staged or not (review round 1, B4). It commits `bump to vX.Y.Z` and pushes
// nothing (that is `push.ts`). Set ZIG_LOCAL_CACHE_DIR to an NTFS path when the repo is on the exFAT
// drive (`cmem/working-rules.md`).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { releaseNotes } from "./github.ts";
import { type Run, runner } from "./spawn.ts";

export type Level = "patch" | "minor" | "major";
export type { Run };

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

/** One turn of the event loop: where a Ctrl-C that arrived meanwhile is actually delivered. */
const checkpoint = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * 🔒 Ctrl-C (review rounds 3 and 4). A signal handler runs only when the event loop turns, and
 * `spawnSync` blocks it — so a handler registered around the gate alone never saw a real Ctrl-C
 * (round 4, B1), and one outside that window let a Ctrl-C kill Bun mid-write (B2). Now: the handler
 * covers the whole window from the first write to the commit; `main` yields at checkpoints (after the
 * writes, after the gate, before the commit) so a Ctrl-C is SEEN there and refused + restored; the
 * gate's own interrupt exit status counts too; a SECOND Ctrl-C restores at once and exits 130 (B3).
 */
export async function main(argv: string[], cwd = process.cwd(), run: Run = runner(cwd), exit: (code: number) => never = process.exit): Promise<number> {
  // Every failure ends in one `REFUSED:` line — one before the first write (a git command, a place
  // without its pattern) included (review round 7). After the first write, `checkedBump` refuses and
  // restores itself.
  try {
    return await checkedBump(argv, cwd, run, exit);
  } catch (err) {
    console.error(`REFUSED: ${err instanceof Error ? err.message : err}`);
    return 1;
  }
}

async function checkedBump(argv: string[], cwd: string, run: Run, exit: (code: number) => never): Promise<number> {
  const git = (...args: string[]) => {
    const r = run("git", args);
    if (!r.ok) throw new Error(`git ${args.join(" ")}: ${r.err}`);
    return r.out;
  };
  const refuse = (why: string) => {
    console.error(`REFUSED: ${why}`);
    return 1;
  };
  const level = argv[0] as Level;
  if (!["patch", "minor", "major"].includes(level)) {
    console.error("usage: bun tools/release/bump.ts <patch|minor|major>   (the level is the owner's; no default)");
    return 2;
  }
  const dirty = git("status", "--porcelain", "--untracked-files=all");
  if (dirty) return refuse(`the tree is not clean (untracked files count):\n${dirty}`);
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") return refuse(`on ${branch}; a release is bumped on main, after the merge (U2)`);
  const from = readFileSync(join(cwd, "src/root.zig"), "utf8").match(/^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m)?.[1];
  if (!from) return refuse("src/root.zig: no version line");
  if (!git("ls-remote", "--tags", "origin", `refs/tags/v${from}`))
    return refuse(`v${from} was never released (no tag on origin); release it, or the next bump would skip a number`);
  const to = next(from, level);
  // 🔒 The release notes FIRST (round 11): CI reads them from the bump commit only AFTER it has
  // made the tag — a missing or misshapen entry there leaves a published tag with no page and no
  // clean way back. The entry is written before the bump (`releasing.md` step 10).
  try {
    releaseNotes(readFileSync(join(cwd, "cmem/release.md"), "utf8"), to, "?");
  } catch (err) {
    return refuse(`the release notes for ${to}: ${err instanceof Error ? err.message : err} — write them first (cmem/releasing.md step 10)`);
  }
  const plan = edits(from, to);
  const files = plan.map((p) => p[0]);

  // Compute every edit before writing any, so a mismatch leaves all four files untouched.
  const originals = new Map(files.map((f) => [f, readFileSync(join(cwd, f), "utf8")] as const));
  const written = plan.map(([file, old, neu]) => [file, replaceOnce(originals.get(file)!, old, neu, file)] as const);
  // Restore on EVERY failure path, staged or not: unstage, then check out the committed text — and
  // SAY whether it worked, by re-reading the files (round 2, B1). An unreadable file counts as
  // still edited (round 3).
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    // A runner that THROWS (cmd.exe gone, a refused argument) is a failed step here, never an
    // escape past the RESTORE FAILED message (round 7).
    const attempt = (args: string[]) => {
      try {
        return run("git", args);
      } catch (err) {
        return { ok: false, out: "", err: err instanceof Error ? err.message : String(err) };
      }
    };
    const reset = attempt(["reset", "-q", "--", ...files]);
    const checkout = attempt(["checkout", "--", ...files]);
    const still = files.filter((f) => {
      try {
        return readFileSync(join(cwd, f), "utf8") !== originals.get(f);
      } catch {
        return true;
      }
    });
    if (reset.ok && checkout.ok && still.length === 0) console.error("bump: the four places are restored");
    else
      console.error(
        `bump: RESTORE FAILED — ${still.length ? `still edited: ${still.join(", ")}` : "the files read back unchanged, but git refused to unstage them"}` +
          `${reset.ok ? "" : `\n  git reset: ${reset.err}`}${checkout.ok ? "" : `\n  git checkout: ${checkout.err}`}` +
          `\n  fix by hand: git reset -q -- ${files.join(" ")} && git checkout -- ${files.join(" ")}` +
          `\n  (if git says .git/index.lock exists and no git is running, a killed git left it: delete it first)`,
      );
  };

  let interrupts = 0;
  const onInterrupt = () => {
    interrupts++;
    if (interrupts >= 2) {
      // A second Ctrl-C means "stop NOW" (round 4, B3): restore first, then leave.
      console.error("bump: interrupted twice — restoring and stopping");
      restore();
      exit(130);
    }
  };
  const interruptedAt = async (where: string): Promise<string | null> => {
    await checkpoint();
    return interrupts > 0 ? `interrupted ${where}` : null;
  };

  /** Did a commit `bump to v<to>` land on top of `before`? Read from the raw object (no `%`: spawn.ts). */
  const landed = (before: string): boolean => {
    const now = run("git", ["rev-parse", "HEAD"]);
    if (!now.ok || now.out === before) return false;
    const obj = run("git", ["cat-file", "commit", "HEAD"]);
    const subject = obj.ok ? (obj.out.split(/\r?\n\r?\n/)[1] ?? "").split(/\r?\n/)[0].trim() : "";
    const parent = run("git", ["rev-parse", "HEAD~1"]);
    return subject === `bump to v${to}` && parent.ok && parent.out === before;
  };

  let committed = false;
  process.on("SIGINT", onInterrupt); // the WHOLE window, first write to commit (round 4, B2)
  try {
    for (const [file, text] of written) writeFileSync(join(cwd, file), text);
    console.log(`bump: ${from} -> ${to} (${level}) in ${files.join(", ")}`);
    let why = await interruptedAt("after the writes");
    if (why) return refuse(why);
    const gate = run("zig", ["build", "test", "--summary", "all"], true);
    why = await interruptedAt("during the gate");
    if (why || gate.interrupted) return refuse(why ?? "interrupted during the gate (zig ended by Ctrl-C)");
    if (gate.missing) return refuse("`zig` is not on PATH");
    if (!gate.ok)
      return refuse(`\`zig build test\` failed with ${to}. A surface refusal is answered by a bigger level, never by editing a snapshot.`);
    // Each place now holds the new version once and the old one not at all.
    for (const [file, old, neu] of plan) {
      const text = readFileSync(join(cwd, file), "utf8");
      if (text.split(neu).length - 1 !== 1 || text.includes(old)) return refuse(`${file}: the version did not move cleanly`);
    }
    git("add", "--", ...files);
    why = await interruptedAt("before the commit");
    if (why) return refuse(why);
    const head = git("rev-parse", "HEAD");
    const commit = run("git", ["commit", "-m", `bump to v${to}`]);
    if (!commit.ok) {
      // git can WRITE the commit and still report a failure (a Ctrl-C mid-commit, a failing
      // post-commit step). Then the bump is done: restoring would undo nothing and say RESTORE
      // FAILED, and REFUSED would claim nothing happened (round 8). Read what HEAD is now.
      if (!landed(head)) throw new Error(`git commit -m bump to v${to}: ${commit.err}`);
      console.error(`bump: git reported a failure (${commit.err || "no message"}), but the commit WAS made`);
    }
    committed = true;
  } catch (err) {
    return refuse(err instanceof Error ? err.message : String(err));
  } finally {
    // Restore FIRST, with the handler still installed (round 5, A3): with no listener, a Ctrl-C
    // during the restore takes Bun's default action and kills it, leaving the files edited, unsaid.
    try {
      if (!committed) restore();
    } finally {
      process.off("SIGINT", onInterrupt);
    }
  }
  // The commit is MADE: nothing after this may say REFUSED (round 7) — a failing `git log` only
  // loses the summary line.
  let summary: string;
  try {
    const r = run("git", ["log", "--oneline", "-1"]);
    summary = r.ok ? r.out : `bump to v${to} (git log failed: ${r.err})`;
  } catch (err) {
    summary = `bump to v${to} (git log failed: ${err instanceof Error ? err.message : err})`;
  }
  console.log(`committed: ${summary}  (nothing pushed; next: bun tools/release/push.ts)`);
  return 0;
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`bump.ts: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    },
  );
}
