;; I12: consecutive same-type locals share one (count, type) group; a later i32 after an i64 does
;; NOT rejoin the first run. wasm-tools: locals vector 03 | 02 7f | 01 7e | 01 7f.
(module (func (local i32 i32 i64 i32)))
