# tests/cli — the CLI's behaviour corpus

The corpus of the gate's **`run`** lines (owner, 2026-10-24: *"the gate should cover the CLI"*).
`tools/cli_behaviour.zig` runs the BUILT `wazmrt` on each line of [`cases.txt`](cases.txt), from
this directory with stdin closed, and records every ACCEPTED command line with its exit code as a
`run` line in the surface snapshot (`tools/surface/`). A refused one (host exit 1–9) records
nothing. So, by the gate's existing rule:

- a command line a release ran and the next refuses is a removed line: a **MAJOR**;
- one it refused and the next runs is an added line: a minor;
- the same command line exiting differently is both: a major.

**Why it exists:** `2.0.1` refused `--pins missing.txt` and `--env A`, which `2.0.0` ran, and the
gate (`cli` = help-text syntax, `beh` = modules) called it a patch. Replaying `v2.0.0` through
this corpus removes exactly those lines.

**The fixtures** exit with **10 + what they observed** (`env.wat`: the variable count; `args.wat`:
argc), so a guest's answer never collides with a host refusal (rc 1). `pins.txt` pins `ok.wat`
and not `mem.wat`; its digest is of the assembled module. `loop.wat` never returns, so every case
that runs it passes a small `--max-iterations`.

**Also a swappability check:** the same corpus run against wasmrt (`cfeee31`, 2026-10-24) gives
identical verdicts on every case.

⚠️ A root-owned pin DB on the machine (`cmem/interop.md` §3.3) changes the verification cases'
verdicts. The recorded lines are for a machine without one.

⚠️ **Changing a file here changes what the gate measures.** Add a case when a flag, a subcommand or
a boundary needs watching, then re-baseline (`zig build surface -Dsurface=update`) IN ITS OWN
COMMIT, saying why. Never edit a case to make the gate green.
