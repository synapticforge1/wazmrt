;; Workspace letter H13 / divergence I14 — the minimal module that separates the two interning
;; orders. Every type here is implicit (never declared), so its index is decided by the ORDER in
;; which the assembler meets it:
;;
;;   function by function (sig, then that body's block types, then the next function):
;;     0 (func (param i32))   1 (func (result i32 i64))   2 (func (param f32))
;;   every signature first, block types after:
;;     0 (func (param i32))   1 (func (param f32))        2 (func (result i32 i64))
;;
;; Run: deno run -A type-order.ts <wazmrt.exe> i14-interleave.wat <out dir>
(module
  (func (param i32)
    (block (result i32 i64) (i32.const 1) (i64.const 2))
    drop
    drop)
  (func (param f32)))
