# open-work.md — what is outstanding in wazmrt

**The ONE list of open work, and the only status line** (`../../cmem/memory-conventions.md`: "the
status narrative exists once"). Only open items; each points at its record. Done work leaves this file
and is summarized in [`roadmap.md`](roadmap.md) with its commits.

## 🏁 Status — 2026-09-21

**`1.0.2` is released** (the release commit `f2f890695`; not tagged, not pushed). Six commits since,
unreleased (`git log f2f890695..`; the code is in `ee5157419`, `f00ff6489`, `1f4a83320`), carry
**fixes for three defects that are IN 1.0.2** — `--features mvp` refused a plain
`funcref` table; function locals were never feature-checked; twenty unassigned `0xFD` sub-opcodes
decoded and validated — plus flat legacy exceptions and wasm-tools' whole feature vocabulary.
🔒 **Owner: the next version bump and release commit wait until letter H3 is done** — ✅ it is, as of
the H3 commit; the release is next, pending its number (below). Contract: `interop.md` **v30**; wasmrt's copy is at 10. Every gate green at the last code commit
— the counts are in [`testing.md`](testing.md) and the sizes in `tools/size-ceilings.txt`, one place
each.

## 🗓️ Owner calls

- **The next release's number.** The ladder reserves `1.0.3` for Track O, but the release carries fixes
  for 1.0.2 defects ([`releasing.md`](releasing.md), [`known-issues.md`](known-issues.md)).

## ⏳ Waiting on something outside this repo

- **wasmrt** — mirror `interop.md` v30 (it holds 10); make letter H13's three encoder fixes (`.wat`
  pins agree 64/528 until it does, §3.1); match v30's `--features` vocabulary and semantics, checked
  by running [`probes/feature-matrix.ts`](probes/feature-matrix.ts) on it; its `--dir` help still shows
  the pre-v27 rules. Lockstep engages when wasmrt reaches `1.0.1` (`interop.md` §1e).
- **Letter H10** — generated opcode/feature tables wait on binaryang's H9 schema. Filed for it: wazmrt's
  table has `0xfb 20`–`26` (custom-descriptors), which binaryang lacks.
- **The macOS pass** of the POSIX path fix — when the owner has the machine. Checklist and every probe
  it needs: [`probes/README.md`](probes/README.md) → "Open: the macOS pass".

## 📬 Workspace letters still open for this repo

- **Found by the letter-H3 sweep, not in any drift row:** two `known-issues.md` entries (lines ~1513, ~1556)
  describe limits of `wasm_c_api.zig` — deleted 2026-08-11 — as live ("the C ABI represents a memory64
  memory as 32-bit"). Whether `capi.zig` has the same limits is a CODE question: check, then close or
  retarget each entry.
- **H6** — SemVer 2.0.0 with a compatibility gate on every bump script; the ★ rules block copied into
  `best-practices.md` under a dated stamp; memory layout per `memory-conventions.md`.
- H1, H3, H8, H13 are addressed; each closes in `../../cmem/handoffs.md` when the workspace names the
  commit. (H3: INDEX 192 KB → 10.7 KB, this file and `working-rules.md` created, drift rows Z1–Z6
  closed, one number per place — proven by `probes/h3-check.ts`, which the workspace can re-run.)

## 🛠️ Roadmap items not started

- **wazmrt flags before the module path** (`wazmrt --dir .::/ m.wasm`), the last of the four §2.1
  spellings ([`roadmap.md`](roadmap.md)).
- **Track O** (optimization review, `1.0.3`) and **Track S** (security review, `1.0.4`) — review and
  recommend, not unilateral passes ([`roadmap.md`](roadmap.md)).
- **A self-contained round-trip test** for the emitter — blocked: wazmrt has no disassembler.
- **Four `.wat` files of the wasmtk corpus refused by one side** in the parity probes
  ([`probes/body-parity.ts`](probes/body-parity.ts)) — which side, and why, is unexamined.
- Low-value duplicates of trivial code (`readF32Bits` ≡ `readU32Le` and similar) — left standing on
  purpose ([`roadmap.md`](roadmap.md)).

## 🧊 Holding, not tasks

- **SD-1** (wasmtime emits 222 bytes where five implementations emit 223) and **SD-2** (`path_link`
  ENOTSUP on Windows, upstream Zig) — holding for upstream. ⚠️ Re-test SD-2's reopen condition on every
  Zig upgrade.
- **The Bake Off** — a COMPARE task, scheduled when a number is wanted, never "done".
- Owner decisions, unstarted and not gaps: comptime per-proposal gating (`-Dgc=false` style); the
  `wasm-keys.json` keystore tier.

## ❌ Decided against — do not reopen without the owner

- 🔒 **The 44 opcodes of stack-switching, memory-control and shared-everything-threads** (owner,
  2026-09-21): wasm-tools validates them only with `--features=all`, and wasmtime 48 runs none of them
  even with its switches — "off the table for inclusion" ([`probes/three-proposals.ts`](probes/three-proposals.ts)).
