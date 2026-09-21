# cmem/probes — measurement scripts kept WITH the memory, not on a machine

🔒 **Owner, 2026-09-21: "scratch pad items should be in the cmem by design and not stored on this
machine."** A session's scratchpad is local to one machine and one session, and it vanishes. A
probe that produced a recorded number belongs next to the number, so the next session (or the next
machine) can re-derive it. **Save probes here as you write them, not afterwards.** Build outputs and
fixture directories are regenerated and are not kept.

All scripts are Deno (`INDEX.md` → TOOLING) or Zig. **Run `--dir` probes through `Deno.Command` or a
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

## ⬜ Open: the macOS pass

`INDEX.md` → STATE → "Still open" has the exact checklist. Everything it needs is in this folder.
⚠️ APFS is case-insensitive by default, so no fixture pair here may differ only by case (none does).
