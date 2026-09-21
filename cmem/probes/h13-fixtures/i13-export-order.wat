;; I13: a module-level export written BEFORE a func with an inline export keeps its source position.
;; wasm-tools: export section 02 | 01 "m" 02 00 | 01 "f" 00 00.
(module (memory 1) (export "m" (memory 0)) (func (export "f")))
