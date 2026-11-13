// push.ts and bump.ts end to end, in a throwaway git repo with a local bare remote (review round 1,
// B8; round 2, B5). `zig` is faked through the injected runner; git is real, and ISOLATED from the
// machine's git config (no global, no system config), so a global `tag.gpgSign`, `core.hooksPath`
// or `init.defaultBranch` cannot change a verdict. Each guard has a case that only it can refuse.
// Run: `bun test tools/release`.
import { afterAll, afterEach, beforeAll, describe, expect, setDefaultTimeout, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";
import { main as bump } from "./bump.ts";
import { main as push, runner, type Run } from "./push.ts";

// Real git, ~40-50 ms a call on Windows, 30+ calls a case: Bun's 5 s default was already close
// (round 5: one case timed out at 5.0 s once the runner went through cmd.exe).
setDefaultTimeout(60_000);

const dirs: string[] = [];
const savedEnv = { GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL, GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM };
beforeAll(() => {
  const d = mkdtempSync(join(tmpdir(), "wazmrt-gitcfg-"));
  dirs.push(d);
  writeFileSync(join(d, "empty.gitconfig"), "");
  process.env.GIT_CONFIG_GLOBAL = join(d, "empty.gitconfig");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const repos: string[] = [];
afterEach(() => {
  for (const d of repos.splice(0)) rmSync(d, { recursive: true, force: true });
});

function sh(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

const FILES: Record<string, (v: string) => string> = {
  "src/root.zig": (v) => `// root\npub const version: [:0]const u8 = "${v}";\n`,
  "build.zig.zon": (v) => `.{\n    .version = "${v}",\n}\n`,
  "include/wazmrt.h": (v) => `const char *wazmrt_version_string(void);  /* e.g. "${v}"; static */\n`,
  "cmem/overview.md": (v) => `├── build.zig.zon # (name .wazmrt, v${v}, min zig 0.17.1)\n`,
};

/** A repo at version `v`, released (tag v<v> on origin) unless `released` is false. */
function repo(v = "5.0.1", released = true) {
  const root = mkdtempSync(join(tmpdir(), "wazmrt-release-test-"));
  repos.push(root);
  const remote = join(root, "remote.git");
  const work = join(root, "work");
  sh(root, "init", "-q", "--bare", remote);
  sh(root, "init", "-q", "-b", "main", work);
  sh(work, "config", "user.name", "t");
  sh(work, "config", "user.email", "t@example.invalid");
  sh(work, "remote", "add", "origin", remote);
  for (const [f, body] of Object.entries(FILES)) {
    mkdirSync(join(work, f, ".."), { recursive: true });
    writeFileSync(join(work, f), body(v));
  }
  writeFileSync(join(work, "README.md"), "readme\n");
  sh(work, "add", ".");
  sh(work, "commit", "-q", "-m", "start");
  sh(work, "push", "-q", "origin", "main");
  if (released) {
    sh(work, "tag", "-a", `v${v}`, "-m", "released");
    sh(work, "push", "-q", "origin", `v${v}`);
    sh(work, "tag", "-d", `v${v}`);
  }
  return { root, remote, work };
}

/** The real runner, with `zig` faked and optional hooks on particular git calls. */
function fake(cwd: string, zig: "ok" | "fail" | "missing" = "ok", hook?: (args: string[]) => ReturnType<Run> | void): Run {
  const real = runner(cwd);
  return (cmd, args) => {
    if (cmd === "zig") return { ok: zig === "ok", out: "", err: "", missing: zig === "missing" };
    if (cmd === "git" && hook) {
      const r = hook(args);
      if (r) return r;
    }
    return real(cmd, args, false);
  };
}

const read = (work: string, f: string) => readFileSync(join(work, f), "utf8");
const remoteTags = (work: string) => sh(work, "ls-remote", "--tags", "origin");
const remoteMain = (work: string) => sh(work, "ls-remote", "origin", "refs/heads/main");
const FAIL = { ok: false, out: "", err: "refused by the test" };

/** Run `f` with console.error captured; returns [result, everything printed to stderr]. */
async function captured<T>(f: () => T | Promise<T>): Promise<[T, string]> {
  const spy = spyOn(console, "error").mockImplementation(() => {});
  try {
    const r = await f();
    return [r, spy.mock.calls.map((c) => c.join(" ")).join("\n")];
  } finally {
    spy.mockRestore();
  }
}

/** The exit code of `f`, with stderr captured. */
const code = async (f: () => number | Promise<number>) => (await captured(f))[0];

/** A Ctrl-C delivered the way the console delivers it: queued, handled at the next turn of the
 *  event loop — not synchronously (round 4, B1: a synchronous `process.emit` hid the real ordering). */
const ctrlC = () => setImmediate(() => process.emit("SIGINT"));

describe("bump.ts", () => {
  test("bumps the four places, gate green, one commit of exactly those files", async () => {
    const { work } = repo();
    expect(await bump(["patch"], work, fake(work))).toBe(0);
    expect(sh(work, "log", "-1", "--format=%s")).toBe("bump to v5.0.2");
    expect(sh(work, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").split("\n").sort()).toEqual(Object.keys(FILES).sort());
    for (const [f, body] of Object.entries(FILES)) expect(read(work, f)).toBe(body("5.0.2"));
  });
  test("no level: usage, exit 2, nothing written", async () => {
    const { work } = repo();
    expect(await code(() => bump([], work, fake(work)))).toBe(2);
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("a dirty tree (untracked counts): refused", async () => {
    const { work } = repo();
    writeFileSync(join(work, "stray.txt"), "x");
    expect(await code(() => bump(["patch"], work, fake(work)))).toBe(1);
    expect(read(work, "src/root.zig")).toBe(FILES["src/root.zig"]("5.0.1"));
  });
  test("a git command failing before any write: a REFUSED line, not a thrown error (round 7)", async () => {
    const { work } = repo();
    const noStatus = fake(work, "ok", (a) => (a[0] === "status" ? FAIL : undefined));
    const [r, err] = await captured(() => bump(["patch"], work, noStatus));
    expect(r).toBe(1);
    expect(err).toContain("REFUSED: git status");
  });
  test("not on main: refused", async () => {
    const { work } = repo();
    sh(work, "checkout", "-q", "-b", "side");
    expect(await code(() => bump(["patch"], work, fake(work)))).toBe(1);
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("the current version was never released: refused (a second bump would skip a number)", async () => {
    const { work } = repo("5.0.1", false);
    expect(await code(() => bump(["patch"], work, fake(work)))).toBe(1);
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("a place without its pattern: refused before ANY file is written", async () => {
    const { work } = repo();
    writeFileSync(join(work, "include/wazmrt.h"), "/* no version here */\n");
    sh(work, "commit", "-q", "-am", "drop the header example");
    const [r, err] = await captured(() => bump(["patch"], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("REFUSED: include/wazmrt.h: expected exactly one"); // a refusal, not a throw (round 7)
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("the gate fails: the four files are restored, nothing staged, no commit, and it SAYS restored (B4)", async () => {
    const { work } = repo();
    const [r, err] = await captured(() => bump(["patch"], work, fake(work, "fail")));
    expect(r).toBe(1);
    expect(err).toContain("the four places are restored");
    expect(sh(work, "status", "--porcelain")).toBe("");
    expect(sh(work, "log", "-1", "--format=%s")).toBe("start");
  });
  test("zig missing: refused by name", async () => {
    const { work } = repo();
    const [r, err] = await captured(() => bump(["patch"], work, fake(work, "missing")));
    expect(r).toBe(1);
    expect(err).toContain("`zig` is not on PATH");
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("`git commit` fails: restored and unstaged, not left half-done (B4)", async () => {
    const { work } = repo();
    const failCommit = fake(work, "ok", (a) => (a[0] === "commit" ? FAIL : undefined));
    expect(await code(() => bump(["patch"], work, failCommit))).toBe(1);
    expect(sh(work, "status", "--porcelain")).toBe("");
    expect(sh(work, "log", "-1", "--format=%s")).toBe("start");
  });
  test("the restore ITSELF fails: it says RESTORE FAILED, never 'restored' (round 2, B1)", async () => {
    const { work } = repo();
    const stuck = fake(work, "fail", (a) => (a[0] === "reset" || a[0] === "checkout" ? FAIL : undefined));
    const [r, err] = await captured(() => bump(["patch"], work, stuck));
    expect(r).toBe(1);
    expect(err).toContain("RESTORE FAILED");
    expect(err).not.toContain("the four places are restored");
    expect(err).toContain("still edited: src/root.zig");
  });
  test("Ctrl-C during the gate, delivered ASYNCHRONOUSLY, zig then exits 0: refused AND restored (rounds 3, 4)", async () => {
    const { work } = repo();
    const real = fake(work);
    const interrupted: Run = (cmd, args, inh) => {
      if (cmd === "zig") ctrlC();
      return real(cmd, args, inh);
    };
    const [r, err] = await captured(() => bump(["patch"], work, interrupted));
    expect(r).toBe(1);
    expect(err).toContain("interrupted during the gate");
    expect(sh(work, "status", "--porcelain")).toBe("");
    expect(sh(work, "log", "-1", "--format=%s")).toBe("start");
  });
  test("Ctrl-C between `git add` and the commit: refused, unstaged, restored (round 4, B2 — outside the old window)", async () => {
    const { work } = repo();
    const atAdd = fake(work, "ok", (a) => {
      if (a[0] === "add") ctrlC();
    });
    const [r, err] = await captured(() => bump(["patch"], work, atAdd));
    expect(r).toBe(1);
    expect(err).toContain("interrupted before the commit");
    expect(sh(work, "status", "--porcelain")).toBe("");
    expect(sh(work, "log", "-1", "--format=%s")).toBe("start");
  });
  test("zig itself ended by Ctrl-C (Windows' STATUS_CONTROL_C_EXIT): refused as interrupted (round 4)", async () => {
    const { work } = repo();
    const real = fake(work);
    const killed: Run = (cmd, args, inh) => (cmd === "zig" ? { ok: false, out: "", err: "", interrupted: true } : real(cmd, args, inh));
    const [r, err] = await captured(() => bump(["patch"], work, killed));
    expect(r).toBe(1);
    expect(err).toContain("zig ended by Ctrl-C");
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("a SECOND Ctrl-C restores at once and exits 130 (round 4, B3)", async () => {
    const { work } = repo();
    const real = fake(work);
    const twice: Run = (cmd, args, inh) => {
      if (cmd === "zig") {
        process.emit("SIGINT");
        process.emit("SIGINT");
      }
      return real(cmd, args, inh);
    };
    // A recording exit: the real one ends the process; this one notes the code and returns, so the
    // test can still check that the restore happened FIRST.
    // The tree is read AT the moment of exit: a real exit ends the process, so anything restored
    // only afterwards (in a `finally`) would never be restored at all.
    let exited: number | null = null;
    let treeAtExit = "(exit never called)";
    const exit = ((c: number) => {
      exited = c;
      treeAtExit = sh(work, "status", "--porcelain");
    }) as (code: number) => never;
    const [, err] = await captured(() => bump(["patch"], work, twice, exit));
    expect(exited).toBe(130);
    expect(treeAtExit).toBe("");
    expect(err).toContain("interrupted twice");
    expect(err).toContain("the four places are restored");
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
  test("git refuses to unstage but the files read back clean: RESTORE FAILED says so (round 4: the untested branch)", async () => {
    const { work } = repo();
    const noReset = fake(work, "fail", (a) => (a[0] === "reset" ? FAIL : undefined));
    const [r, err] = await captured(() => bump(["patch"], work, noReset));
    expect(r).toBe(1);
    expect(err).toContain("RESTORE FAILED");
    expect(err).toContain("git refused to unstage them");
  });
  test("a file that cannot be read back during the restore: RESTORE FAILED, not a crash (round 3)", async () => {
    const { work } = repo();
    const vanish = fake(work, "fail", (a) => {
      if (a[0] === "reset") {
        rmSync(join(work, "cmem/overview.md"));
        return FAIL;
      }
      if (a[0] === "checkout") return FAIL;
    });
    const [r, err] = await captured(() => bump(["patch"], work, vanish));
    expect(r).toBe(1);
    expect(err).toContain("RESTORE FAILED");
    // In the "still edited" LIST — the fix-by-hand line names every file, so matching the whole
    // message proved nothing (its first version passed with the guard removed).
    expect(err).toMatch(/still edited: [^\n]*cmem\/overview\.md/);
  });
  test("the Ctrl-C handler is STILL installed while the restore runs, and gone after (round 5, A3)", async () => {
    const { work } = repo();
    const baseline = process.listenerCount("SIGINT");
    let duringRestore = -1;
    const watch = fake(work, "fail", (a) => {
      if (a[0] === "reset") duringRestore = process.listenerCount("SIGINT");
    });
    expect(await code(() => bump(["patch"], work, watch))).toBe(1);
    expect(duringRestore).toBe(baseline + 1);
    expect(process.listenerCount("SIGINT")).toBe(baseline);
  });
  test("a good bump: no restore, no RESTORE FAILED, and no handler left behind (round 5)", async () => {
    const { work } = repo();
    const baseline = process.listenerCount("SIGINT");
    const [r, err] = await captured(() => bump(["patch"], work, fake(work)));
    expect(r).toBe(0);
    expect(err).not.toContain("RESTORE");
    expect(err).not.toContain("restored");
    expect(process.listenerCount("SIGINT")).toBe(baseline);
  });
  test("a REAL zig ended by Ctrl-C (a stub exiting STATUS_CONTROL_C_EXIT), through the real runner: interrupted (round 5)", async () => {
    const { root, work } = repo();
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "stub.c"), "int main(void) { return (int)0xC000013A; }\n");
    const exe = join(bin, process.platform === "win32" ? "zig.exe" : "zig");
    const cc = spawnSync("zig", ["cc", join(bin, "stub.c"), "-o", exe], { encoding: "utf8" });
    expect(cc.status).toBe(0);
    const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
    const saved = process.env[pathKey];
    process.env[pathKey] = `${bin}${delimiter}${saved ?? ""}`;
    try {
      const [r, err] = await captured(() => bump(["patch"], work));
      expect(r).toBe(1);
      expect(err).toContain("zig ended by Ctrl-C");
      expect(sh(work, "status", "--porcelain")).toBe("");
    } finally {
      process.env[pathKey] = saved;
    }
  }, 120_000);
  test("a place that did not move cleanly (the gate rewrote it): refused and restored (B4)", async () => {
    const { work } = repo();
    const run = fake(work);
    const sneaky: Run = (cmd, args, inh) => {
      if (cmd === "zig") writeFileSync(join(work, "include/wazmrt.h"), FILES["include/wazmrt.h"]("5.0.1"));
      return run(cmd, args, inh);
    };
    expect(await code(() => bump(["patch"], work, sneaky))).toBe(1);
    expect(sh(work, "status", "--porcelain")).toBe("");
  });
});

describe("push.ts", () => {
  async function bumped() {
    const r = repo();
    expect(await bump(["patch"], r.work, fake(r.work))).toBe(0);
    return r;
  }
  const quiet = (f: () => number) => code(f);

  test("pushes main only, reads it back; NO tag even with push.followTags and a stray local tag (B1)", async () => {
    const { work } = await bumped();
    sh(work, "config", "push.followTags", "true");
    sh(work, "tag", "-a", "v9.9.9", "-m", "stray, local only");
    const before = remoteTags(work);
    expect(push([], work, fake(work))).toBe(0);
    expect(remoteMain(work).split(/\s+/)[0]).toBe(sh(work, "rev-parse", "HEAD"));
    expect(remoteTags(work)).toBe(before);
  });
  test("a tag published by the push anyway: ALERT, exit 1", async () => {
    const { work } = await bumped();
    sh(work, "tag", "-a", "v9.9.9", "-m", "stray");
    const real = runner(work);
    const leaky = fake(work, "ok", (a) => {
      if (a[0] === "push") {
        const r = real("git", a);
        real("git", ["push", "origin", "refs/tags/v9.9.9"]);
        return r;
      }
    });
    const [r, err] = await captured(() => push([], work, leaky));
    expect(r).toBe(1);
    expect(err).toContain("ALERT");
  });
  test("a hook publishes a tag and then FAILS the push: still ALERT (round 2, B2)", async () => {
    const { work } = await bumped();
    sh(work, "tag", "-a", "v7.7.7", "-m", "hook");
    const real = runner(work);
    const hook = fake(work, "ok", (a) => {
      if (a[0] === "push") {
        real("git", ["push", "origin", "refs/tags/v7.7.7"]);
        return FAIL;
      }
    });
    const [r, err] = await captured(() => push([], work, hook));
    expect(r).toBe(1);
    expect(err).toContain("ALERT");
  });
  test("HEAD is not the bump commit: refused, nothing pushed", async () => {
    const { work } = repo();
    writeFileSync(join(work, "README.md"), "changed\n");
    sh(work, "commit", "-q", "-am", "docs");
    const before = remoteMain(work);
    expect(await quiet(() => push([], work, fake(work)))).toBe(1);
    expect(remoteMain(work)).toBe(before);
  });
  test("exactly the four files moved, but the subject is not the bump's: refused (only the subject check can see it)", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    sh(work, "commit", "-q", "-am", "chore: version 5.0.2 by hand");
    expect(await quiet(() => push([], work, fake(work)))).toBe(1);
  });
  test("a bump commit that also changes another file: refused", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    writeFileSync(join(work, "README.md"), "smuggled\n");
    sh(work, "commit", "-q", "-am", "bump to v5.0.2");
    expect(await quiet(() => push([], work, fake(work)))).toBe(1);
  });
  test("a bump commit that smuggles code INTO a version file: refused (round 2, B3)", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    writeFileSync(join(work, "src/root.zig"), `${FILES["src/root.zig"]("5.0.2")}pub fn evil() void {}\n`);
    sh(work, "commit", "-q", "-am", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("changes more than the version line");
  });
  test("a bump commit that changes a file mode: refused (round 2, B3)", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    sh(work, "add", ".");
    sh(work, "update-index", "--chmod=+x", "build.zig.zon");
    sh(work, "commit", "-q", "-m", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("file mode");
  });
  test("a bump commit that adds only WHITESPACE at a file's end: refused (round 3, B1 — the old check trimmed it away)", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    writeFileSync(join(work, "src/root.zig"), `${FILES["src/root.zig"]("5.0.2")}\n\n   \n`);
    sh(work, "commit", "-q", "-am", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("changes more than the version line");
  });
  test("src/root.zig missing from the parent: a clean refusal, not a crash (round 3 — `git show` threw out of main)", async () => {
    const { work } = repo();
    sh(work, "rm", "-q", "src/root.zig");
    sh(work, "commit", "-q", "-m", "drop root");
    for (const [f, body] of Object.entries(FILES)) {
      mkdirSync(join(work, f, ".."), { recursive: true });
      writeFileSync(join(work, f), body("5.0.2"));
    }
    sh(work, "add", ".");
    sh(work, "commit", "-q", "-m", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("HEAD~1:src/root.zig is missing");
  });
  test("the bump commit's parent version was never released: refused (round 3)", async () => {
    const { work } = repo("5.0.1", false);
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    sh(work, "commit", "-q", "-am", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("never released");
  });
  test("the tag already exists on origin: refused as ON ORIGIN (only the origin check can see it)", async () => {
    const { work } = await bumped();
    sh(work, "config", "remote.origin.tagOpt", "--no-tags");
    sh(work, "tag", "-a", "v5.0.2", "-m", "x");
    sh(work, "push", "-q", "origin", "v5.0.2");
    sh(work, "tag", "-d", "v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("already exists on origin");
  });
  test("the tag on origin, fetched down locally too: the message still says origin (round 2, B6)", async () => {
    const { work } = await bumped();
    sh(work, "tag", "-a", "v5.0.2", "-m", "x");
    sh(work, "push", "-q", "origin", "v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("already exists on origin");
  });
  test("a local-only tag for the version: refused as local", async () => {
    const { work } = await bumped();
    sh(work, "tag", "v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("local tag v5.0.2 exists");
  });
  test("not on main: refused", async () => {
    const { work } = await bumped();
    sh(work, "checkout", "-q", "-b", "side");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("not on main");
  });
  test("origin/main has a commit HEAD lacks: refused (ancestor check)", async () => {
    const { root, work, remote } = await bumped();
    const other = join(root, "other");
    sh(root, "clone", "-q", "-b", "main", remote, other); // the bare remote's HEAD names no branch
    sh(other, "config", "user.name", "o");
    sh(other, "config", "user.email", "o@example.invalid");
    writeFileSync(join(other, "README.md"), "theirs\n");
    sh(other, "commit", "-q", "-am", "theirs");
    sh(other, "push", "-q", "origin", "main");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("not an ancestor");
  });
  test("the fetch fails: stops before anything is pushed", async () => {
    const { work } = await bumped();
    const before = remoteMain(work);
    const noFetch = fake(work, "ok", (a) => (a[0] === "fetch" ? FAIL : undefined));
    // A REFUSED line, not a thrown error (round 7).
    const [r, err] = await captured(() => push([], work, noFetch));
    expect(r).toBe(1);
    expect(err).toContain("REFUSED: git fetch origin");
    expect(remoteMain(work)).toBe(before);
  });
  test("the read-back disagrees: refused", async () => {
    const { work } = await bumped();
    const real = runner(work);
    let pushed = false;
    const liar = fake(work, "ok", (a) => {
      if (a[0] === "push") pushed = true;
      if (pushed && a[0] === "ls-remote" && a.includes("refs/heads/main")) return { ok: true, out: `${"0".repeat(40)}\trefs/heads/main`, err: "" };
      return undefined;
    });
    void real;
    const [r, err] = await captured(() => push([], work, liar));
    expect(r).toBe(1);
    expect(err).toContain("read-back");
  });
  test("origin's push URL is not its fetch URL: refused before pushing (round 2, B6)", async () => {
    const { root, work } = await bumped();
    sh(root, "init", "-q", "--bare", join(root, "elsewhere.git"));
    sh(work, "remote", "set-url", "--push", "origin", join(root, "elsewhere.git"));
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("push URL");
  });
  test("the gate fails: refused, nothing pushed", async () => {
    const { work } = await bumped();
    const before = remoteMain(work);
    expect(await quiet(() => push([], work, fake(work, "fail")))).toBe(1);
    expect(remoteMain(work)).toBe(before);
  });
  test("zig missing: refused by name", async () => {
    const { work } = await bumped();
    const [r, err] = await captured(() => push([], work, fake(work, "missing")));
    expect(r).toBe(1);
    expect(err).toContain("`zig` is not on PATH");
  });
  test("a dirty tree: refused", async () => {
    const { work } = await bumped();
    writeFileSync(join(work, "stray.txt"), "x");
    expect(await quiet(() => push([], work, fake(work)))).toBe(1);
  });
  test("a commit made on main DURING the gate: refused, nothing pushed (round 5)", async () => {
    const { work } = await bumped();
    const before = remoteMain(work);
    const real = fake(work);
    const sneaky: Run = (cmd, args, inh) => {
      if (cmd === "zig") {
        writeFileSync(join(work, "README.md"), "unchecked\n");
        sh(work, "commit", "-q", "-am", "made while the gate ran");
      }
      return real(cmd, args, inh);
    };
    const [r, err] = await captured(() => push([], work, sneaky));
    expect(r).toBe(1);
    expect(err).toContain("HEAD moved during the gate");
    expect(remoteMain(work)).toBe(before);
  });
  test("the tree changed during the gate: refused (the gate built something else)", async () => {
    const { work } = await bumped();
    const real = fake(work);
    const dirtying: Run = (cmd, args, inh) => {
      if (cmd === "zig") writeFileSync(join(work, "README.md"), "edited mid-gate\n");
      return real(cmd, args, inh);
    };
    const [r, err] = await captured(() => push([], work, dirtying));
    expect(r).toBe(1);
    expect(err).toContain("the tree changed during the gate");
  });
  test("pushes the CHECKED commit by id: a commit made after the checks does not go up (round 5)", async () => {
    const { work } = await bumped();
    const checked = sh(work, "rev-parse", "HEAD");
    const late = fake(work, "ok", (a) => {
      if (a[0] === "push") {
        // Main moves between the last check and the push; the push names the checked id anyway.
        writeFileSync(join(work, "README.md"), "late\n");
        sh(work, "commit", "-q", "-am", "late");
      }
    });
    expect(await code(() => push([], work, late))).toBe(0);
    expect(remoteMain(work).split(/\s+/)[0]).toBe(checked);
  });
  test("a bump that is not ONE level up (5.0.1 -> 5.0.9): refused (round 5)", async () => {
    const { work } = repo();
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.9"));
    sh(work, "commit", "-q", "-am", "bump to v5.0.9");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("not one level up");
  });
  test("the parent version's tag is on a commit outside the bump's history: refused (round 5)", async () => {
    const { work } = repo("5.0.1", false);
    sh(work, "checkout", "-q", "--orphan", "elsewhere");
    writeFileSync(join(work, "README.md"), "unrelated\n");
    sh(work, "add", "README.md");
    sh(work, "commit", "-q", "-m", "unrelated");
    sh(work, "tag", "-a", "v5.0.1", "-m", "made elsewhere");
    sh(work, "push", "-q", "origin", "v5.0.1");
    sh(work, "tag", "-d", "v5.0.1");
    sh(work, "checkout", "-q", "-f", "main");
    sh(work, "branch", "-q", "-D", "elsewhere");
    sh(work, "clean", "-qfdx");
    for (const [f, body] of Object.entries(FILES)) writeFileSync(join(work, f), body("5.0.2"));
    sh(work, "commit", "-q", "-am", "bump to v5.0.2");
    const [r, err] = await captured(() => push([], work, fake(work)));
    expect(r).toBe(1);
    expect(err).toContain("not in the bump commit's history");
  });
  test("a failed push says where origin/main now is (round 5: a hook can fail after the update)", async () => {
    const { work } = await bumped();
    const before = remoteMain(work).split(/\s+/)[0];
    const failed = fake(work, "ok", (a) => (a[0] === "push" ? FAIL : undefined));
    const [r, err] = await captured(() => push([], work, failed));
    expect(r).toBe(1);
    expect(err).toContain(`origin/main is now ${before}`);
  });
  test("the documented way out of a bump whose CI checks failed: revert, fix, bump again, push (round 6)", async () => {
    const { work } = await bumped();
    expect(await code(() => push([], work, fake(work)))).toBe(0); // pushed; CI went red; no tag made
    expect(await code(() => bump(["patch"], work, fake(work)))).toBe(1); // v5.0.2 untagged: refused
    sh(work, "revert", "--no-edit", "HEAD");
    writeFileSync(join(work, "README.md"), "the fix\n");
    sh(work, "commit", "-q", "-am", "fix: what the checks found");
    expect(await code(() => bump(["patch"], work, fake(work)))).toBe(0);
    expect(read(work, "src/root.zig")).toBe(FILES["src/root.zig"]("5.0.2"));
    expect(await code(() => push([], work, fake(work)))).toBe(0);
    expect(remoteMain(work).split(/\s+/)[0]).toBe(sh(work, "rev-parse", "HEAD"));
  });
  test("--dry-run: every guard, nothing pushed", async () => {
    const { work } = await bumped();
    const before = remoteMain(work);
    expect(push(["--dry-run"], work, fake(work))).toBe(0);
    expect(remoteMain(work)).toBe(before);
  });
});
