# cmem/probes — measurement scripts kept WITH the memory, not on a machine

🔒 **Owner, 2026-09-21: "scratch pad items should be in the cmem by design and not stored on this
machine."** A session's scratchpad is local to one machine and one session, and it vanishes. A
probe that produced a recorded number belongs next to the number, so the next session (or the next
machine) can re-derive it. **Save probes here as you write them, not afterwards.** Build outputs and
fixture directories are regenerated and are not kept.

The scripts below are Deno (as written 2026-09) or Zig. ⏳ **Since 2026-10-23 a committed script is
Bun** (`working-rules.md` → TOOLING), so the `.ts` probes here are waiting for a port under the proof
rule; they run under Deno while it is installed. A new probe is written for Bun. **Run `--dir` probes through `Deno.Command` or a
native shell, never Git Bash**: MSYS rewrites `./data:/m` into `.\data;M:\` before the program sees it.

| file | what it measures | how to run |
| --- | --- | --- |
| `argv-echo.ts` | prints its own argv as JSON, so you measure the SHELL, not wazmrt | `deno run -A argv-echo.ts <args…>` from each shell |
| `bash-argv.ts` | hands a typed line to a real `bash` and reports what arrived | `deno run -A bash-argv.ts <abs path to argv-echo.ts>` |
| `h1-measure.ts` | the workspace-letter-H1 CLI sweep: `--dir` forms, guest-position flags, unknown/abbreviated flags | `deno run -A h1-measure.ts <wazmrt> <module.wat>` |
| `dir-forms.ts` | which HOST spellings `--dir` accepts (guest half pinned with `::`) | from a dir containing `./data`, `./q` and a sibling `../probe2/data` |
| `sep-forms.ts` | the `:` / `::` split, no shell in the path | same cwd as above |
| `posix-forms.ts` | the `--dir` grammar on a POSIX host; creates `a:b` and `back\slash` itself | `deno run -A posix-forms.ts <wazmrt> <abs module.wat>` |
| `guest_names.zig` | a `wasm32-wasi` guest that opens names whose CONTENTS say which file they are | `zig build-exe guest_names.zig -target wasm32-wasi -O ReleaseSmall "-femit-bin=guest_names.wasm"` |
| `guest-fixtures.ts` | the fixtures for it: `x\y`, `x/y`, `a:b`, `c:`, `b`, two symlinks | `deno run -A guest-fixtures.ts <dir>`, then `wazmrt guest_names.wasm --dir <dir>::/` |
| `body-parity.ts` | letter H13: wazmrt's module BODIES vs `wasm-tools parse`, custom sections stripped, each difference classed as local-runs or other | `deno run -A body-parity.ts <wazmrt> <corpus dir> <out dir> [--list]` |
| `pin-parity.ts` | `.wat` PIN parity: full-file equality (= equal pins) vs wasmrt's built binary, or vs `wasm-tools` | `deno run -A pin-parity.ts <wazmrt> <wasmrt.exe \| wasm-tools> <corpus dir> <out dir>` |
| `type-order.ts` | one file's TYPE SECTION from wazmrt and wasm-tools side by side, differing indices marked | `deno run -A type-order.ts <wazmrt> <file.wat> <out dir>` |
| `i14-interleave.wat` | the two-function module that separates "function by function" from "all signatures first" interning | with `type-order.ts` |
| `h13-fixtures/` | the three minimal modules whose wasm-tools bytes the H13 unit test asserts | `body-parity.ts` on the dir: 3/3 same |
| `h13-invert.ts` | undoes each H13 fix in turn; each must fail the unit test AND bring back its own corpus files. Restores `src/wat.zig` byte-for-byte | `deno run -A h13-invert.ts <repo root> <corpus dir> <out dir>` |
| `four-assemblers.ts` | letter H8: one or more `.wat` through wasm-tools, wazmrt, wasmrt and binaryang; exit, custom-section list, equality with wasm-tools | `deno run -A four-assemblers.ts <wazmrt> <wasmrt.exe> <binaryang dir> <out dir> <file.wat>...` |
| `h8-fixtures/` | the two `(@custom "name" …)` inputs for I8, with and without identifiers | with `four-assemblers.ts` |
| `feature-names.ts` | letter H8 / I6: which of wasm-tools' `--features` names (read from the tool) each runtime knows | `deno run -A feature-names.ts <module.wat> <runtime exe>...` |
| `feature-matrix.ts` | what every wasm-tools `--features` name ADMITS: presets × one-module-per-feature, then the single name (or minimal pair) that suffices for each module. Pass a runtime exe to run the same matrix on it | `deno run -A feature-matrix.ts <out dir> [runtime exe]` |
| `features-invert.ts` | undoes each of the 11 pieces of the 2026-09-21 feature work (six gates, the SIMD float list, both holes, the typed-reference rule, the `try_table` leak); `zig build test` must fail every time. Restores every touched file | `deno run -A features-invert.ts <repo root>` → "ALL GUARDED" |
| `legacy-eh/` | flat legacy-EH forms (`forms.ts`), fixtures that assemble byte-identically to wasm-tools and RUN (`flat/`), and their inversion (`invert.ts`) | see each file's header |
| `opcode-sweep.ts` | letter H8 / I5: 748 candidate opcodes through wasm-tools, wazmrt, wasmrt and binaryang; calibrates each tool's "unknown opcode" message, then prints only the disagreements | `deno run -A opcode-sweep.ts <out dir> <wazmrt> <wasmrt.exe> <binaryang dir> [--calibrate]` |
| `sweep-groups.ts` | groups an `opcode-sweep.ts` result by agreement pattern (who knows what) | `deno run -A sweep-groups.ts <result.txt> [--full]` |
| `three-proposals.ts` | stack-switching, memory-control, shared-everything-threads: does wasm-tools validate each by default, and does wasmtime RUN it, with and without its `-W` switch? | `deno run -A three-proposals.ts <out dir>` |
| `simd-holes.ts` | the twenty unassigned `0xFD` gaps given 1/2/3 v128 operands: do they VALIDATE, do they run? | `deno run -A simd-holes.ts <wazmrt> <out dir>` |
| `h3-sections.ts` | a Markdown file's headings with the BYTES under each — how the INDEX cut was planned | `deno run -A h3-sections.ts <file.md>` |
| `h3-build.ts` | letter H3: rebuilt INDEX.md and created working-rules.md by MOVING line ranges verbatim from a baseline commit, each range asserted to start at its expected heading | `deno run -A h3-build.ts <repo root> <baseline>` (done once; kept as the record of what moved) |
| `h3-check.ts` | letter H3's proof: every hash the old INDEX cited still resolves AND is still cited; every link resolves; every by-name section reference resolves. `--invert` must report the sabotage | `deno run -A h3-check.ts <repo root> 3f1bfbc1d [--invert]` |
| `rename-track-h.ts` | ✅ applied one-off: `H1`–`H8` → `zH1`–`zH8` | ⚠️ **never `--apply` again**: a bare `H<n>` now means a workspace letter. Dry run = a census to READ (3 intended hits, 2026-09-21) |

## Recorded results (re-derive before quoting — a number is a claim with a date)

**2026-09-21, Windows (PowerShell 5.1, cmd, Git Bash) and WSL2 Ubuntu 26.04 / ext4 / bash 5.3.9,
Zig 0.16.0, Deno 2.9.7:**

- **Shells.** PowerShell and cmd pass `--dir` specs verbatim. Git Bash rewrites any spec it reads
  as a POSIX PATH list (`./data:/m`, `.:/`, `/etc:/m`); **`::` is never rewritten**, and neither is
  `MSYS_NO_PATHCONV=1` / `MSYS2_ARG_CONV_EXCL='*'`. Linux bash passes all 7 verbatim. PowerShell 5.1
  has two corruptions of its own: embedded double quotes are stripped, and an unquoted `-x=a.b` is
  split at the `.`.
- **`--dir` grammar** (`interop.md` v27): the 19-row POSIX matrix and the Windows matrix match the
  agreed table with 0 mismatches.
- **The guest on Linux, BEFORE the resolver fix:** `x\y` opened `x/y`, a symlink to `x\y` opened
  `x/y`, and a symlink to `a:b` opened `b` (all SUCCESS, all the wrong file). `a:b` and `c:` were
  `NOTCAPABLE`. **AFTER:** each opens itself, `../../../../etc/passwd` is `NOTCAPABLE`, and its
  backslash spelling is `NOENT`. On Windows the same guest is unchanged by the fix.

**2026-09-21, letter H13 (Windows, wasm-tools 1.259.0, the 532 `.wat` of `wasmtk/tests`):** bodies
equal wasm-tools' on **64/528 before, 528/528 after**; the 464 were 460 local-runs + 2 export-order
+ 2 type-order. Full files (= `.wat` pins) after the fix: **528/528 identical to `wasm-tools parse`**,
and **64/528 identical to wasmrt's 2026-09-20 build** (down from 528, until wasmrt fixes the same).
All three fixes inversion-proven by `h13-invert.ts`. ⚠️ Its first draft reported one fix as
unguarded because the sabotage did not COMPILE; it now builds first and says so.

**2026-09-21, wasm-tools 1.259.0 feature semantics (`feature-matrix.ts`), the basis for supporting
every wat/wasm feature name (owner: "broadest compatibility"):**

| preset | admits (measured, one module per feature) |
| --- | --- |
| `mvp` | the 1.0 core only. ⚠️ **NOT the same as `wasm1`**: `mvp` refuses a mutable-global EXPORT, although `--help` says the two select the same thing |
| `wasm1` | `mvp` + `mutable-global` |
| `wasm2` | `wasm1` + sign-extension, saturating-float-to-int, multi-value, reference-types, bulk-memory (+ `-opt`), simd, call-indirect-overlong |
| `wasm3` | `wasm2` + relaxed-simd, threads, tail-call, multi-memory, exceptions, memory64, extended-const, function-references, gc, gc-types. **Not** legacy-exceptions, custom-page-sizes, wide-arithmetic |
| `lime1` | mutable-global, floats, sign-extension, saturating-float-to-int, multi-value, bulk-memory-OPT (not bulk-memory), extended-const, call-indirect-overlong |

Dependencies: `bulk-memory` ⇒ `bulk-memory-opt`; `reference-types` ⇒ `call-indirect-overlong`; `gc` ⇒
`function-references`; saturating truncation needs `floats`; **`externref` needs reference-types AND
`gc-types`**; legacy `try` needs exceptions AND `legacy-exceptions`; `(type (struct))` needs gc AND
gc-types. ⚠️ The first run scored every module "refused" because `--features -all,x` as TWO arguments
makes clap read `-all` as a flag; `--features=-all,x` is one argument. *A probe that fails the control
row is measuring itself.*

**2026-09-21, after the feature work: `feature-matrix.ts` run on wazmrt produces output IDENTICAL to
wasm-tools'** — every preset, single name, minimal pair, group-name, per-instruction and reference-type
row. That is the acceptance test for `interop.md` v30; wasmrt matches when the same command on it
diffs clean.

**2026-09-21, letter H8 / I5 (`opcode-sweep.ts`, ranges widened the same day to 1,276 candidates):**
wasm-tools knows 626; **wazmrt 582 = wasmrt 582**, both short only by the 44 opcodes of three
proposals (stack-switching 7, memory-control 1, shared-everything-threads 36) — which wasm-tools
validates only with `--features=all` and **wasmtime 48.0.2 cannot run at all** (`three-proposals.ts`).
The first ranges stopped at `0xfe 4f` and reported nine; binaryang 639
(accepts 64 unassigned `0xFD`, lacks `0xfb 20`–`26`). wazmrt was 602 until its twenty `0xFD` gaps
were refused. ⚠️ Two probe artifacts, both caught before they became findings: the output was
truncated before wazmrt's verdict (scored "knows everything"), and `end` was read as a lane
immediate (scored wasmrt as missing eleven lane ops it runs). *An alarming row is re-run with a
complete module before it is reported.*

## ⬜ Open: the macOS pass

🍎 **Owner, 2026-09-21: "when I have access to that machine."** Linux is measured; macOS is not. The
four POSIX resolver defects (`known-issues.md`, fixed 2026-09-21) are fixed there **by construction
only**, since macOS runs the same `.native = .posix` code. **The check, not the conclusion** — on a Mac
with Zig 0.16.0 and Deno 2.9.7:

1. `zig build test` — every test passing, **0 skipped**.
2. `WAZMRT_SECURITY_STRICT=1 zig build test-security` — 3/3.
3. The `--dir` grammar matrix (`posix-forms.ts`): `./a:b::/m` and `./back\slash::/m` mount; `q:/m`,
   `C:` and `data:/m` are the bare-relative error.
4. `guest_names.zig` + `guest-fixtures.ts`: a `wasm32-wasi` guest `path_open`s, with
   `SYMLINK_FOLLOW`, files whose CONTENTS name them (`x\y`, `x/y`, `a:b`, `c:`, `b`, symlinks to `x\y`
   and `a:b`, plus `../../../../etc/passwd` and its backslash spelling). Expect each to open itself,
   the `../` escape `NOTCAPABLE`, and the backslash spelling `NOENT`.

⚠️ **APFS is case-insensitive by default, unlike ext4**, so a fixture pair differing only in case would
collide; none of the above does. Everything the pass needs is in this folder. *(This checklist lived
in `INDEX.md`'s STATE block until the letter-H3 restructuring moved it here, where the pointers lead.)*
