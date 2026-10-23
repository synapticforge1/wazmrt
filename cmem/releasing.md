# Releasing & Versioning

How wazmrt is versioned. **Set by the owner 2026-08-19**, together with the four review tracks in
[`roadmap.md`](roadmap.md). This file is the authority on the number; `roadmap.md` is the authority on
what earns it.

---

## 🔖 THE VERSION IS `1.0.3` — released 2026-09-21 (`1.0.2` the same day; Track H was `1.0.1`, 2026-08-19). It was SET to `1.0.0` before the first track, on purpose

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
- **Exit codes and parseable output** beyond `--help`'s syntax lines; the `interop.md` contract rows
  carry those for the runtimes.
- **Rule 3, "the previous tag's tests pass against the new `src/`"**, needs a TAG, and wazmrt has none
  (tagging `1.0.2` / `1.0.3` is an open owner call, `open-work.md`). Consumers' suites likewise wait for
  a consumer: none depends on wazmrt yet (the `1.0.2` decision).

### The ladder from here

| version | what earns it |
| --- | --- |
| **`1.0.0`** | ✅ set 2026-08-19 — the state in the table above |
| **`1.0.1`** | ✅ **Track H** — hardening (shipped 2026-08-19) |
| **`1.0.2`** | ✅ **Track B** — bug hunt + code hygiene (shipped 2026-09-21, with the `--dir` grammar, the POSIX resolver fix and letter H13) |
| **`1.0.3`** | ✅ **fixes for four `1.0.2` defects + legacy EH + wasm-tools' feature vocabulary** (shipped 2026-09-21, owner: "release 1.0.3 now") — the number Track O had reserved |
| next | **Track O** — optimization review *(was `1.0.4` on the old ladder, itself moved down one by `1.0.3` — a reading, to confirm)*. Under SemVer the number is whatever `zig build surface`'s floor says: `1.0.4` if Track O changes no surface, `1.1.0` if it adds some |
| after | **Track S** — security review *(likewise)*. ⚠️ A tightening it finds is kind 4 (accepting less), so expect a MAJOR unless the owner scopes it otherwise |

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
9a. 🆕 **After the release commit, in its own commit: `zig build surface -Dsurface=release`**, which
   records the released surface as the next floor's baseline.
10. **Sync `cmem/` in the same commit** — `roadmap.md` (track → ✅), `testing.md` (the score), this file's
    ladder, and `open-work.md`'s Status line (the only one — letter H3, 2026-09-21). A doc pass scheduled "after the release" is a doc pass that
    does not happen.
11. 🆕 🤝 **THE LOCKSTEP GATE — once wasmrt reaches `1.0.1`** (owner, 2026-09-21; `interop.md` §1e).
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
