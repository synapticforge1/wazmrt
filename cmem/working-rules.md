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
- ⏳ **Still on Deno, to port under the proof rule:** the committed probes in `cmem/probes/` (26
  files, 2026-10-23). They keep running under Deno while it is installed.

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


## 🏗️ BUILDING AND TESTING FROM THE `D:` DRIVE (exFAT)

**Set the zig LOCAL CACHE to an NTFS path and build normally from this repo's own cwd:**

```
ZIG_LOCAL_CACHE_DIR=C:\zig-cache\wazmrt        # or: zig build --cache-dir C:\zig-cache\wazmrt
```

Verified this way from `D:\…\wazmrt` directly: `zig build`, `dll`, `size` (all three ceilings
EXACT), `test` and `test-safe` (633 tests), `features` — all green, repeatedly, in one cache.
**No tree copy is needed any more.**


### `test-security` needs an NTFS **cwd**

`std.testing.tmpDir` scratches under `.zig-cache/tmp` **relative to the CWD**, which is *not* the
configured cache dir — so redirecting the cache does **not** help it. From D: the suite reads
**754/758 (4 skipped)** and `test-security` **1 pass / 2 fail**; from an NTFS cwd it is **758/758**
and `test-security` 3/3. That is an exFAT property (no reparse points), not a defect:

```
cd C:\ntfs\dir && zig build --build-file D:\…\wazmrt\build.zig test-security
```

⚠️ **Quote NTFS numbers.** A D:-cwd run's skips are evidence about the FILESYSTEM, not the sandbox.

---

*(How the env-var fix was found — the FOURTH diagnosis of one symptom; three earlier ones blamed
hardware/event-51 (`f3496fa`, `e9d9ce6`, `38a6991`, `c66ad49`) and were wrong — is summarized in
`best-practices.md`; the full account is `git show 3f1bfbc1d:cmem/INDEX.md`, lines 475–510.)*
