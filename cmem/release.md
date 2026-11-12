# release.md — how a wazmrt release is made, and every release made

🔒 **The ONE place releases are recorded** (owner, 2026-11-10, decision D3; workspace letter H33):
§ "Release History" below, newest first, each version with a summary of what changed. The RULES
(the number, the compatibility gate, the per-release checklist) stay in
[`releasing.md`](releasing.md); this file is the record and the release process's shape.

## The release process against the workspace's uniform shape (U1–U12)

The workspace's `../../cmem/release-process.md` § 5 gives every project twelve slots, in the owner's
order (D1, 2026-11-10): *"the CI to check first, then push the tag, and then create the release
page from the tag, then publish the package to the registry"*. wazmrt's card is § 7 there.
Measured here 2026-11-12, at `origin/main`:

| slot | wazmrt today | to converge |
| --- | --- | --- |
| U1 the go and the level | ✅ the owner's, quoted in each record below | — |
| U2 merge first; the bump its own commit, by the tooling | ❌ the bump is four hand edits (`releasing.md` → WHERE THE NUMBER LIVES) | a bump tool makes the commit |
| U3 the bump tool | ⚠️ the floor exists — `zig build surface` (S1–S3) refuses a lower level — but no tool syncs the four places or refuses a dirty tree | a Bun bump tool: clean tree (untracked counted), surface floor, the four version lines |
| U4 one guarded release script | ❌ none; the tag was made by hand | a Bun script that pushes `main` only and reads it back with `git ls-remote`; **no local tag, ever** |
| U5 `checks` first, in CI | ❌ no CI | a workflow on the pushed `main`: `test`, `test-safe`, `test-shipped`, `test-security`, `features`, `capi-smoke`, `size`, `surface` in release mode |
| U6 CI tags | ❌ | after a green U5, for a new version only |
| U7 the Release page from the tag (letter H32) | ❌ 10 tags, 0 pages | REST API from a Bun step with `GITHUB_TOKEN`, no `gh` (rule 9); only new tags get pages (owner, no backfill) |
| U8 publish | n/a — **wazmrt publishes to no registry**; consumers build from source | U8 reduces to U10's read-back done in CI |
| U9 pins | n/a until a workflow exists | actions by commit hash, Zig and Bun 1.4.4 by version + sha256, per-tag never-cancelled concurrency |
| U10 read back as a user | ⚠️ the checklist's standalone step: the exe in an empty directory, `PATH` cut, prints its version and runs a WASI module | the same, from a clean clone of the tag |
| U11 record it | ✅ this file (2026-11-12) | — |
| U12 failure | adopted: re-run failed jobs; never a new or moved tag for the same code | — |

🗓️ **When (owner, 2026-11-12): U2–U9 are built right AFTER the Zig 0.17.1 migration**, so the CI's
toolchain pin is set once, on the version the project then targets (`open-work.md`). No release
is cut before that lands and is rehearsed (workspace best-practices 7.22: a changed release job is
rehearsed before it lands, and lands before a release, never during one).

---

## Release History

### `5.0.0` — 2026-10-24

MAJOR (gate: S1 −30). A table initializer needs function-references and its expression is feature-gated; found by wasmrt.

> 🔒 **`5.0.0` — owner, 2026-10-24: *"yes and update the project memory files, then bump to 5.0.0
> and push"*.** The fourth major the gate set. **A table initializer (`0x40 0x00 tt e`) needs
> function-references** (binaryang D2 2.2.0's `encodingRules`), and its expression is feature-gated
> like any constant expression (`bd97ae2`; `interop.md` v40, `known-issues.md`). Found by wasmrt
> while mirroring v39: wazmrt accepted it under every configuration, and the D2 matrix had read 0
> only because S1 had no such module. `table-init.wat` joined S1 at 4.0.1's behaviour FIRST
> (`4aa4e15`), so the gate saw the fix as it is: S1 −30 since `4.0.1`, MAJOR. One README Breaking
> Changes row. The D2 matrix on 49 modules is 2,401 / 0 differ against binaryang 2.2.0 and against
> wasmrt 1.0.0; spec conformance is unchanged per file.
>
> ✅ **Checklist run 2026-10-24 on the release commit `70b4bd4`, every gate:**
> - `test` 836/840 from `D:`, **840/840 from NTFS**; `test-safe` and `test-shipped` 834/838;
>   `test-security` 3/3;
> - conformance 288 / 64,092 / 0 / 0, class-checked; S2 vs `4.0.1`: 288 compared, 0 regressed;
> - `features` 4/4; `capi-smoke` ✅; `definitions` ✅ (binaryang 2.2.0); size EXACT (exe 1,033,728
>   / lib 1,075,298 / dll 922,624);
> - the gate accepted `4.0.1` → `5.0.0` as meeting the MAJOR floor;
> - standalone, `PATH` cut to the system dirs: prints `wazmrt 5.0.0 (abi 2)` and runs a WASI
>   module. A table initializer is refused under `wasm2` (rc 1) and admitted under `wasm3` (rc 0).
> - the exe and the dll import only `KERNEL32` and `ntdll`; the old version string is gone from
>   all four places.
>
> Step 9a recorded `5.0.0` as the baselines: the surface record lost exactly the 30 pairs, and the
> conformance record changed only its header.

### `4.0.1` — 2026-10-24

Patch. Two validator fixes from wasmrt's fuzz: constant expressions deeper than 8 operands accepted; element flags above 7 refused.

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

### `4.0.0` — 2026-10-24

MAJOR (gate: S1 −20). Value types follow binaryang D2 2.2.0's `typeRules`.

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

### `3.0.0` — 2026-10-24

MAJOR (gate: S1 −2). `--features` takes binaryang D2's names and meanings; per-instruction gating from D1.

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

### `2.0.1` — 2026-10-24

Patch, as security fixes (owner). An unreadable `--pins` DB refuses; `--env` takes only well-formed `KEY=VALUE`.

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

### `2.0.0` — 2026-10-23

MAJOR (gate: S1 −29), the first the gate set. A 64-bit table needs `memory64`.

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

### `1.0.4` — 2026-10-23

Patch, the first release under SemVer and the gate. Two wrong-trap fixes; class-checked `assert_trap`; H10 definitions; scripts on Bun.

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

### `1.0.3` — 2026-09-21

Fixes for four `1.0.2` defects; flat legacy exception handling; wasm-tools' `--features` vocabulary (rule-4 changes shipped as a patch).

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

### `1.0.2` — 2026-09-21

Track B plus the day's work; `--dir` refuses a bare relative host path and `.wat` pins change (patch by the owner's call).

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

### `1.0.1` — 2026-08-19

Track H; the first `1.x`, set by commit `9acdcb4` (`0.1.0` went straight to `1.0.1`; no commit ever
carried `1.0.0`, so there is no `v1.0.0` tag). Why the number moved to `1.x` before the review
tracks, and the evidence it rested on (conformance 284 / 63,934 / 0 / 0, 758/758 unit, sizes
EXACT, zero dependencies, C ABI 2): `releasing.md` § THE VERSION IS. Tagged `v1.0.1` on
2026-10-23 at the owner's word.

*(Moved here 2026-11-12 from `releasing.md`; the blocks above are verbatim. "Rule 4 below" and
"this file's own rule" in them mean `releasing.md`'s rules.)*
