# release.md — how a wazmrt release is made, and every release made

🔒 **The ONE place releases are recorded** (owner, 2026-11-10, decision D3; workspace letter H33):
§ "Release History" below, newest first, each version with a summary of what changed. The RULES
(the number, the compatibility gate, the per-release checklist) stay in
[`releasing.md`](releasing.md); this file is the record and the release process's shape.

## The release process against the workspace's uniform shape (U1–U12)

The workspace's `../../cmem/release-process.md` § 5 gives every project twelve slots, in the owner's
order (D1, 2026-11-10): *"the CI to check first, then push the tag, and then create the release
page from the tag, then publish the package to the registry"*. wazmrt's card is § 7 there.
Built 2026-11-12, after the Zig 0.17.1 migration (owner: "Migrate, build CI, then release"):

| slot | wazmrt |
| --- | --- |
| U1 the go and the level | ✅ the owner's, quoted in each record below; `bump.ts` takes the level as an argument, no default |
| U2 merge first; the bump its own commit, by the tooling | ✅ `bun tools/release/bump.ts <patch\|minor\|major>` commits `bump to vX.Y.Z` on `main` |
| U3 the bump tool | ✅ refuses a dirty tree (untracked counted) and any branch but `main`; moves the four places (each edit matching exactly once — `bump.test.ts` holds that against the tree); runs `zig build test`, whose surface gate refuses a level below the floor; restores the files on any failure |
| U4 one guarded release script | ✅ `bun tools/release/push.ts [--dry-run]`: clean tree, on `main`, `origin/main` an ancestor, HEAD the bump commit — exactly the four version edits, ONE level up from a released parent version whose released commit is in its history — the tag absent locally and on origin, the gate green, HEAD and the tree unchanged by it → pushes **the checked commit, by its id, to `main` only** (review round 5), read back with `ls-remote`. No local tag, ever. On Windows every child runs through `tools/release/spawn.ts`, because Bun reads only an exit code's LOW BYTE (round 5, A1) |
| U5 `checks` first, in CI | ✅ `.github/workflows/release.yml` on every push (a branch push is a rehearsal), one gate per step through `tools/release/gate.ts` (a failure publishes its error lines as public annotations): the release self-tests, `test` (surface inside), `test-safe`, `test-shipped`, `test-security`, `features` + `capi-smoke`, spec conformance with S2 (a sparse clone of wasmtk's corpus), `size`, the standalone exe; then "is this a release?" (the BUMP commit, and its version has no tag or a tag on this commit — round 5: any other commit is "no", not a red run). The workflow's structure and every check line are held exactly by `workflow.test.ts` (round 5, A2), and 🔒 **the whole file by its sha256** (owner, round 6: "pin all of it") — an edit to release.yml moves `RELEASE_YML_SHA256` in the same commit, and that commit's review approves it; release.yml must be the only workflow |
| U6 CI tags | ✅ `tag` job (`contents: write` only): an annotated tag on the commit `checks` passed, via the REST API, read back (peels to it); a tag elsewhere is refused, never moved |
| U7 the Release page from the tag (letter H32) | ✅ `release` job: the tag must peel to the checked commit (`POST /releases` would create a missing tag), an existing page is done, `generate_release_notes` with `release.md`'s summary on top, read back. No `gh`. Only new tags get pages (owner, no backfill) |
| U8 publish | n/a — **wazmrt publishes to no registry**; consumers build from source. Reduced to U10 in CI |
| U9 pins | ✅ no `uses:` at all; token-less `git` clones; Zig 0.17.1 and Bun 1.4.4 by version + sha256 (each hash from two sources); `permissions: {}` at the top; per-commit concurrency, never cancelled |
| U10 read back as a user | ✅ `readback` job: a token-less clone of the TAG (must peel to the checked commit), `zig build -Doptimize=small`, `--version` and `hello_wasi.wat`; locally the checklist's standalone step stays |
| U11 record it | ✅ this file |
| U12 failure | ✅ every job is re-run safe (an existing tag or page is "done"); a re-run also FINISHES a half-done release — tag made, page failed (review round 3, A1). Re-run failed jobs; never a new or moved tag for the same code. 🔒 **To retire a Release page, switch it to DRAFT — do not delete it** (owner, 2026-11-13, review round 4, A2, option 2). The page check lists the releases with the job's token, which sees drafts, so a re-run finds the retired page and writes nothing. A page DELETED outright looks like one that failed to publish, and a re-run of that release's run would make it again. **Checks red on the bump commit for a real defect** (not a flake): revert the bump, land the fix, bump again — a fix on top is not a release (`releasing.md` step 10; review round 6). **A re-run after `main` was force-pushed past the bump commit is RED by design** (round 5, C3: the bump check comes first) — the force-push is the anomaly to resolve, not the run |

✅ **Measured on a real release: `5.0.1`, run `43296106417` — `tag`, `release` and `readback`
ran for the first time and each passed in one attempt** (the record is in 5.0.1's entry below).

**Rehearsed on the branch `ci-release` before landing** (workspace best-practices 7.22). Run
`43281313456` failed in the suites with no readable cause (the log needs a sign-in) → each gate
became its own step with public annotations; run `43291978894` then named it: the CLI-behaviour
gate could not spawn a RELATIVE exe path from its case directory — a real defect that every local
run hid, because this machine sets `ZIG_LOCAL_CACHE_DIR` to an absolute path (`known-issues.md`).

---

## Release History

### `5.0.1` — 2026-11-12

Patch (owner). Builds with Zig 0.17.1, which is now the minimum (it was 0.16.0): a consumer building from source on Zig 0.16 must move to 0.17.1. A `(@custom "name" …)` annotation is now the module's only `name` section, as wasm-tools 1.262, wasmrt and binaryang emit. `zig build test` now passes in a fresh clone (the CLI-behaviour gate failed to spawn the runtime unless the Zig cache path was absolute), and the sandbox tests plant their symlinks in the OS temp directory, so they run on any drive. The first wazmrt release made by CI: checks, then the tag, then this page.

> 🔒 **`5.0.1` — owner, 2026-11-12: "release", then "Migrate, build CI, then release" and "Patch
> (5.0.1)".** What it carries since `5.0.0`:
> - **Zig 0.17.1** (`eca1b51`): ten API moves, no behaviour change; every gate equal to 0.16.0's
>   but the sizes, raised for the toolchain (`testing.md` § Zig 0.17.1). `minimum_zig_version`
>   0.16.0 → 0.17.1 — the owner chose a patch knowing a 0.16 consumer cannot build it.
> - **I8** (`852ff84`): `(@custom "name" …)` is the only `name` section (`known-issues.md`); the gate
>   read it as a patch (S1 +0 −0).
> - **The exFAT symlink skips closed** (`46068fa`): test-only.
> - **`zig build test` in a fresh clone** (`c8f5382`): the CLI-behaviour gate resolves the exe
>   before changing directory (`known-issues.md`); found by the CI rehearsal.
> - **Definitions from binaryang 3.0.4** (`b4e7f97`): the version label only; the data is 2.2.0's.
> - **The release CI** (letters H32 / H33): `tools/release/`, `.github/workflows/release.yml`.
>
> ✅ **Released by CI, 2026-11-12: run `43296106417` on the bump commit `e801dc2`, every job green
> in one attempt.** The local side: `bun tools/release/bump.ts patch` (the gate accepted the patch
> floor) made `e801dc2 bump to v5.0.1`; `bun tools/release/push.ts` pushed `main` and nothing else
> (read back). CI then:
> - `checks`: every gate (the release self-tests; `test`, `test-safe`, `test-shipped`,
>   `test-security`; `features` + `capi-smoke`; conformance 288 / 64,092 / 0 / 0 with S2 vs `5.0.0`;
>   size not over any ceiling (🔁 2026-11-13: first written "size EXACT", an inference — the gate
>   also passes "under", the log needs a sign-in, and the `.lib` size follows the cache path, so
>   CI's `.lib` is not EXACT evidence; review round 1, A2); the standalone exe), then "is this a
>   release?" → yes;
> - `tag`: annotated `v5.0.1` by `github-actions[bot]` ("wazmrt 5.0.1"), peeling to `e801dc2`;
> - `release`: the page, by `github-actions[bot]`, published 2026-11-12 20:09:35Z, not a draft;
> - `readback`: a token-less clone of the tag, built `small`, `wazmrt 5.0.1 (abi 2)` and
>   `hello_wasi.wat`.
>
> **Read back 2026-11-13, not from the run's word:** `git ls-remote` gives `v5.0.1^{}` =
> `e801dc2`; the REST API gives the tag object (tagger `github-actions[bot]`) and the page (author
> `github-actions[bot]`, draft false, the body = the summary above + the build line + GitHub's
> `v5.0.0...v5.0.1` link). **As a user**, a clean clone of `v5.0.1` with no `ZIG_LOCAL_CACHE_DIR`:
> `zig build -Doptimize=small` → `wazmrt 5.0.1 (abi 2)`, `hello_wasi.wat` prints "hello from wasi",
> the exe is 1,042,944 bytes (its ceiling, from another directory), and `zig build test` is 842/842
> (the fresh-clone case that failed before `c8f5382`). Step 9a recorded `5.0.1` as the baselines
> (`8cdafc6`): only the `released-as` line moved in either file, as a patch requires.
>
> ⚠️ **No security or hardening review was run for this release.** The workspace made both
> required before every release (letter H35, owner 2026-11-12, recorded here before the bump); the
> letter reached wazmrt the day after the release, so 5.0.1 shipped under the earlier process.
> H35 is open work (`open-work.md`); the next release cannot skip it.

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
