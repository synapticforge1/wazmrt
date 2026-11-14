# working-rules.md — the standing rules for working in wazmrt

The checklist: boundaries, tooling, line endings, how to build and test on this repo's drives.
**Rules, not lessons** — the method lessons with their incidents are in
[`best-practices.md`](best-practices.md). Moved here verbatim from `INDEX.md` on 2026-09-21 (letter H3,
`../../cmem/memory-conventions.md`); the text as it stood is `git show 3f1bfbc1d:cmem/INDEX.md`.

## 🔒 Two things to know before touching anything

1. **wazmrt has ZERO external dependencies and that is verified, not assumed** — binaries import
   only `ntdll`/`KERNEL32`, `third_party/` holds no code, `build.zig.zon`'s `.dependencies` is
   empty, and every correctness gate needs nothing but Zig. `zig build conformance` with no
   `-Dtestsuite` prints guidance and exits 0. **Only the Bake Off and the spec corpus reach
   outside**, both optional.
2. **The conformance baseline is EMPTY, which makes it the easiest file in the repo to quietly
   ruin.** There is no longer a single legitimate entry to hide a new one behind. A line added there
   to make a build green is the failure mode that file has always invited.


## 🚫🔒 THE EDITING BOUNDARY IS ABSOLUTE (owner, 2026-08-19) — `interop.md` §1a

🚫 **WE DO NOT WRITE ANYTHING INTO THE wasmrt TREE. Not their `cmem/`, not their source, not their
tests — and NOT their copy of `interop.md`.** The only exception is an **explicit, specific direction
from the owner** for that edit. ⚠️ **`coordinate` is an order to CONFER, never a licence to WRITE**, and
it grants no standing permission.

> *"Each project needs to edit their own files. This is important for tracking and integrity."* — owner

**So a contract change goes:** write it in **our** copy → bump the version → mark it ⏳ **PENDING
MIRROR** → **tell the owner wasmrt's copy is behind, and at which version.** The owner directs the
other project, and *that* project makes the edit in its own tree. ⚠️ **A version mismatch between the
two copies is now a normal signal, not a fault to clean up** — resolve it by **reporting**, never by
copying over their file. *(This replaced the earlier "interop.md is the one thing you may write there"
rule, which produced two destructive overwrites in a single day.)*

🔒 **Read freely, write never.** Reading their `cmem/`, their uncommitted work and their source — and
running their binary — is required by `coordinate`. The retired oracle is not reopened by this: reading
their code for **design guidance** stays off-limits; reading it to check a **contract row** is the
whole point. A finding about their project is **reported to the owner**, never edited into their memory.

### 📌 THE DESIGN-GUIDANCE READS SO FAR — BOTH owner-directed, 2026-09-20 (Track B-e; the `@custom` gate question)

🔒 **The retired oracle is NOT reopened, and this entry exists so nobody reads it as precedent.** The
owner directed: *"lets consult the wasmrt project for where it belongs"* — where the size gate should
be wired. That is **design guidance**, which the rule above forbids by default, so it happened only
because the owner asked for it and it is scoped to that question.

📋 **What it produced, so the cost/benefit is on the record:** their `best-practices.md` already held
the rule the item needed (*"a gate needs a trigger, not just an existence"*) **plus two more that were
live defects here** — a size gate grading yesterday's artifact, and attributing an overshoot by
building parent commits rather than assuming. ⚠️ **Their rules had been written by watching THIS
project's gate drift**, which is what made them worth reading and is also why this was not novel
design being borrowed.

✅ **The rule for next time, unchanged: ask the owner.** A contract row is readable any time; how to
build something is not.

📌 **SECOND read, same day, also owner-directed: how `wasmrt` and `binaryang` each resolved
`@custom`.** It answered the gate question outright — **neither added a feature bit**, both treated
annotations as fidelity work — and it turned up a **live wazmrt defect** the question had not
anticipated: an annotated module assembles byte-identically to one without the annotation, so
wazmrt silently drops what the text asked for. 🎓 **Both reads paid, and both were about a decision
already made elsewhere rather than a design to copy** — which is the shape that makes the exception
worth granting. Details: `roadmap.md` → the `@custom` gate question.


## 🔒🔒 PROVE OR VALIDATE BEFORE ACTING — never guess, never assume (owner, 2026-09-19)

**Binding on every agent, and it outranks speed.** Before a fact reaches code, a test, a document or a
claim to the owner, **ask the artifact that owns it**: run the binary, read the enum, query the tool,
grep the header. ⚠️ **"I know this" is not a source**, and neither is another project's prose about a
third tool.

🎓 **Prove the REASON, not just the answer.** A `--features` alias table named four spellings as "the
spec's vocabulary"; the tool's own list used none of them. Three were real anyway — as aliases the
*sibling* carries — so the code would have worked with an invented justification and one dead branch.
*Being right for a reason you did not check is being lucky, and luck does not survive the next edit.*

⬜ **UNVERIFIED is a legitimate status.** If the proof is expensive, say the claim is unverified rather
than dressing a guess in confident wording. This has already cost four claims-written-from-reading in
two days, every one of them wrong when finally run.

📖 **The rule and its incident table: [`best-practices.md`](best-practices.md) §1.** `interop.md` §1
rule 4 is this rule applied to a contract row; §6's assert-your-match-count is it applied to an edit.


## 🔧 TOOLING — Bun for committed scripts, and no heredocs (binding on every agent; revised 2026-10-23)

🔒 **Every COMMITTED script in this repo runs under Bun** (workspace `../../cmem/working-rules.md` §
Tooling rule 1, letter H15; owner 2026-10-22: *"Deno is going away"*). Zig has no qualifying
scripting mechanism — `zig run` builds an executable — so Zig falls back to Bun. Scripts are
JavaScript/TypeScript using `node:*`, web APIs and `Bun.*`, never `Deno.*` or `jsr:`. "Script" means
anything kept for repeated use that would otherwise be a shell script: `tools/phases.mjs`,
`tools/bakeoff.mjs`, `tools/emitter-diff.mjs`, `examples/bun_ffi_capi.mjs` (all `bun <file>`, the
first, second and fourth from `build.zig`), and `cmem/probes/`. 🚫 **No committed Python, bash,
PowerShell or `.bat`, no npm.** A port replaces its original only after the two are run on the same
inputs and their OUTPUT is diffed, one must-fail input included, with the comparison recorded in the
commit.

- 🔒 **A Zig file that is part of a build step is not a script** (owner, 2026-10-23):
  `tools/size_gate.zig` and `tools/conformance.zig` are compiled and run by `build.zig`, so they
  stay Zig.
- 🔒 **The FFI demo is a Bun demo** (owner, 2026-10-23: the Deno FFI demo *"will need to become a
  bun ffi/node ffi demo due to deno going away"*) — `examples/bun_ffi_capi.mjs` over `bun:ffi`.
- 🔓 **Throwaway work is relaxed, for speed** (owner, 2026-10-23, *"relax it for faster work"*;
  replaces 2026-09-19's "it binds throwaway work too"): a ONE-TIME script that is deleted after use may
  be bash, PowerShell, Bun or Zig, whichever is fastest. It is still WRITTEN with `Write` (the
  heredoc ban below is unchanged), and a script that turns out to be needed again — or that produced a
  number someone will quote — is promoted to Bun and saved under [`probes/`](probes/README.md) before
  it is committed.
- ✅ **No committed script runs on Deno any more** (2026-10-23). The 25 probes in `cmem/probes/` were
  ported the same day; the earlier "26" counted the README, which `git grep -l Deno.` also
  matched. A probe that spawns a process goes through [`probes/run.ts`](probes/run.ts), which keeps
  `Deno.Command`'s result shape and `env` merging.
- 🔒 **No `gh`, in CI too** (owner, 2026-11-08; workspace Tooling rule 9, letter H30): check the repo
  instead — `git ls-remote` and the repo's own files; in a workflow, GitHub's REST API from a Bun
  step with `GITHUB_TOKEN`; a GitHub web-UI task is an owner item. Measured 2026-11-12: wazmrt has
  no `gh` call anywhere (`git grep`) and no `.github/` workflow yet; any workflow it gains follows
  this rule from its first line.
- 🔒 **Every Bun-version notation is the latest installed Bun, always** (owner, 2026-11-09; workspace
  Tooling rule 10, letter H31): a pin, installer, Docker tag, `@types/bun` or minimum supported Bun
  moves to the current one at the next session; a DATED test result ("measured on Bun x") stays
  until that test is re-run. Measured 2026-11-12: wazmrt writes no Bun version anywhere
  (`git grep` for `bun@`, `bun-version`, `oven-sh`, a version beside "Bun"), so nothing moves; a
  workflow that installs Bun pins the then-current version by sha256 (workspace
  `release-process.md` U9).

🚫 **Never pass a script to an interpreter through a shell heredoc.** `cmd <<'EOF' … EOF` adds an
invisible escaping layer and **fails silently more often than loudly** — three distinct corruptions in
one session: escapes consumed twice (a real newline emitted into a Zig string literal, which the build
reported only as `error: Unexpected`), backslashes halved so a replacement matched **zero** occurrences
and did nothing, and a quote in the body aborting a command whose earlier statements had already run.
**Write the file, then run the file** — one layer of escaping, and the result is re-runnable and
diffable. Passing a script as a shell *argument* (`deno eval "…"`) is the same class; use a file.

🔒 **Corollary — an edit script asserts its match count and writes atomically.** Every replacement must
match **exactly once** (not "at least once", which passes when a pattern matches twice and corrupts both
sites), and the file is written only after every edit succeeds, so a failure leaves the original
untouched. ⚠️ *A find-and-replace that reports success without checking it changed anything is the
silent-wrong-output class wearing a different hat.*

📖 **Full rationale and the incidents: [`best-practices.md`](best-practices.md) §6.**

🔒 **SCRATCH WORK LIVES IN `cmem/probes/`, NOT ON THE MACHINE (owner, 2026-09-21: *"scratch pad
items should be in the cmem by design and not stored on this machine"*).** A session scratchpad is
local to one machine and one session. A probe that produced a recorded number goes into
[`probes/`](probes/README.md) **as it is written**, with a row saying how to run it, so the number can
be re-derived on the next machine. Only regenerable things stay out: build outputs, fixture
directories, downloaded toolchains. ⚠️ *The first save caught a stale claim within minutes: a
"dry run should report 0" that reported 3, all of them correct.*


## 📏 LINE ENDINGS — **LF, EVERYWHERE, NO EXCEPTIONS** (owner, 2026-09-20; binding on every agent)

🔒 **Every file in this repository uses LF (`\n`). Never CRLF. Not in the repository, not in the
working tree, not in a file any tool or agent writes.** LF is git's own storage format, and matching
it end-to-end is what removes the friction: nothing is converted, so nothing can warn, drift, or
differ between clones.

**The rule is enforced by [`.gitattributes`](../.gitattributes), which is the source of truth.** It
pins `* text=auto eol=lf` and travels with the repo, so it **overrides** whatever `core.autocrlf` any
particular machine has set. ⚠️ **Do not "fix" a line-ending complaint with `git config`** — that is
correct on exactly one machine and invisible to the next clone.

⚠️ **The premise this replaced was wrong, and it is worth keeping the correction: git was NOT asking
for CRLF.** Every blob here has always been LF. A machine-**global** `core.autocrlf=true` was
converting on checkout and back on commit, which is what emitted `warning: LF will be replaced by CRLF
the next time Git touches it` for every file a tool wrote — and left 20 tracked files sitting on disk
as CRLF while the rest were LF. 🎯 **The conversion was the problem, not its direction**, and that is
why the two candidate rules are not symmetric: choosing CRLF keeps the conversion and keeps the
warning; choosing LF makes the warning impossible.

🔑 **Why this is more than tidiness HERE:** a `.wat` fixture's bytes are input to the assembler and,
through `pin`, to a **SHA-256 digest compared against the sibling runtime**. A line ending that
depended on who checked the file out would move a digest — the exact class of portability defect
Track B-c2 spent a day closing.

**What this obliges an agent to do:**

- write LF when creating or editing any file (Bun's and Node's file writes already do);
- ⚠️ **mark a binary file `binary` in `.gitattributes` BEFORE committing the first one** — nothing
  tracked today is binary, which is the only reason `*` can be that blunt;
- if a CRLF file ever appears, re-check it out rather than hand-editing it:
  `git ls-files -z | xargs -0 file | grep CRLF` names them.

📖 Full reasoning and the verification that it changed zero committed bytes:
[`best-practices.md`](best-practices.md) §6.


## 🔒 RECORDS — no secrets or personal information are ever made public (owner, 2026-10-22)

**The rule, in full** (copied into this repo 2026-11-13 by the portability rule below — it was
kept only in the workspace's `cmem/working-rules.md` § Records, outside this folder): everything
committed is public, `cmem/` included, so NEVER in a committed file, a commit message, an issue, a
release or an artifact —

- **secrets**: tokens and PATs (`ghp_…`, `github_pat_…`, registry keys), passwords, private and
  signing keys, `.env` contents, session or OIDC cookies;
- **personal information**: email addresses, phone numbers, postal addresses, machine names,
  private account names, and **personal drive paths** — any absolute path that records the owner's
  machine layout (a user profile, a project drive such as a `D:` programs folder, a `J:` drive, a
  scoop or AppData install, a scratchpad or session id). **The test is "is it machine-specific?",
  not "is it absolute?"** (owner, 2026-10-23): a CONVENTION path that names nothing about one
  machine and works on any comparable host is fine (`C:\zig-cache\wazmrt`). Tool settings that
  record paths (`.claude/settings.local.json`, IDE workspace files) are never tracked.
- **The one exception** (owner, 2026-10-23/26): the maintainer contact email, as the git commit
  author/committer address, in the manifest field a package registry reads, and in ONE committed
  `cmem/` note that names the maintainer contact — nowhere else, never repeated in memory.
- Private facts go in the gitignored `cmem/local/` (checked with `git check-ignore -v` before the
  first write), or nowhere. A leaked secret is ROTATED, not just deleted. Already-public identifiers
  are fine (the GitHub org in a repo URL, registry scopes).

What it means in this repo:

- **Nothing machine-specific in a committed file, commit message, issue or release** — no user
  profile, project-drive location, scoop/AppData install or scratchpad path. Use repo-relative or
  sibling-relative paths (`../wasmtk/…`) or placeholders; the real paths live in the gitignored
  `cmem/local/environment.md`. A convention path is fine (the test is "machine-specific?" — see the
  exFAT section below).
- **The maintainer address** (🔒 owner, 2026-10-26, letter H28): allowed as the git commit
  author/committer and in ONE committed `cmem/` note that names the maintainer contact — wazmrt
  keeps none today and needs none. Nowhere else; never repeated in memory (call it "the maintainer
  address").
- **Scan before committing memory**, text AND binaries (`-I` skips a `.wasm` carrying DWARF paths):
  `git grep -I -n -i -E '[A-Za-z]:[\\/]+(Programs|Users|scoop|tools)[\\/]|/[a-z]/(Programs|Users)/'`,
  then the same with `-a -l`. Each hit is judged by the test above. Clean on 2026-10-27.
- **The retired predecessors** (wabt-ts, binaryen-ts — 🔒 owner, 2026-10-26, H28) are never cited
  as a live location (`../wabt-ts/…`); their memory is binaryang's `cmem/wabt-ts.md` /
  `cmem/binaryen-ts.md`. None cited here (`git grep`, 2026-10-27).


## 🏗️ BUILDING AND TESTING FROM THE `D:` DRIVE (exFAT)

**Set the zig LOCAL CACHE to an NTFS path and build normally from this repo's own cwd:**

```
ZIG_LOCAL_CACHE_DIR=C:\zig-cache\wazmrt        # or: zig build --cache-dir C:\zig-cache\wazmrt
```

*(`C:\zig-cache\wazmrt` is a CONVENTION, not a personal path: it names nothing about one machine and
works on any Windows host with an NTFS `C:`. The owner confirmed it is fine in a committed file
(2026-10-23). The privacy rule's test is "is it machine-specific?", not "is it absolute?".)*

Verified this way from `D:\…\wazmrt` directly: `zig build`, `dll`, `size` (all three ceilings
EXACT), `test` and `test-safe` (633 tests), `features` — all green, repeatedly, in one cache.
**No tree copy is needed any more.**


### `test-security` and the symlink tests run from `D:` (since 2026-10-27)

*Was: "`test-security` needs an NTFS cwd".* `std.testing.tmpDir` scratches under `.zig-cache/tmp`
**relative to the CWD**, which exFAT cannot give symlinks, so from `D:` the suite read **N/N+4 (4
skipped)** and `test-security` **1 pass / 2 fail**. The two symlink tests in `src/wasi.zig` now
scratch in the **OS temp dir** (`osTmpDir`: `%TEMP%`, NTFS `C:`), as wasmrt's tests always have
(`std::env::temp_dir()`). Measured 2026-10-27 from the `D:` cwd: **`test` 842/842, 0 skipped;
`test-security` 3/3.** No NTFS-cwd run is needed any more.

⚠️ **A skip there is still evidence about the FILESYSTEM, not the sandbox** — now the temp dir's. If
one ever comes back, check where `%TEMP%` points before reading anything else into it.

---

*(How the env-var fix was found — the FOURTH diagnosis of one symptom; three earlier ones blamed
hardware/event-51 (`f3496fa`, `e9d9ce6`, `38a6991`, `c66ad49`) and were wrong — is summarized in
`best-practices.md`; the full account is `git show 3f1bfbc1d:cmem/INDEX.md`, lines 475–510.)*

## Owner commands: "commit", "push", "release" (owner, 2026-11-10)

🔒 Written into every project by the workspace session on the owner's direction (2026-11-10:
"please write that into each project"; workspace `cmem/working-rules.md` Tooling rule 12, letter
H34). When the owner says:

- **"commit"** — first run "update the project memory files" (re-derive this repo's `cmem/` from
  its current state), then commit to the branch being worked on. Nothing is pushed.
- **"push"** — perform "commit", then merge the branch into `main`, then push `main` (and the
  working branch) to GitHub (`origin`) and read it back with `git ls-remote`.
- **"release"** — perform "push", then the release process: the workspace's
  `cmem/release-process.md` §§ 5–8 — CI checks first, then CI pushes the tag, then the GitHub
  Release page from the tag, then the publish to the registry — recorded in `cmem/release.md`
  § "Release History" (newest first, a summary of what changed). The level (patch / minor /
  major) is the owner's: ask if it was not given.

Each command includes the one before it, and none goes further than its own word (a "commit"
never pushes, a "push" never releases). This repo's own gate and merge rules apply at each step.

## 🔒 Reviews: the owner's words, and the method (owner, 2026-11-12 / 11-13)

Copied into this repo 2026-11-13 by the portability rule below (the standard is the workspace's
`cmem/review-process.md`, letter H35; this is what binds here, so a clone has it):

- **"review"** — a targeted code review by agents, in rounds; **"security review"** — the security
  surfaces AND the review; **"hardening review"** — the hardening axes AND the security review AND
  the review (the tiers nest, owner 2026-11-13). **"efficiency review"** is OPTIONAL, measured
  findings only, and only after the security and hardening reviews.
- **Fresh reviewers, not the author**, read-only, briefed with the code, never the author's
  verdict; a few per round, scopes not overlapping. A finding carries file and line, a concrete
  scenario, whether it was RUN, a severity (silent wrong output > crash > loud refusal of correct
  work > cosmetic) and a confidence. Each finding is re-verified with a run before it is changed,
  fixed as its CLASS, with a test that fails without the fix (a mutant per guard), and recorded.
- **A review stops when a round's reviewers find nothing.** None of them commits, pushes or
  releases — those stay the owner's words.
- 🔒 **Before every release, a security review AND a hardening review are required**, each run to
  its empty round on everything since the last release, and recorded in that release's entry in
  `cmem/release.md` before the bump; a release whose two reviews are not recorded is not ready.
- 🔒 **Class by class, once the findings are in hand** (owner, 2026-11-13: "clear one class of
  errors at a time … once those are clear move to the next class type and repeat" — the open-ended
  rounds had become "a never ending loop of checks"): fix ONLY the findings of one class; then a
  fresh reviewer looks for THAT class only (anything else is noted in a line, not chased); repeat
  until that class's re-check is empty; then the next class. The owner orders the classes.

## 🔒 Everything about this project lives IN this project folder (owner, 2026-11-13)

"All information related to this project shall be in this project folder and not stored on this
machine for maximum portability." So:

- **Nothing project-related is kept outside the repo folder** — not in an assistant's per-machine
  memory, not in a session's temporary scratchpad, not in a user-level settings file. A rule, a
  decision, a measurement, a method or a tool used more than once goes into `cmem/` (or, for a
  tool, `tools/`), committed. What may not be public goes in the gitignored `cmem/local/`, which is
  still in this folder.
- **A session's scratch files are throwaway.** A probe kept for re-use is committed under
  `cmem/probes/` or `tools/`; anything else is deleted with the session. The review's mutation
  runner is `tools/mutants.ts` and its lists are `cmem/review-mutants/` (both moved from a
  scratchpad, 2026-11-13; `testing.md`) — evidence is kept, so a claim can be re-checked.
- **On a new machine, this folder is all that is needed** (with Zig and Bun installed): nothing
  learned here is lost by leaving the old one.

## Reporting: this project only (owner, 2026-11-05)

Report only on this project. Do not describe the state of sibling repos — their clones, their
open parts of a workspace ledger row, what they still owe — unless that is needed to finish the
task given here. For a workspace ledger item, do this repo's part, record it as CLOSED for this
project (here and in the row's cell), and stop; closing the row is its creator's job. (Owner,
2026-11-05, after a report that described another repo's half-made clone: "I do not need you to
report on other projects unless they are needed to complete the task given to this project." Kept
until 2026-11-13 in a per-machine assistant memory; moved here by the rule above.)
