# tests/behaviour — S1's corpus: one minimal module per feature

The corpus of **S1**, the always-on half of H6's rule 3 as behaviour carried forward
(`cmem/releasing.md` → "Rule 3 as behaviour carried forward"). `tools/behaviour.zig` asks the
library whether each module here is ACCEPTED under every `--features` preset and every single
feature, without running it. The accepted pairs become `beh` lines in the surface snapshot
(`tools/surface/`), so a module that a release accepted and the next refuses is a removed
surface line: a MAJOR by the gate's existing rule.

**Provenance:** generated 2026-10-23 by `cmem/probes/feature-matrix.ts <dir>`, the probe that
measured wasm-tools' feature semantics (one module per feature, the per-instruction checks, the
reference types, the overlong `call_indirect` in binary). It is copied here as DATA, so a clone
judges the same bytes without running the probe.

⚠️ **Changing a file here changes what the gate measures.** Add a module when a new feature or a
new boundary needs watching, then re-baseline (`zig build surface -Dsurface=update`) IN ITS OWN
COMMIT, saying why. Never edit one to make the gate green: a module the release accepted and
the code now refuses is the defect, not the fixture.
