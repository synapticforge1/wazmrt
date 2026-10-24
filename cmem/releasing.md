# Releasing & Versioning

How wazmrt is versioned. **Set by the owner 2026-08-19**, together with the four review tracks in
[`roadmap.md`](roadmap.md). This file is the authority on the number; `roadmap.md` is the authority on
what earns it.

---

## 🔖 THE VERSION IS `5.0.0` — released 2026-10-24 (`4.0.1`, `4.0.0`, `3.0.0` and `2.0.1` the same day; `2.0.0` and `1.0.4` 2026-10-23; `1.0.3` and `1.0.2` 2026-09-21; Track H was `1.0.1`, 2026-08-19). It was SET to `1.0.0` before the first track, on purpose

> 🔒 **`5.0.0` — owner, 2026-10-24: *"yes and update the project memory files, then bump to 5.0.0
> and push"*.** The fourth major the gate set. **A table initializer (`0x40 0x00 tt e`) needs
> function-references** (binaryang D2 2.2.0's `encodingRules`), and its expression is feature-gated
> like any constant expression (`bd97ae2`; `interop.md` v40, `known-issues.md`). Found by wasmrt
> while mirroring v39: wazmrt accepted it under every configuration, and the D2 matrix had read 0
> only because S1 had no such module. `table-init.wat` joined S1 at 4.0.1's behaviour FIRST
> (`4aa4e15`), so the gate saw the fix as it is: S1 −30 since `4.0.1`, MAJOR. One README Breaking
> Changes row. The D2 matrix on 49 modules is 2,401 / 0 differ against binaryang 2.2.0 and against
> wasmrt 1.0.0; spec conformance is unchanged per file.

> 🔒 **`4.0.1` — owner, 2026-10-24: *"fix the issues"*, then "yes" to pushing and cutting 4.0.1.**
> Two validator defects, found by wasmrt's differential fuzz and re-measured on `4.0.0`
> (`probes/constexpr-elemflags.ts`), where wazmrt alone differed from wasmrt, wasm-tools and
> binaryang (`b919ef2`, `known-issues.md`):
> - a constant expression deeper than 8 operands is no longer REFUSED (a fixed `[8]V` stack);
> - element-segment flags above 7 are now REFUSED as malformed (they decoded as `flags & 7`).
>
> Both turn a wrong verdict into the spec's, so the number is the gate's patch floor (surface +0
> −0, no S1 or `run` line moved) and there is no Breaking Changes row: the modules the second fix
> refuses were never valid. Spec conformance is unchanged per file.
>
> ✅ **Checklist run 2026-10-24 on the release commit `17f9a6d`, every gate:**
> - `test` 834/838 from `D:`, **838/838 from NTFS**; `test-safe` and `test-shipped` 832/836;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `4.0.0`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; `definitions` ✅ (binaryang 2.2.0); size EXACT (exe 1,033,216
>   / lib 1,075,096 / dll 922,624);
> - the gate accepted `4.0.0` → `4.0.1` as meeting the floor (patch);
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 4.0.1 (abi 2)` and runs a WASI
>   module. A depth-9 constant expression is admitted (rc 0); element flags `8` are refused (rc 1).
> - the exe and the dll import only `KERNEL32` and `ntdll`; the old version string is gone from
>   all four places.
>
> Step 9a recorded `4.0.1` as the baselines: only the `released-as` line moved in either file, as a
> patch requires.

> 🔒 **`4.0.0` — owner, 2026-10-24: *"update the project memory files, bump then push"*.** The
> third major the gate set. **Value types follow binaryang D2 2.2.0's `typeRules`** (wasm-tools
> 1.262's rule; owner: "wasm-tools' rule"), read from the definitions copy (`ee71a70`, `701730f`;
> `interop.md` v39). What a consumer can feel, one README Breaking Changes row:
> - the GC types and `exnref` need `reference-types` as well as `gc` / `exceptions`;
> - `(ref func)` / `(ref extern)` need `function-references` even with `gc` on.
>
> The gate set the number: S1 lost exactly 20 accepted pairs since `3.0.0` and gained none, so the
> floor is MAJOR. No `run` line moved, and spec conformance is unchanged per file. wazmrt and
> binaryang 2.2.0 now agree on all 2,352 judgements of `probes/d2-matrix.ts` (22 differed).
>
> ✅ **Checklist run 2026-10-24 on the release commit `cf751c8`, every gate:**
> - `test` 830/834 from `D:`, **834/834 from NTFS**; `test-safe` and `test-shipped` 828/832;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `3.0.0`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; `definitions` ✅ (binaryang 2.2.0); size EXACT (exe 1,033,216
>   / lib 1,074,614 / dll 922,624);
> - the gate accepted `3.0.0` → `4.0.0` as meeting the MAJOR floor;
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 4.0.0 (abi 2)` and runs a WASI
>   module. `(ref any)` is refused under `all,-reference-types` and admitted under `all`. `(ref func)`
>   is refused under `all,-function-references`.
> - the exe and the dll import only `KERNEL32` and `ntdll`; the old version string is gone from
>   all four places.
>
> Step 9a recorded `4.0.0` as the baselines: the surface record lost exactly the 20 pairs, and the
> conformance record changed only its header.

> 🔒 **`3.0.0` — owner, 2026-10-24: *"keep D2's wasm3"*, then *"cut the 3.0.0 after the H23 id
> clash is fixed"*.** The second major the gate set. **`--features` takes binaryang D2's names AND
> meanings** (`interop.md` v37; binaryang 2.1.0's `docs/opcode-guide.md`): every instruction is
> gated by its own D1 feature, held by a test over all 582; D2's names and presets; `requires`
> recorded, not enforced. What a consumer can feel, each a README Breaking Changes row:
> - `wasm3` no longer includes `threads` (D2's release 3.0 has none);
> - `call_ref` is refused with gc on and function-references off;
> - `lime1` no longer accepts an overlong `call_indirect` index;
> - the six wasm-tools-only names are deprecated aliases with a warning, and C ABI values 20–24
>   gate nothing (still valid; `abi_version` unchanged).
>
> The gate set the number: S1 lost exactly two accepted pairs since `2.0.1` (`wasm3` /
> `threads.wat`, `lime1` / `call-indirect-overlong.wasm`) and gained 62, so the floor is MAJOR. No
> `run` line moved, and spec conformance is unchanged per file. Also in it: the CLI-behaviour
> `run` lines in the gate, stage B of H10 (the data tables generated from D1), and the definitions
> pinned to binaryang 2.1.0.
>
> ✅ **Checklist run 2026-10-24 on the release commit `3077634`, every gate:**
> - `test` 830/834 from `D:`, **834/834 from NTFS**; `test-safe` and `test-shipped` 828/832;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `2.0.1`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; `definitions` ✅ (binaryang 2.1.0); size EXACT (exe 1,033,216
>   / lib 1,074,300 / dll 922,624);
> - the gate accepted `2.0.1` → `3.0.0` as meeting the MAJOR floor;
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 3.0.0 (abi 2)` and runs a WASI
>   module. `--features wasm3` refuses `threads.wat` and `wasm3,threads` admits it.
>   `all,-function-references` refuses `call_ref`. `all,-floats` warns once and runs.
> - the exe and the dll import only `KERNEL32` and `ntdll`; the old version string is gone from
>   all four places.
>
> Step 9a recorded `3.0.0` as the baselines. The surface record moved by exactly the measured
> +62 −2 plus its header; the conformance record changed only its header.

> 🔒 **`2.0.1` — owner, 2026-10-24: *"ship 2.0.1"*.** Two CLI fixes, found by running both
> runtimes to refresh the contract's stale wasmrt cells (`interop.md` v35):
> - **§5 #14: a `--pins` DB that cannot be read REFUSES, in every mode.** A missing file was read as
>   "no DB", so a typo in the path ran the module unverified, without a word, unless `--verify
>   enforce`. A fail-open.
> - **§5 #13: `--env` takes only `KEY=VALUE` with a non-empty KEY, and a repeated KEY replaces.**
>   `--env A` and `--env =x` reached the guest as malformed entries; `--env A=1 --env A=2` gave it
>   two. (wazmrt never inherited the host environment; the row's other half is wasmrt's.)
>
> Both refuse command lines `2.0.0` accepted: kind 3/4, breaking. 🔒 **The owner ships them as a
> PATCH, as security fixes** (answered before the fix: "Patch, as a security fix"), the exception
> `1.0.2` and `1.0.3` had, with README Breaking Changes rows. The gate did not need the exception:
> S1 records modules × feature configs, not CLI flags, so the surface is `+0 -0` since `2.0.0` and
> the floor is a patch. 🎓 *That is the gate's blind spot, stated: a CLI behaviour change passes it
> silently, and only the checklist's judgement and this record catch the break.* ✅ **Closed the
> same day by the `run` lines** (owner: "the gate should cover the CLI"), see the gate section.
>
> ✅ **Checklist run 2026-10-24 on the release commit `bb1c13f`, every gate:**
> - `test` 829/833 from `D:`, **833/833 from NTFS**; `test-safe` and `test-shipped` 827/831;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `2.0.0`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; size EXACT (exe 1,032,704 / lib 1,076,076 / dll 923,648);
> - the gate accepted `2.0.0` → `2.0.1` as meeting the floor (patch);
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 2.0.1 (abi 2)`, runs a WASI
>   module, refuses a missing `--pins` DB and `--env A` (rc 1 each) and runs `--env A=1` (rc 0);
>   the exe and the dll import only `KERNEL32` and `ntdll`; the old version string is gone from
>   all four places.
>
> Step 9a recorded `2.0.1` as the baselines. Only the `released-as` line moved in either file, as
> a patch requires.

> 🔒 **`2.0.0` — owner, 2026-10-23: *"2.0.0 is fine"*, then "yes" to cutting it now.** The **first
> MAJOR set by the gate, not by judgement.** It carries one change a consumer can feel: **a 64-bit
> TABLE (`(table i64 …)`) is refused unless `memory64` is enabled**. Until now it was accepted under
> every `--features` list, `-all` and `mvp` included, because only memories were checked for `is64`
> (reported by wasmrt, `known-issues.md`). That refuses what `1.0.4` accepted: kind 4, accepting
> less, breaking even though correct. S1 measured it (29 accepted pairs fewer than `1.0.4`) and
> set the floor at major. The owner took the major, without the patch exception `1.0.2` and `1.0.3`
> had. The README's Breaking Changes row says how to migrate. Nothing else changed in the surface,
> and conformance is unchanged per file (S2).
>
> ✅ **Checklist run 2026-10-23 on the release commit `2b1e24c`, every gate:**
> - `test` 827/831 from `D:`, **831/831 from NTFS**; `test-safe` and `test-shipped` 825/829;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `1.0.4`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; size EXACT (exe 1,032,192 / lib 1,076,076 / dll 923,648);
> - the gate accepted `1.0.4` → `2.0.0` as meeting the MAJOR floor;
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 2.0.0 (abi 2)`, runs a WASI
>   module, and refuses `(table i64 …)` under `all,-memory64` (rc 1); the exe and the dll import
>   only `KERNEL32` and `ntdll`; the old version string is gone from all four places.
>
> Step 9a recorded `2.0.0` as the baselines. The surface record lost exactly the 29 `table64`
> pairs plus its header; the conformance record changed only its header.

> 🔒 **`1.0.4` — owner, 2026-10-23: *"release 1.0.4 and revise Track O and S when we get there."***
> The **first release under SemVer and the compatibility gate** (letter H6). Its number is the
> gate's floor: the public surface, behaviour included (S1), is unchanged since `1.0.3`, so a
> patch. It carries **two wrong-trap fixes**, found when `assert_trap` began checking binaryang's
> D3 trap classes. An out-of-range float→int truncation now traps "integer overflow" (it said
> "invalid conversion to integer", which is for NaN). `ref.get_desc` on a null object now traps
> "null reference" (it said "null descriptor reference"). Both turn wrong output into right
> output, so neither is breaking (kind 4 does not apply), and there is no Breaking Changes row.
> Also: the class-checked `.wast` runner, the generated copy of binaryang's definitions with the
> opcode tables held to it (H10), the compatibility gate with behaviour carried forward (S1, S2;
> S3 local), every committed script on Bun (H15), and the history purged of personal information
> (H19).
>
> ✅ **Checklist run 2026-10-23 on the release commit `7bc9f56`, every gate:**
> - `test` 825/829 from `D:` (the four exFAT symlink skips) and **829/829 from NTFS**;
>   `test-safe` and `test-shipped` 823/827; `test-security` 3/3 (NTFS);
> - conformance 288 / 64,092 / 0 / 0, with the baseline file empty and every `assert_trap`
>   class-checked; **S2 vs `1.0.3`: 288 compared, 0 regressed**;
> - `features` 4/4; `capi-smoke` ✅; size EXACT on all three (exe 1,032,192 / lib 1,075,994 /
>   dll 923,648);
> - the surface gate accepted `1.0.3` → `1.0.4` as a patch, which meets the floor;
> - standalone: the exe in an empty directory with `PATH` cut to the system directories prints
>   `wazmrt 1.0.4 (abi 2)` and runs a WASI module; the exe and the dll import only `KERNEL32` and
>   `ntdll`; the old version string is gone from all four places.
>
> Step 9a recorded `1.0.4` as the baseline of the surface (S1 included) and of the per-file
> conformance (S2). Only the `released-as` line moved in either file, as a patch requires.

> 🔒 **`1.0.3` — owner, 2026-09-21: *"yes release 1.0.3 now."*** It carries **fixes for four defects
> that shipped in `1.0.2`** (a plain `funcref` table refused under `--features mvp`; function locals
> never feature-checked; twenty unassigned `0xFD` sub-opcodes decoded and validated;
> `wazmrt_memory_size_pages` ignoring custom page sizes), plus flat legacy exception handling and
> wasm-tools' whole `--features` vocabulary with its meanings (`interop.md` v30).
> ⚠️ **It also contains rule-4 changes** (accepting less): `--features mvp` now refuses a
> mutable-global export (wasm-tools' `mvp`; `wasm1` admits it), `externref` now needs `gc-types`, and
> the twenty SIMD gaps are refused. *Reading, not a new decision:* the owner's `1.0.2` reason —
> consumers are not involved yet — covers these the same way; it binds no further than it did then.
> ⚠️ **The ladder moves** (also a reading of "release 1.0.3 now", to confirm): `1.0.3` was reserved for
> Track O, so Track O and Track S now take the next numbers.
>
> ✅ **Checklist run 2026-09-21, every gate:** the full gate list was re-run at `25ee73588` the same
> hour — `test` 823/823 (NTFS cwd), `test-safe` and `test-shipped` 817/821 from `D:` (the four exFAT
> skips; the constant gap of 2 is `version_agreement`), `test-security` 3/3 (NTFS), conformance 288 /
> 64,092 / 0 / 0 with the baseline file empty, `features` 4/4, `capi-smoke` ✅ — and after the bump:
> the version test green, grep clean in all four places, size EXACT (`tools/size-ceilings.txt`), exe
> and dll import only `ntdll` + `KERNEL32`, the exe in an empty dir with `PATH` cut to the system dirs
> prints `wazmrt 1.0.3 (abi 2)` and runs a WASI module. 🐧 **Beyond the checklist: 823/823,
> `test-security` 3/3 and `capi-smoke` on native Linux.**

> 🔒 **`1.0.2` CONTAINS TWO CHANGES THIS FILE'S OWN RULE CALLS BREAKING, and it is a patch number on
> purpose (owner, 2026-09-21): *"Since the consumers are not involved yet, keep our cadence and
> release 1.0.2."*** (1) `--dir` now refuses a bare relative host path (`--dir data:/m`), where it
> used to work: "accepting less is breaking" (rule 4 below). (2) The assembler's output changed
> (letter H13), so **every `.wat` pin made by `1.0.1` must be re-made**: under `# mode: enforce`, a
> pinned `.wat` is refused until it is. `.wasm` pins are unaffected. ⚠️ **The reason is SCOPED to
> "consumers not involved yet"**: once `universalWasmLoader-*`, wasmtk or rsxtk consume wazmrt, rule 4
> binds again. Record the decision as said, and do not read it as a relaxation of the rule.
>
> ✅ **Checklist run 2026-09-21, every gate, in order:** track gate (Track B, done 2026-09-20) ·
> `test` 810/814, `test-safe` 808/812, `test-shipped` 808/812, all +6 on baseline with the constant
> gap of 2 accounted (`version_agreement` runs under `test` only) · `test-security` 3/3 from an NTFS
> cwd · conformance 288 / 64,092 / 0 failed / 0 skipped, baseline file empty · `features` 4/4 ·
> size EXACT (exe 1,022,976 / lib 1,072,594 / dll 921,088) · `capi-smoke` ✅ · standalone: exe and
> dll import only `ntdll` + `KERNEL32`, and the exe copied to an empty dir with `PATH` cut to the
> system dirs prints `wazmrt 1.0.2 (abi 2)` and runs a WASI module · four places bumped, grep clean,
> the version test green. 🐧 **Beyond the checklist: 814/814 and `test-security` 3/3 on native Linux.**

> 🗄️ **Lockstep ENDED 2026-10-23** (owner: "officially out of lock step now due to differences";
> gate 11). Kept as it was recorded:
> 🤝 **LOCKSTEP ENGAGES WHEN wasmrt REACHES `1.0.1` (owner, 2026-09-21)**, and from then neither
> runtime releases alone (`interop.md` §1e, gate 11 below). 🔒 **`1.0.2` ships BEFORE that** (owner,
> same day), under the ordinary checklist. ⚠️ *A same-day draft said wazmrt must hold at `1.0.1` so the
> numbers would match. That was an inference, not a decision, and it is withdrawn.*

wazmrt was `0.1.0` from 2026-07-02 until today, which had stopped being true long before it was changed.
What `1.0.0` asserts is **complete on wazmrt's own terms**, and every clause of that is already measured,
not aspirational:

| claim | evidence, as of 2026-08-18 |
| --- | --- |
| every in-scope proposal implemented | Tracks F, P, D, L, A all complete; memory64 was the last unimplemented one, 2026-07-27 |
| conformance at its ceiling | **284 files · 63,934 passed · 0 failed · 0 skipped · 0 unrun**, and the baseline file is **EMPTY** |
| the suite is green | 758/758 unit · `test-safe` 758/758 · `test-security` 3/3 · `features` all four combinations |
| the artifacts are pinned | exe 990,208 · lib 1,053,320 · dll 900,608 — all three EXACT against `tools/size-ceilings.txt` |
| self-owned, zero dependencies | `third_party/` holds no code, `.dependencies` is empty, binaries import only `ntdll`/`KERNEL32` |
| the C ABI is stable | `abi_version() == 2`, header and library pinned together by a test |

🎯 **Why before the tracks and not after them.** A hardening pass, a bug hunt, an optimization review and
a security review are all **reviews of finished code**. Their value comes from the code under them being
done — `design-decisions.md` states the rule directly (*"prove the concept BEFORE hardening"*), and a
review of code that is still moving audits something that will not ship. Numbering these reviews `0.x`
would say the runtime is incomplete when every gate says it is not; numbering them `1.0.x` says exactly
what is happening — **a complete runtime being made harder, smaller, faster and more defensible.**

⚠️ **This is not a claim that nothing is left.** SD-1 and SD-2 are open and holding for upstream, and the
Bake Off is a compare task that can never be "done". Neither is a gap in wazmrt; see `INDEX.md`.

---

## 📐 THE NUMBER — Semantic Versioning 2.0.0, and the GATE sets the floor (owner, 2026-09-20; adopted 2026-10-23, letter H6)

🔒 **Plain SemVer 2.0.0: no digit cap, no carry** (`../../cmem/layout-and-packaging.md` § "Versioning",
binding on every repo). The owner's reason: it pulls the repos together, and it is what every registry
requires.

| release contains | bump | resets |
| --- | --- | --- |
| fixes only, nothing added, nothing broken | `+0.0.1` | — |
| a new capability, backward compatible | `+0.1.0` | patch → 0 |
| anything backward-incompatible (the four kinds below) | `+1.0.0` | minor, patch → 0 |

- **Components are unbounded**: `1.0.9` is followed by `1.0.10` or `1.1.0`, never `2.0.0` unless something
  broke. **The major IS the break signal**; the README's **⚠️ Breaking Changes** table is the migration guide.
- **"Backward compatible" is a gate result, never a judgment** — `zig build surface` (`tools/surface.zig`,
  the next section). It refuses a bump below the floor the surface diff demands.

🗄️ **RETIRED 2026-10-23: the single-digit odometer** (owner, 2026-08-19 → superseded 2026-09-20). It
said every component stops at `9` and rolls into the one on its left (`1.0.9` → `1.1.0`, `1.9.9` → `2.0.0`),
so a major line held exactly 100 releases. The workspace retired every repo's odometer the same day,
because a carry into a new major tells every caret consumer "this broke" when nothing did. Its one
surviving rule — *a breaking change takes the next major immediately* — is SemVer's own.

## 🚦 THE COMPATIBILITY GATE — `zig build surface` (2026-10-23, letter H6)

`tools/surface.zig` (a build-step tool, so Zig: owner, 2026-10-23) generates the PUBLIC SURFACE from
the sources, never by hand:

| kind | read from | one line per |
| --- | --- | --- |
| `c` | `include/wazmrt.h` | prototype, typedef, `#define` (incl. `WAZMRT_ABI_VERSION`); enum MEMBER with its ordinal, since C integers are frozen |
| `zig` | `src/root.zig` | `pub` declaration (signature, not body) |
| `cli` | `wazmrt --help`, run by the build | usage shape, flag definition, subcommand shape (descriptions excluded; `argv[0]` → `wazmrt`) |
| `beh` | `tools/behaviour.zig` over `tests/behaviour/` (S1) | module ACCEPTED under one `--features` config |
| `run` | `tools/cli_behaviour.zig`: the built exe over `tests/cli/cases.txt` (2026-10-24) | command line ACCEPTED, with its exit code (host exit 1–9 = refused = no line) |

🔒 **`run` — the gate covers the CLI's BEHAVIOUR** (owner, 2026-10-24: *"the gate should cover the
CLI"*). `2.0.1` refused `--pins missing.txt` and `--env A`, which `2.0.0` ran, and the gate said
patch: `cli` saw only the help text's syntax. Now each case of `tests/cli/cases.txt` (56 command
lines over the run modes, subcommands, positions, `--env`, `--dir`, the ceilings, `--features` and
verification) is run against the built exe; an accepted one is a line with its exit code, so
accepted → refused or a changed exit code is a MAJOR. ✅ **Inverted by replay:** `v2.0.0` built in
a worktree and run through the corpus differs from `2.0.1` by exactly five lines, all removals or
changes (`--env =x`, `--env A`, `--env A=1 --env A=2`, and the two missing-`--pins` cases), so the
floor would have been major. `2.0.1`'s `released.txt` gained its 34 `run` lines by the BOOTSTRAP
path, honest because `src`, `include` and `build.zig.zon` are unchanged since the `v2.0.1` tag.
🎁 The same corpus run against wasmrt (`cfeee31`) gives identical verdicts on all 56, so it is a
swappability check too.

Two committed snapshots in `tools/surface/`, and three rules:

1. **`current.txt` must equal the sources' surface, or `zig build test` is RED.** An intended change is
   re-baselined **in its own commit with the reason**: `zig build surface -Dsurface=update`.
2. **`released.txt` (`# released-as: X.Y.Z`) is the last release's surface; the diff against it is the
   FLOOR**: anything removed or changed → major, additions only → minor, nothing → patch. Once
   `root.version` moves past `released-as`, a bump below the floor (or one that does not reset the lower
   components) is refused, with the lines that set the floor.
3. **After the release commit, record it**: `zig build surface -Dsurface=release`, its own commit.

✅ **Inverted 2026-10-23** in a throwaway clone (results in the commit that added it): a removed export,
an added export, an appended enum member, two swapped enum members, `WAZMRT_ABI_VERSION` 2 → 3, a
renamed CLI flag, a removed `pub` decl, a non-resetting bump and a backwards version each go red for
their own reason; re-indenting the header and rewording a help description do not.

⚠️ **What the gate CANNOT see, said plainly:**
- **Kind 4, "accepting less"** (below) is behaviour, not surface. Until rule 3 can run, the person
  bumping classifies it against the list below, and the Breaking Changes row is mandatory.
- **A change INSIDE a re-exported Zig module** (`root.zig` re-exports whole files); only the
  declarations in `root.zig` itself are diffed.
- **Parseable output text.** Exit codes are seen for the command lines in `tests/cli/cases.txt`
  (`run`, 2026-10-24), and only for those: a flag or a case the corpus lacks is not watched. What a
  command PRINTS is not recorded; the `interop.md` contract rows carry output text for the runtimes.
- **Rule 3, "the previous tag's tests pass against the new `src/`"**: the tags exist since
  2026-10-23 (`v1.0.1`–`v1.0.3`), but the rule does not apply AS WRITTEN. wazmrt's tests are Zig
  inline `test` blocks INSIDE `src/`, so a tag's tests cannot run against another commit's code.
  The equivalent is **behaviour carried forward from the tag**, SCOPED below. Consumers' suites wait
  for a consumer: none depends on wazmrt yet (the `1.0.2` decision).

### 🔁 Rule 3 as behaviour carried forward — SCOPED 2026-10-23 (owner: "scope the spec-test fixtures carrying forward")

**The idea:** the surface gate diffs what a consumer can NAME; this diffs what a consumer can
RELY ON. At each release, record the released binary's VERDICTS over a fixed corpus; before the
next bump, the new binary's verdicts are diffed against them and the floor rises to match:

| verdict change since the released snapshot | floor |
| --- | --- |
| refused → accepted (accepting more) | minor |
| **accepted → refused (accepting LESS, kind 4)** | **major** |
| ran → different exit code or output | classified by hand: a listed fix, or major |
| no change | patch |

**Measured on real history before proposing it** (a one-time probe, 2026-10-23): the three tags
were rebuilt in throwaway worktrees, and each exe matched its recorded release size to the byte
(`v1.0.2` 1,022,976, `v1.0.3` 1,027,584), so a snapshot can be taken from a tag after the fact.
Every module of wasmtk's corpus (1,189) was then judged under `default` / `mvp` / `wasm1` /
`wasm2`:

- **`v1.0.2` → `v1.0.3`: 1,549 changed verdicts.**
  - 1,522 were refused → accepted, as the new presets and fixes came in.
  - **13 modules (24 rows with their `.wat`) were accepted → refused under `mvp`, every one for
    `mutable_global`**: exactly the rule-4 change `1.0.3` shipped as a patch. The check would
    have caught it, and it flagged nothing unexplained.
  - 3 were an exit code 1 → 3.
- **`v1.0.3` → HEAD: 0 changed verdicts**, consistent with the surface floor (patch). The two trap
  fixes are runtime-only.
- The spec corpus's per-file summaries did not move in either step.

**What the probe also showed, which a design has to answer:**
1. **`wazmrt <module>` RUNS a module that has `_start`** (511 of the corpus's 584 `.wasm`), so a
   "verdict" mixed validation with execution. The exit-1→3 cases were a WASI program
   (`18_DenoExitNonZero`) refused in `v1.0.2` for an unknown preset and RUN in `v1.0.3`, exiting
   3 on purpose. A validation verdict needs a validate-only path.
2. **The corpus is not ours to pin.** wasmtk's modules are 332 MB, and only 160 of the 1,189 are
   tracked in wasmtk's git; the rest are its gitignored build output. Its spec corpus (288
   `.wast`, 77 MB) is fully tracked, so it can be pinned by a wasmtk commit. wazmrt itself
   tracks 10 fixtures.

**The proposed stages** (each its own commit, inverted before trusted):

- **S1: the in-repo snapshot, runnable on any clone.** A build-step tool (Zig, by the owner's
  ruling) links the library and asks decode + validate, never run, under each preset and each
  single feature. The corpus is the minimal per-feature modules that `probes/feature-matrix.ts`
  already generates (one per feature, plus the minimal pairs and per-instruction cases; the matrix
  that found `mvp` ≠ `wasm1`), plus the repo's own fixtures. `tools/behaviour/released.txt` holds
  the snapshot, with `released-as`, beside the surface snapshot. Its floor joins
  `zig build surface`'s (the higher wins), on `zig build test`. Bootstrapped from `v1.0.3` by
  building the tag, and inverted by replaying `v1.0.2` → `v1.0.3`, which must report the
  `mutable_global` refusals.
- **S2: the spec corpus, pinned.** Per-file pass / fail / skip of `wazmrt wast` over wasmtk's
  `testsuite-main` at a recorded wasmtk commit and file-list hash, compared on the intersection
  when either side moves. It needs the sibling checkout, so it is a release-checklist step, not
  part of `test`.
- **S3, optional: wasmtk's module corpus by content hash.** Local only, because it cannot be
  pinned. It is the widest net, and the one that ran today. Run outcomes (exit code, stdout hash)
  for deterministic WASI programs only, with an explicit exclusion list for clocks and randomness.

**Owner calls in this scope — DECIDED 2026-10-23:**
- ✅ **S1 and S2 agreed** (owner: "I agree with S1, and S2"), as COMPLEMENTARY layers, not one
  broader than the other. S1 asks whether a module is ACCEPTED, under every preset and single
  feature, without running it. S2 asks whether code RUNS correctly (the spec scripts, at each
  script's own features). Measured: `1.0.3`'s break was caught by S1 and missed by S2.
- ✅ **S3 agreed for testing** (owner: "I agree with S3 on testing"): local-only, a wide net, not a
  binding gate.
- 🔒 **The stages run IN ORDER and STOP at the first one that finds an issue** (owner: "If S1 runs
  and finds issues we will not run S2 or S3 until those issues are resolved and the same for S2").
  Cheapest and narrowest first, and an S1 change would also perturb S2's and S3's results.
  ⚠️ **"Resolved" includes INTENDED**: an issue that is the correct new behaviour (a refusal like
  `1.0.3`'s) is resolved by a deliberate re-baseline in its own commit, with the major version (or
  the owner's explicit call) and the Breaking Changes row it demands. Otherwise an intended break
  would block the later stages forever.

**✅ S1 BUILT 2026-10-23, on `zig build test`.** The accept verdicts are a FOURTH kind of line in
the surface snapshot, `beh <config> accepts <module>`, ACCEPTED modules only. Accepted → refused
removes a line, which the existing rule already reads as MAJOR; refused → accepted adds one, read
as minor. So the snapshots, the re-baseline commands, the floor and the bump refusal are reused,
not written a second time beside them.

- **How it judges:** `tools/behaviour.zig` (a build step, Zig) links a host-built library and asks
  decode + `validateWith` for each module of `tests/behaviour/` (47, from `feature-matrix.ts`)
  under 32 configs: the 7 presets, plus `-all,<feature>` for each of the 25 features. That is
  1,504 judgements, about 7 s including the build. It never runs anything. The CLI's
  `--features` parser moved into `features.zig` so both judge with ONE parser. The move was proven
  by `feature-matrix.ts` byte-identical on the CLI before and after, and nine malformed lists
  identical in text and exit code.
- **Proven equal to the CLI**, both ways: the tool's 198 accepted pairs equal what the `v1.0.3`
  CLI and HEAD's CLI accept for the same 32 × 47. So `released.txt`'s `beh` lines ARE `v1.0.3`'s
  behaviour, and HEAD has changed none of it (floor: patch).
- **Inverted, both directions:**
  - with `mutable_global` dropped from the `wasm1` preset (1.0.3's break class), the build goes
    red naming the lost pairs; re-baselined, `1.0.4` is refused (major) and `2.0.0` accepted;
  - with `mutable_global` added to `mvp`, `1.0.4` is refused (minor) and `1.1.0` accepted.
- **Known limit:** it sees acceptance, not execution: that is S2's job. The corpus is what
  `feature-matrix.ts` built; widening it is a deliberate re-baseline (`tests/behaviour/README.md`).

**✅ S2 BUILT 2026-10-23, inside the conformance step** (checklist step 4). `tools/conformance.zig`
keeps a RELEASE's per-file results in `tools/conformance-released.txt`: one line per `.wast`,
`<sha256 of its bytes> <passed> <failed> <skipped> <path>`, headed `released-as` and the corpus'
file count and list hash.

- **Pinned by CONTENT, not by a wasmtk commit**, so no `git` is needed and it is stronger: only a
  file whose bytes are the release's is compared. A moved corpus is reported (changed / new /
  gone), and compared on the unchanged files.
- **Compared by default** whenever `-Dtestsuite` is given (`-Dreleased=` empty opts out). A file
  that lost passes, gained failures or gained skips regressed SINCE THE RELEASE, and the step
  fails, saying so. `-Drecord-released=true` records after a release, and refuses to record one
  with failures.
- **The baseline is `v1.0.3`'s, proven:** the record's 288 per-file counts equal what the `v1.0.3`
  binary's own runner reports (288/288, built from the tag), and what HEAD's CLI runner reports.
- **Inverted, six cases:**
  1. clean: 288 compared, 0 regressed;
  2. the truncation fix reverted: `conversions.wast` 618 → 602 passed, the step fails;
  3. recording that as a release: refused, record untouched;
  4. a moved corpus (one edited, one removed): 286 compared, the moves named;
  5. a corpus matching nothing: a FAILURE, never a vacuous pass;
  6. a missing record: a failure.
- **What S2 adds while the expected-failure baseline stays EMPTY is mostly the pinning and the
  record**: a regression here also fails the baseline check (case 2 tripped both). It matters
  once a baseline holds known failures, or when the suite moves. Effort, roughly: S1 is a day's
increment, S2 an afternoon on top of S1, and S3 mostly a list of exclusions.

### The ladder from here

| version | what earns it |
| --- | --- |
| **`1.0.0`** | ✅ set 2026-08-19 — the state in the table above |
| **`1.0.1`** | ✅ **Track H** — hardening (shipped 2026-08-19) |
| **`1.0.2`** | ✅ **Track B** — bug hunt + code hygiene (shipped 2026-09-21, with the `--dir` grammar, the POSIX resolver fix and letter H13) |
| **`1.0.3`** | ✅ **fixes for four `1.0.2` defects + legacy EH + wasm-tools' feature vocabulary** (shipped 2026-09-21, owner: "release 1.0.3 now") — the number Track O had reserved |
| **`1.0.4`** | ✅ **two wrong-trap fixes, the first release under SemVer and the compatibility gate** (shipped 2026-10-23, owner: "release 1.0.4"). Its number is the gate's patch floor |
| **`2.0.0`** | ✅ **a 64-bit table needs `memory64`**: accepting less, so the gate's MAJOR floor, taken by the owner ("2.0.0 is fine", shipped 2026-10-23) |
| next | **Track O** — optimization review. 🔒 **Revised when we get there** (owner, 2026-10-23). The number is whatever `zig build surface`'s floor says: `2.0.1` if Track O changes no surface, `2.1.0` if it adds some |
| after | **Track S** — security review, likewise **revised when we get there**. ⚠️ A tightening it finds is kind 4 (accepting less), so expect a MAJOR unless the owner scopes it otherwise |

### What counts as BREAKING — the only thing that takes the next major

The major bump is reserved for changes an existing consumer cannot absorb without editing code. For
wazmrt that surface is concrete and small; `universalWasmLoader-*`, wasmtk and rsxtk are the consumers.

1. **The C ABI in `include/wazmrt.h`** — a removed or renamed export, a changed signature, a changed
   struct/enum layout, or a changed ownership rule for a handle. ⚠️ **This also bumps `abi_version`**
   (currently `2`), which is a **separate number**: a `2.0.0` library does not imply ABI 2, and the two
   have already diverged — ABI 2 shipped while the library still said `0.1.0`.
2. **The Zig public surface** — `src/root.zig`'s exported decls changing incompatibly.
3. **A CLI contract change** — a removed flag or subcommand, or one whose meaning changes under an
   unchanged spelling. Adding a flag is not breaking.
4. **A behavioural change a consumer could be relying on** — a module wazmrt used to accept and now
   refuses, or a different default feature set. ⚠️ Note the asymmetry: *accepting more* is additive;
   **accepting less is breaking**, even when the refusal is the correct behaviour. Track F's enforcement
   work was exactly this shape, and a tightening found by Track S will be too.

**Not breaking:** a bug fix that turns wrong output into right output, a newly accepted proposal, a new C
export, a size or speed change, or anything visible only in the test suite.

---

## 🔢 WHERE THE NUMBER LIVES — four places, and only a grep keeps them honest

`root.version` is the single source of truth *in code*; the rest are copies that nothing checks.

| place | what it is |
| --- | --- |
| `src/root.zig` | `pub const version: [:0]const u8` — **the one truth**; the C ABI returns `root.version.ptr` |
| `build.zig.zon` | `.version` — the package manifest, a hand-kept copy |
| `include/wazmrt.h` | the `/* e.g. "1.0.1" */` example on `wazmrt_version_string` — cosmetic, but embedders read it |
| `cmem/overview.md` | the tree diagram's `v1.0.1` annotation |

✅ **THREE OF THE FOUR ARE NOW PINNED BY A TEST** (2026-09-20, Track B category 5 —
`src/version_agreement.zig`, its own target on `zig build test`). `root.version` is compared against
**`build.zig.zon`** and **`include/wazmrt.h`**, and the header's `#define WAZMRT_ABI_VERSION` against
`abi_version`. A bump that misses one of them is now a red build.

⬜ **The fourth — `cmem/overview.md`'s tree annotation — is deliberately NOT pinned.** It is project
memory rather than public surface, and reaching into `cmem/` from `src/` would make renaming a memory
document a compile error in the runtime. **So step 9 below still applies to that one**, and the grep
is still the way to find it:

```
grep -rn '<old version>' src include build.zig.zon cmem
```

*(This section used to end "adding a pinning test is a legitimate Track B finding" — it was, and this
is it. ⚠️ The paragraph it replaced said "no test asserts these agree", which stayed true for exactly
as long as nobody acted on the note directly underneath it.)*

---

## ✅ PER-RELEASE CHECKLIST (binding)

Every gate below already exists as a build step; this list adds no machinery, it only says which gates a
version bump requires. ⚠️ **Run from an NTFS cwd with `ZIG_LOCAL_CACHE_DIR` on NTFS** — a `D:` cache is
poisoned after exactly one build, and a `D:` cwd costs 4 unit tests and 2 of the 3 security tests
(`INDEX.md`).

1. **The track's own gate passes**, as written for that track in `roadmap.md`.
2. **`zig build test`, `zig build test-safe` and `zig build test-shipped`** — all three, and **diff the
   OUTPUT counts** against the pre-change baseline. An exit code of 0 does not prove no test was
   dropped. 🆕 **`test-shipped` (added Track H, 2026-08-19) runs the suite under `ReleaseSmall`** — the
   config that is actually distributed, with Zig's safety checks **off**. `test-safe` asks whether any
   input reaches a bad cast or index; `test-shipped` asks whether the **shipped** build behaves the
   same, and a miscompile or optimizer-exposed UB appears there and nowhere else.
3. **`zig build test-security`** — 3/3. A **skip here is a failure**, which is what the NTFS cwd buys.
4. **`zig build conformance -Dtestsuite=… -Dbaseline=…`** — and read **four** numbers: passed, failed,
   skipped, **and the count of files with failures or errors**. 🔒 **The baseline file is EMPTY and stays
   empty.** A line added there to make a release green is the failure mode that file invites.
5. **`zig build features`** — all four `-Dwat`/`-Dwasi` combinations compile.
6. **`zig build size -Doptimize=ReleaseSmall`** — all three ceilings EXACT. A release that moves a byte
   says so, with the reason, in the commit that moves it (`tools/size-ceilings.txt`).
7. **`zig build capi-smoke`** — the ABI-2 symbol and smoke gate.
8. **The shipped binary is STANDALONE** — copy `wazmrt.exe` to an empty directory, run it with a reduced
   `PATH`, and confirm it prints the new version; its imports must be only `ntdll`/`KERNEL32`. ⚠️ Not a
   formality: wasmrt's CLI silently needed a toolchain DLL for weeks while every dev-box test passed.
9. **Bump the four places**, then grep for the old string. 🆕 **Then `zig build surface`** (also part of
   `zig build test`): it must accept the new number against `tools/surface/released.txt`'s floor. A
   refusal is answered by a bigger bump, never by editing a snapshot. If the release breaks anything
   (the four kinds above), add its **⚠️ Breaking Changes** row to `README.md` in the same commit.
9a. 🆕 **After the release commit, in its own commit: `zig build surface -Dsurface=release`** and
   **`zig build conformance -Dtestsuite=… -Dbaseline=… -Drecord-released=true`**, which record the
   released surface (S1 included) and the released per-file conformance results (S2) as the next
   release's baselines. 🔒 **Order (owner): S1 (`surface`, inside `test`) → S2 (step 4) → S3 (the
   local wide net, `probes/carry-forward.ts`). Stop at the first that finds an issue until it is
   resolved; an INTENDED change is resolved by a deliberate re-baseline with the major it demands.**
10. **Sync `cmem/` in the same commit** — `roadmap.md` (track → ✅), `testing.md` (the score), this file's
    ladder, and `open-work.md`'s Status line (the only one — letter H3, 2026-09-21). A doc pass scheduled "after the release" is a doc pass that
    does not happen.
11. 🗄️ **RETIRED 2026-10-23** (owner: *"we are officially out of lock step now due to differences"*;
    `interop.md` v33, §1e). wazmrt releases on its own checklist. The contract stays the shared
    reference, and a coordination pass is still the right move before a change to an in-scope row,
    but it no longer blocks a release. The gate as it stood:
    🤝 **THE LOCKSTEP GATE — once wasmrt reaches `1.0.1`** (owner, 2026-09-21; `interop.md` §1e).
    From that point neither runtime releases alone, and **two things must be true before the bump**:
    the **coordination pass** has run in full (`interop.md` §1b — compare copies, diff every in-scope
    row, **verify by running both on the same bytes**), and the **contract mirror is current**, meaning
    `interop.md` is identical in both trees. ⚠️ **Until wasmrt reaches `1.0.1` this gate is NOT armed**
    — it is listed now so that arming it is a one-line state change rather than a remembered intention.
    🔒 **Before then wazmrt releases on its own:** `1.0.2` ships ahead of wasmrt's `1.0.1` (owner,
    2026-09-21).

## What this project deliberately does NOT have

No `CHANGELOG.md`, no root `ROADMAP.md`, and no publish step — wazmrt is not on a registry and its
consumers build from source. `README.md` is the only public-facing doc and it carries **no version
string** (checked 2026-08-19), which is why it is absent from the four-places table. If wazmrt is ever
published, the release process grows a publish step and this section is where it goes.
